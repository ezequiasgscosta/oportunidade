import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AppButton, Banner, Field, SectionTitle } from "../components";
import { audioBucket, supabaseConfigurationError, trackCategories } from "../lib/supabase";
import type { AdminMember, DashboardStats, SiteSuggestion, SiteVisitStat, Track, TrackFilter, TrackStatus } from "../lib/types";
import { colors } from "../theme";
import { TrackAudio } from "./HomeScreen";

type Props = {
  supabase: SupabaseClient | null;
  user: User | null;
  isAdmin: boolean;
  roleLoading: boolean;
  roleError: string;
  onHome: () => void;
};

const emptyStats: DashboardStats = {
  total_users: 0,
  total_tracks: 0,
  approved_tracks: 0,
  pending_tracks: 0,
  rejected_tracks: 0,
};

const filterLabels: Record<TrackFilter, string> = {
  pending: "Pendentes",
  approved: "Aprovadas",
  rejected: "Recusadas",
  all: "Todas",
};

function statusLabel(status: TrackStatus) {
  if (status === "approved") return "Aprovada";
  if (status === "rejected") return "Recusada";
  return "Pendente";
}

export default function AdminScreen({ supabase, user, isAdmin, roleLoading, roleError, onHome }: Props) {
  const [stats, setStats] = useState(emptyStats);
  const [siteVisits, setSiteVisits] = useState<SiteVisitStat[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [suggestions, setSuggestions] = useState<SiteSuggestion[]>([]);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [filter, setFilter] = useState<TrackFilter>("pending");
  const [activeTrack, setActiveTrack] = useState("");
  const [activeSuggestion, setActiveSuggestion] = useState("");
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editCategory, setEditCategory] = useState<string>(trackCategories[0]);
  const [editLocation, setEditLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);

  const visibleTracks = useMemo(
    () => tracks.filter((track) => filter === "all" || track.status === filter),
    [filter, tracks],
  );
  const newSuggestions = suggestions.filter((suggestion) => suggestion.status === "new").length;
  const periodUniqueVisitors = siteVisits[0]?.period_unique_visitors ?? 0;
  const maxDailyVisitors = Math.max(1, ...siteVisits.map((day) => day.unique_visitors));

  useEffect(() => {
    let active = true;
    async function refreshDashboard() {
      if (!supabase || !user || !isAdmin) return;
      try {
        const [statsResult, adminsResult, tracksResult, suggestionsResult, visitsResult] = await Promise.all([
          supabase.rpc("admin_dashboard_stats"),
          supabase.rpc("admin_list_admins"),
          supabase.from("tracks").select("*").order("created_at", { ascending: false }),
          supabase.from("site_suggestions").select("*").order("created_at", { ascending: false }),
          supabase.rpc("admin_site_visit_stats"),
        ]);
        if (!active) return;

        setError("");
        const failedResult = [statsResult, adminsResult, tracksResult, suggestionsResult, visitsResult]
          .find((result) => result.error);
        if (failedResult?.error) {
          console.error("Falha ao carregar o painel administrativo.", failedResult.error);
          setError("Não foi possível carregar o painel. Aplique as migrations do Supabase e tente novamente.");
          setLoading(false);
          return;
        }

        const nextTracks = (tracksResult.data ?? []) as Track[];
        setStats((statsResult.data?.[0] as DashboardStats | undefined) ?? emptyStats);
        setAdmins((adminsResult.data ?? []) as AdminMember[]);
        setTracks(nextTracks);
        setSuggestions((suggestionsResult.data ?? []) as SiteSuggestion[]);
        setSiteVisits((visitsResult.data ?? []) as SiteVisitStat[]);
        const urls = await Promise.all(nextTracks.map(async (track) => {
          const { data, error: signedUrlError } = await supabase.storage
            .from(audioBucket)
            .createSignedUrl(track.audio_path, 60 * 60 * 24);
          if (signedUrlError) {
            console.error(`Não foi possível carregar o áudio da faixa ${track.id}.`, signedUrlError);
            return [track.id, ""] as const;
          }
          return [track.id, data.signedUrl] as const;
        }));
        if (!active) return;
        setAudioUrls(Object.fromEntries(urls.filter((entry) => entry[1])));
        setLoading(false);
      } catch (error) {
        if (!active) return;
        console.error("Falha inesperada ao carregar o painel.", error);
        setError("Não foi possível carregar o painel. Verifique sua conexão e tente novamente.");
        setLoading(false);
      }
    }

    void refreshDashboard();
    return () => {
      active = false;
    };
  }, [isAdmin, refreshIndex, supabase, user]);

  async function handleLogin() {
    if (!supabase) {
      setAuthError(supabaseConfigurationError);
      return;
    }
    setAuthError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (loginError) setAuthError("Não foi possível entrar. Confira seu email e senha.");
  }

  async function handleLogout() {
    if (!supabase) return;
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) setError("Não foi possível sair da conta. Tente novamente.");
  }

  function startEditingTrack(track: Track) {
    setEditingTrack(track);
    setEditTitle(track.title);
    setEditArtist(track.artist);
    setEditCategory(track.category);
    setEditLocation(track.location || "");
    setError("");
    setNotice("");
  }

  async function updateTrack(track: Track, status: TrackStatus) {
    if (!supabase) return;
    setActiveTrack(track.id);
    setError("");
    setNotice("");
    const { error: updateError } = await supabase.from("tracks").update({ status }).eq("id", track.id);
    if (updateError) {
      console.error("Falha ao moderar faixa.", updateError);
      setError("Não foi possível atualizar a faixa.");
    } else {
      setNotice(`“${track.title}” foi ${status === "approved" ? "aprovada" : "recusada"}.`);
      setRefreshIndex((index) => index + 1);
    }
    setActiveTrack("");
  }

  async function saveTrackEdits() {
    if (!supabase || !editingTrack) return;
    const nextTitle = editTitle.trim();
    const nextArtist = editArtist.trim();
    if (!nextTitle || !nextArtist) {
      setError("Informe o nome da música e do artista.");
      return;
    }

    setActiveTrack(editingTrack.id);
    setError("");
    const { error: updateError } = await supabase.from("tracks").update({
      title: nextTitle,
      artist: nextArtist,
      category: editCategory,
      location: editLocation.trim() || "Desconhecido",
    }).eq("id", editingTrack.id);
    if (updateError) {
      console.error("Falha ao salvar alterações da faixa.", updateError);
      setError("Não foi possível salvar as alterações da música.");
    } else {
      setNotice(`“${nextTitle}” foi atualizada.`);
      setEditingTrack(null);
      setRefreshIndex((index) => index + 1);
    }
    setActiveTrack("");
  }

  function confirmDeleteTrack(track: Track) {
    Alert.alert("Excluir música", `Excluir “${track.title}” permanentemente?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void deleteTrack(track) },
    ]);
  }

  async function deleteTrack(track: Track) {
    if (!supabase) return;
    setActiveTrack(track.id);
    setError("");
    const { error: deleteError } = await supabase.from("tracks").delete().eq("id", track.id);
    if (deleteError) {
      console.error("Falha ao excluir faixa.", deleteError);
      setError("Não foi possível excluir a faixa.");
    } else {
      const { error: storageError } = await supabase.storage.from(audioBucket).remove([track.audio_path]);
      setNotice(storageError ? "Faixa excluída; o arquivo de áudio não pôde ser removido." : "Faixa excluída.");
      if (storageError) console.error("Falha ao remover arquivo de áudio da faixa excluída.", storageError);
      setRefreshIndex((index) => index + 1);
    }
    setActiveTrack("");
  }

  async function updateSuggestion(suggestion: SiteSuggestion) {
    if (!supabase) return;
    const nextStatus = suggestion.status === "new" ? "reviewed" : "new";
    setActiveSuggestion(suggestion.id);
    setError("");
    setNotice("");
    const { error: updateError } = await supabase.from("site_suggestions")
      .update({ status: nextStatus })
      .eq("id", suggestion.id);
    if (updateError) {
      console.error("Falha ao atualizar sugestão.", updateError);
      setError("Não foi possível atualizar o status da sugestão.");
    } else {
      setNotice(nextStatus === "reviewed" ? "Sugestão marcada como revisada." : "Sugestão reaberta.");
      setRefreshIndex((index) => index + 1);
    }
    setActiveSuggestion("");
  }

  function confirmDeleteSuggestion(suggestion: SiteSuggestion) {
    Alert.alert("Apagar sugestão", `Apagar “${suggestion.title}”? Esta ação não pode ser desfeita.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => void deleteSuggestion(suggestion) },
    ]);
  }

  async function deleteSuggestion(suggestion: SiteSuggestion) {
    if (!supabase) return;
    setActiveSuggestion(suggestion.id);
    setError("");
    const { data, error: deleteError } = await supabase.from("site_suggestions")
      .delete()
      .eq("id", suggestion.id)
      .select("id");
    if (deleteError || !data?.length) {
      if (deleteError) console.error("Falha ao excluir sugestão.", deleteError);
      setError("Não foi possível apagar a sugestão. Confira a migration e as permissões de administrador.");
    } else {
      setNotice("Sugestão apagada.");
      setRefreshIndex((index) => index + 1);
    }
    setActiveSuggestion("");
  }

  function confirmDeleteAllSuggestions() {
    if (!suggestions.length) return;
    Alert.alert("Apagar todas as sugestões", `Apagar todas as ${suggestions.length} sugestões? Esta ação não pode ser desfeita.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar todas", style: "destructive", onPress: () => void deleteAllSuggestions() },
    ]);
  }

  async function deleteAllSuggestions() {
    if (!supabase || suggestions.length === 0) return;
    setActiveSuggestion("all");
    setError("");
    const ids = suggestions.map((suggestion) => suggestion.id);
    const { data, error: deleteError } = await supabase.from("site_suggestions")
      .delete()
      .in("id", ids)
      .select("id");
    if (deleteError || !data?.length) {
      if (deleteError) console.error("Falha ao apagar todas as sugestões.", deleteError);
      setError("Não foi possível apagar as sugestões. Confira as migrations e as permissões.");
    } else {
      setNotice(`${data.length} de ${ids.length} sugestões apagadas.`);
      setRefreshIndex((index) => index + 1);
    }
    setActiveSuggestion("");
  }

  async function addAdmin() {
    if (!supabase) return;
    setSavingAdmin(true);
    setError("");
    setNotice("");
    const { error: addError } = await supabase.rpc("admin_set_role", {
      p_email: newAdminEmail.trim(),
      p_is_admin: true,
    });
    if (addError) {
      console.error("Falha ao adicionar administrador.", addError);
      setError(addError.message.includes("No user exists")
        ? "Esse email ainda não tem uma conta. Peça para a pessoa criar a conta antes."
        : "Não foi possível adicionar esse administrador.");
    } else {
      setNewAdminEmail("");
      setNotice("Administrador adicionado.");
      setRefreshIndex((index) => index + 1);
    }
    setSavingAdmin(false);
  }

  function confirmRemoveAdmin(admin: AdminMember) {
    if (!admin.email) return;
    Alert.alert("Remover administrador", `Remover o acesso de ${admin.email}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => void removeAdmin(admin) },
    ]);
  }

  async function removeAdmin(admin: AdminMember) {
    if (!supabase || !admin.email) return;
    setSavingAdmin(true);
    setError("");
    setNotice("");
    const { error: removeError } = await supabase.rpc("admin_set_role", {
      p_email: admin.email,
      p_is_admin: false,
    });
    if (removeError) {
      console.error("Falha ao remover administrador.", removeError);
      setError(removeError.message.includes("last administrator")
        ? "Não é possível remover o último administrador."
        : "Não foi possível remover esse administrador.");
    } else {
      setNotice("Acesso administrativo removido.");
      setRefreshIndex((index) => index + 1);
    }
    setSavingAdmin(false);
  }

  if (!supabase) {
    return <GateScreen onHome={onHome} title="Configuração necessária" description={supabaseConfigurationError} />;
  }
  if (roleLoading) {
    return <GateScreen onHome={onHome} title="Verificando acesso" description="Aguarde enquanto confirmamos sua sessão." loading />;
  }
  if (!user) {
    return (
      <GateScreen onHome={onHome} title="Administração" description="Entre com uma conta que tenha acesso administrativo.">
        <View style={styles.form}>
          <Field autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={setEmail} placeholder="admin@email.com" value={email} />
          <Field label="Senha" onChangeText={setPassword} placeholder="Sua senha" secureTextEntry value={password} />
          {authError ? <Banner>{authError}</Banner> : null}
          <AppButton label="Entrar" onPress={() => void handleLogin()} />
        </View>
      </GateScreen>
    );
  }
  if (!isAdmin) {
    return (
      <GateScreen onHome={onHome} title="Sem permissão" description={roleError || "Esta conta não tem acesso ao painel administrativo."}>
        <AppButton label="Sair da conta" onPress={() => void handleLogout()} variant="secondary" />
      </GateScreen>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Text style={styles.brand}>♫  Administração</Text>
          <Text style={styles.headerCaption}>{user.email}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={onHome}><Text style={styles.headerLink}>Feed</Text></Pressable>
          <Pressable onPress={() => void handleLogout()}><Text style={styles.headerLink}>Sair</Text></Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>●  PAINEL DE CONTROLE</Text>
        <Text style={styles.pageTitle}>Administração</Text>
        <Text style={styles.pageDescription}>Visão geral da comunidade, moderação e acessos.</Text>
        {error ? <Banner>{error}</Banner> : null}
        {notice ? <Banner variant="success">{notice}</Banner> : null}

        <View style={styles.statsGrid}>
          <StatCard label="USUÁRIOS" value={stats.total_users} caption="contas cadastradas" />
          <StatCard label="MÚSICAS" value={stats.total_tracks} caption="envios no sistema" />
          <StatCard label="PENDENTES" value={stats.pending_tracks} caption="aguardando revisão" />
          <StatCard label="APROVADAS" value={stats.approved_tracks} caption="publicadas no feed" />
          <StatCard label="RECUSADAS" value={stats.rejected_tracks} caption="não publicadas" />
          <StatCard label="VISITANTES" value={periodUniqueVisitors} caption="únicos em 30 dias" />
        </View>
        <Text style={styles.smallNote}>Visitantes únicos nos últimos 30 dias · {periodUniqueVisitors} no período</Text>

        <View style={styles.panel}>
          <SectionTitle title="Visitantes únicos" note="MOVIMENTO DOS ÚLTIMOS 30 DIAS" />
          {loading ? <ActivityIndicator color={colors.primary} style={styles.panelLoading} /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chart}>
                {siteVisits.map((day) => (
                  <View key={day.visit_date} style={styles.chartColumn}>
                    <Text style={styles.chartValue}>{day.unique_visitors || ""}</Text>
                    <View style={[styles.chartBar, { height: Math.max(4, (day.unique_visitors / maxDailyVisitors) * 80) }]} />
                    <Text style={styles.chartDate}>{new Date(`${day.visit_date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit" })}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <View style={styles.panel}>
          <SectionTitle title="Moderação de músicas" count={stats.pending_tracks} note="APROVE, RECUSE OU EDITE" />
          <ScrollView horizontal contentContainerStyle={styles.filterList} showsHorizontalScrollIndicator={false}>
            {(["pending", "approved", "rejected", "all"] as TrackFilter[]).map((item) => (
              <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>{filterLabels[item]}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {loading ? <ActivityIndicator color={colors.primary} style={styles.panelLoading} /> : visibleTracks.length ? (
            <View style={styles.list}>
              {visibleTracks.map((track) => (
                <View key={track.id} style={styles.trackCard}>
                  <Text style={styles.trackTitle}>{track.title}</Text>
                  <Text style={styles.trackDescription}>{track.artist} · {track.category} · {track.location || "Desconhecido"}</Text>
                  {audioUrls[track.id] ? <TrackAudio title={track.title} url={audioUrls[track.id]} /> : null}
                  <Text style={[styles.status, track.status === "approved" && styles.statusApproved, track.status === "rejected" && styles.statusRejected]}>
                    {statusLabel(track.status)}
                  </Text>
                  <View style={styles.rowActions}>
                    <AppButton label="Editar" onPress={() => startEditingTrack(track)} variant="secondary" />
                    {track.status !== "approved" ? <AppButton disabled={activeTrack === track.id} label="Aprovar" onPress={() => void updateTrack(track, "approved")} /> : null}
                    {track.status === "pending" ? <AppButton disabled={activeTrack === track.id} label="Recusar" onPress={() => void updateTrack(track, "rejected")} variant="danger" /> : null}
                    <AppButton disabled={activeTrack === track.id} label="Excluir" onPress={() => confirmDeleteTrack(track)} variant="danger" />
                  </View>
                </View>
              ))}
            </View>
          ) : <Text style={styles.emptyText}>Nenhuma música {filter === "all" ? "cadastrada" : filterLabels[filter].toLowerCase()}.</Text>}
        </View>

        <View style={styles.panel}>
          <SectionTitle title="Administradores" count={admins.length} note="GERENCIE QUEM PODE ACESSAR O PAINEL" />
          <View style={styles.form}>
            <Field autoCapitalize="none" keyboardType="email-address" label="Adicionar administrador" onChangeText={setNewAdminEmail} placeholder="email da conta já cadastrada" value={newAdminEmail} />
            <Text style={styles.smallNote}>A pessoa precisa criar uma conta antes de receber acesso administrativo.</Text>
            <AppButton disabled={!newAdminEmail.trim()} label="Adicionar administrador" loading={savingAdmin} onPress={() => void addAdmin()} />
          </View>
          <View style={styles.list}>
            {admins.map((admin) => (
              <View key={admin.user_id} style={styles.memberRow}>
                <View style={styles.memberInfo}>
                  <Text style={styles.trackTitle}>{admin.email ?? "Email indisponível"}</Text>
                  <Text style={styles.trackDescription}>
                    Admin desde {new Date(admin.created_at).toLocaleDateString("pt-BR")}{admin.user_id === user.id ? " · Você" : ""}
                  </Text>
                </View>
                <AppButton
                  disabled={savingAdmin || admins.length === 1 || !admin.email}
                  label="Remover"
                  onPress={() => confirmRemoveAdmin(admin)}
                  variant="danger"
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <SectionTitle title="Sugestões de melhorias" count={newSuggestions} note={`${newSuggestions} NOVAS`} />
          {suggestions.length ? (
            <View style={styles.list}>
              {suggestions.map((suggestion) => (
                <View key={suggestion.id} style={styles.suggestionCard}>
                  <View style={styles.suggestionHeading}>
                    <Text style={styles.trackTitle}>{suggestion.title}</Text>
                    <Text style={[styles.status, suggestion.status === "reviewed" && styles.statusReviewed]}>
                      {suggestion.status === "new" ? "Nova" : "Revisada"}
                    </Text>
                  </View>
                  <Text style={styles.trackDescription}>{suggestion.message}</Text>
                  <Text style={styles.smallNote}>{new Date(suggestion.created_at).toLocaleString("pt-BR")}</Text>
                  <View style={styles.rowActions}>
                    <AppButton
                      disabled={activeSuggestion === suggestion.id}
                      label={suggestion.status === "new" ? "Marcar revisada" : "Reabrir"}
                      onPress={() => void updateSuggestion(suggestion)}
                      variant="secondary"
                    />
                    <AppButton disabled={activeSuggestion !== ""} label="Apagar" onPress={() => confirmDeleteSuggestion(suggestion)} variant="danger" />
                  </View>
                </View>
              ))}
              <AppButton disabled={activeSuggestion !== ""} label="Apagar todas as sugestões" onPress={confirmDeleteAllSuggestions} variant="danger" />
            </View>
          ) : <Text style={styles.emptyText}>Nenhuma sugestão recebida.</Text>}
        </View>
        <Text style={styles.footer}>Administração da comunidade · Sessão protegida</Text>
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setEditingTrack(null)} transparent visible={editingTrack !== null}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={styles.editPanel}>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <Text style={styles.eyebrow}>EDIÇÃO DE MÚSICA</Text>
              <Text style={styles.modalTitle}>Editar música</Text>
              <Text style={styles.trackDescription}>Atualize as informações exibidas no feed. O status e o áudio não serão alterados.</Text>
              <Field label="Nome da música" maxLength={120} onChangeText={setEditTitle} value={editTitle} />
              <Field label="Nome do artista" maxLength={120} onChangeText={setEditArtist} value={editArtist} />
              <Text style={styles.fieldLabel}>Categoria</Text>
              <View style={styles.filterList}>
                {trackCategories.map((item) => (
                  <Pressable key={item} onPress={() => setEditCategory(item)} style={[styles.filterChip, editCategory === item && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, editCategory === item && styles.filterChipTextActive]}>{item}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label="Local onde foi cantado" maxLength={120} onChangeText={setEditLocation} placeholder="Desconhecido" value={editLocation} />
              {error ? <Banner>{error}</Banner> : null}
              <View style={styles.rowActions}>
                <AppButton disabled={activeTrack === editingTrack?.id} label="Cancelar" onPress={() => setEditingTrack(null)} variant="secondary" />
                <AppButton disabled={activeTrack === editingTrack?.id} label="Salvar alterações" loading={activeTrack === editingTrack?.id} onPress={() => void saveTrackEdits()} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StatCard({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value.toLocaleString("pt-BR")}</Text>
      <Text style={styles.smallNote}>{caption}</Text>
    </View>
  );
}

function GateScreen({
  onHome,
  title,
  description,
  loading = false,
  children,
}: {
  onHome: () => void;
  title: string;
  description: string;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.gateScreen}>
      <View style={styles.gateCard}>
        <Text style={styles.eyebrow}>ÁREA RESTRITA</Text>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.trackDescription}>{description}</Text>
        {loading ? <ActivityIndicator color={colors.primary} /> : children}
        <AppButton label="Voltar ao feed" onPress={onHome} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 68, paddingHorizontal: 18, borderBottomWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headerBrand: { flex: 1, gap: 3 },
  brand: { color: colors.text, fontSize: 15, fontWeight: "800" },
  headerCaption: { color: colors.muted, fontSize: 10 },
  headerActions: { flexDirection: "row", gap: 15 },
  headerLink: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  content: { padding: 18, paddingBottom: 44, gap: 13 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  pageTitle: { color: colors.text, fontSize: 32, fontWeight: "800" },
  pageDescription: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 6 },
  statCard: { flexGrow: 1, width: "31%", minWidth: 100, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: colors.card, gap: 5 },
  statLabel: { color: colors.primary, fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  statValue: { color: colors.text, fontSize: 23, fontWeight: "800" },
  smallNote: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  panel: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundSecondary, gap: 12 },
  panelLoading: { padding: 22 },
  chart: { height: 128, paddingTop: 18, flexDirection: "row", alignItems: "flex-end", gap: 5 },
  chartColumn: { width: 15, height: 110, alignItems: "center", justifyContent: "flex-end", gap: 3 },
  chartValue: { color: colors.muted, fontSize: 8 },
  chartBar: { width: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: colors.primary },
  chartDate: { color: colors.muted, fontSize: 8 },
  filterList: { flexDirection: "row", flexWrap: "wrap", gap: 7, paddingVertical: 2 },
  filterChip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  filterChipTextActive: { color: colors.background, fontWeight: "800" },
  list: { gap: 10 },
  trackCard: { padding: 13, gap: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: colors.card },
  trackTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  trackDescription: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  status: { alignSelf: "flex-start", color: colors.primary, fontSize: 11, fontWeight: "700" },
  statusApproved: { color: colors.green },
  statusRejected: { color: colors.danger },
  statusReviewed: { color: colors.green },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  emptyText: { paddingVertical: 15, color: colors.muted, fontSize: 13 },
  form: { gap: 13 },
  memberRow: { minHeight: 62, paddingVertical: 9, borderBottomWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 10 },
  memberInfo: { flex: 1, gap: 4 },
  suggestionCard: { padding: 12, gap: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.card },
  suggestionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  footer: { paddingTop: 12, color: colors.muted, fontSize: 11, textAlign: "center" },
  gateScreen: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: colors.background },
  gateCard: { padding: 20, gap: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.72)" },
  editPanel: { maxHeight: "90%", padding: 20, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: colors.background },
  modalTitle: { color: colors.text, fontSize: 23, fontWeight: "800" },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "600" },
});
