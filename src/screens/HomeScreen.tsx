import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppButton, Banner, Field, SectionTitle } from "../components";
import { audioBucket, supabaseConfigurationError, trackCategories } from "../lib/supabase";
import type { AppPage, Track, TrackStatus } from "../lib/types";
import { colors } from "../theme";

type Props = {
  supabase: SupabaseClient | null;
  user: User | null;
  isAdmin: boolean;
  userLabel?: string;
  activeVisitors: number | null;
  onNavigate: (page: AppPage) => void;
};

type ModalName = "auth" | "submit" | "suggestion" | null;

const emailConfirmationUrl = "tirandodeouvido://auth/callback";
const audioMimeTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/flac",
  "audio/aac",
  "audio/webm",
];

function statusLabel(status: TrackStatus) {
  if (status === "approved") return "No feed";
  if (status === "rejected") return "Não aprovada";
  return "Em análise";
}

export function TrackAudio({ url, title }: { url?: string; title: string }) {
  const player = useAudioPlayer(url ?? null, { updateInterval: 1000 });
  const status = useAudioPlayerStatus(player);

  return (
    <Pressable
      accessibilityLabel={`${status.playing ? "Pausar" : "Ouvir"} ${title}`}
      accessibilityRole="button"
      disabled={!url}
      onPress={() => status.playing ? player.pause() : player.play()}
      style={[styles.audioButton, !url && styles.audioButtonDisabled]}
    >
      <Text style={styles.audioButtonText}>{status.playing ? "Pausar" : "Ouvir"}</Text>
      {status.isLoaded && status.duration > 0 ? (
        <Text style={styles.audioDuration}>{Math.ceil(status.duration / 60)} min</Text>
      ) : null}
    </Pressable>
  );
}

export default function HomeScreen({
  supabase,
  user,
  isAdmin,
  userLabel,
  activeVisitors,
  onNavigate,
}: Props) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(Boolean(supabase));
  const [feedError, setFeedError] = useState(supabase ? "" : supabaseConfigurationError);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [modal, setModal] = useState<ModalName>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [newCategory, setNewCategory] = useState<string>(trackCategories[0]);
  const [location, setLocation] = useState("");
  const [audioFile, setAudioFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [suggestionTitle, setSuggestionTitle] = useState("");
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [suggestionError, setSuggestionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadTracks() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("tracks")
          .select("*")
          .order("created_at", { ascending: false });
        if (!active) return;

        if (error) {
          console.error("Falha ao carregar o feed.", error);
          setFeedError("Não foi possível carregar as músicas. Confira a configuração do Supabase.");
          setTracks([]);
          setAudioUrls({});
          setLoading(false);
          return;
        }

        const nextTracks = (data ?? []) as Track[];
        setTracks(nextTracks);
        const entries = await Promise.all(nextTracks.map(async (track) => {
          const { data: signedUrl, error: signedUrlError } = await supabase.storage
            .from(audioBucket)
            .createSignedUrl(track.audio_path, 60 * 60 * 24);
          if (signedUrlError) {
            console.error(`Não foi possível carregar o áudio da faixa ${track.id}.`, signedUrlError);
            return [track.id, ""] as const;
          }
          return [track.id, signedUrl.signedUrl] as const;
        }));
        if (!active) return;
        const availableUrls = entries.filter((entry) => entry[1]);
        setAudioUrls(Object.fromEntries(availableUrls));
        setFeedError(availableUrls.length < nextTracks.length
          ? "Alguns áudios não puderam ser carregados. Tente novamente mais tarde."
          : "");
        setLoading(false);
      } catch (error) {
        if (!active) return;
        console.error("Falha inesperada ao carregar o feed.", error);
        setFeedError("Não foi possível carregar as músicas. Verifique sua conexão e tente novamente.");
        setLoading(false);
      }
    }

    void loadTracks();
    return () => {
      active = false;
    };
  }, [supabase, refreshIndex, user?.id]);

  const approvedTracks = useMemo(
    () => tracks.filter((track) => track.status === "approved"),
    [tracks],
  );
  const ownTracks = useMemo(
    () => tracks.filter((track) => track.submitted_by === user?.id),
    [tracks, user?.id],
  );
  const availableCategories = useMemo(
    () => ["Todas", ...trackCategories.filter((item) => approvedTracks.some((track) => track.category === item))],
    [approvedTracks],
  );
  const filteredTracks = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return approvedTracks.filter((track) => {
      const matchesCategory = category === "Todas" || track.category === category;
      const searchableText = `${track.title} ${track.artist} ${track.category} ${track.location || "Desconhecido"}`
        .toLocaleLowerCase("pt-BR");
      return matchesCategory && (!term || searchableText.includes(term));
    });
  }, [approvedTracks, category, search]);

  function openAuth() {
    setAuthMode("login");
    setAuthError("");
    setAuthMessage("");
    setModal("auth");
  }

  function openUpload() {
    if (!user) {
      openAuth();
      return;
    }
    setFeedError("");
    setModal("submit");
  }

  async function handleAuth() {
    if (!supabase) {
      setAuthError(supabaseConfigurationError);
      return;
    }
    setAuthError("");
    setAuthMessage("");
    if (!email.trim() || !password || (authMode === "signup" && (!displayName.trim() || password.length < 6))) {
      setAuthError(authMode === "signup"
        ? "Informe seu nome, um email válido e uma senha com pelo menos 6 caracteres."
        : "Informe seu email e senha.");
      return;
    }

    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setAuthError("Não foi possível entrar. Confira seu email e senha.");
        else setModal(null);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: emailConfirmationUrl,
          data: { display_name: displayName.trim() },
        },
      });
      if (error) {
        setAuthError("Não foi possível criar a conta. Confira os dados e tente novamente.");
      } else if (data.session) {
        setModal(null);
      } else {
        setAuthMessage("Conta criada. Confira seu email para concluir o acesso.");
      }
    } catch (error) {
      console.error("Falha inesperada na autenticação.", error);
      setAuthError("Não foi possível conectar ao serviço de autenticação. Tente novamente.");
    }
  }

  async function chooseAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: audioMimeTypes,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.size !== undefined && asset.size > 50 * 1024 * 1024) {
        setFeedError("O arquivo excede o limite de 50 MB.");
        return;
      }
      setAudioFile(asset);
      setFeedError("");
    } catch (error) {
      console.error("Falha ao selecionar arquivo de áudio.", error);
      setFeedError("Não foi possível abrir os arquivos do dispositivo. Tente novamente.");
    }
  }

  async function handleSubmitTrack() {
    if (!supabase || !user || !audioFile) return;
    if (!title.trim() || !artist.trim()) {
      setFeedError("Informe o nome da música e do artista.");
      return;
    }

    setSubmitting(true);
    setFeedError("");
    let audioPath = "";
    try {
      const extension = audioFile.name.split(".").pop()?.toLowerCase() || "audio";
      audioPath = `${user.id}/${Crypto.randomUUID()}.${extension}`;
      const audioData = await new File(audioFile.uri).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from(audioBucket)
        .upload(audioPath, audioData, {
          contentType: audioFile.mimeType || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        setFeedError("Não foi possível enviar o áudio. Confira o formato e o tamanho do arquivo.");
        return;
      }

      const { error: insertError } = await supabase.from("tracks").insert({
        title: title.trim(),
        artist: artist.trim(),
        category: newCategory,
        location: location.trim() || "Desconhecido",
        audio_path: audioPath,
        status: "pending",
        submitted_by: user.id,
      });
      if (insertError) {
        const { error: cleanupError } = await supabase.storage.from(audioBucket).remove([audioPath]);
        if (cleanupError) console.error("Não foi possível remover o áudio sem registro.", cleanupError);
        setFeedError("O áudio foi enviado, mas não foi possível registrar a música.");
        return;
      }

      setTitle("");
      setArtist("");
      setNewCategory(trackCategories[0]);
      setLocation("");
      setAudioFile(null);
      setModal(null);
      setRefreshIndex((index) => index + 1);
    } catch (error) {
      console.error("Falha ao enviar música.", error);
      setFeedError("Não foi possível enviar o áudio. Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitSuggestion() {
    if (!supabase || !user) {
      setSuggestionError("Entre na sua conta para enviar uma sugestão.");
      return;
    }
    const trimmedTitle = suggestionTitle.trim();
    const trimmedMessage = suggestionMessage.trim();
    if (!trimmedTitle || !trimmedMessage) {
      setSuggestionError("Preencha o título e a descrição da sugestão.");
      return;
    }

    setSubmitting(true);
    setSuggestionError("");
    try {
      const { error } = await supabase.from("site_suggestions").insert({
        user_id: user.id,
        title: trimmedTitle,
        message: trimmedMessage,
      });
      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") {
          setSuggestionError("As sugestões ainda não foram ativadas no banco. Aplique a migration do Supabase.");
        } else if (error.code === "42501") {
          setSuggestionError("Sua sessão não tem permissão. Saia da conta, entre novamente e tente de novo.");
        } else {
          console.error("Falha ao enviar sugestão.", error);
          setSuggestionError("Não foi possível enviar a sugestão. Tente novamente.");
        }
        return;
      }

      setSuggestionTitle("");
      setSuggestionMessage("");
      setModal(null);
    } catch (error) {
      console.error("Falha inesperada ao enviar sugestão.", error);
      setSuggestionError("Não foi possível enviar a sugestão. Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setFeedError("Não foi possível sair da conta. Tente novamente.");
    } catch (error) {
      console.error("Falha inesperada ao sair da conta.", error);
      setFeedError("Não foi possível sair da conta. Verifique sua conexão e tente novamente.");
    }
  }

  function openSuggestion() {
    if (!user) {
      openAuth();
      return;
    }
    setSuggestionError("");
    setModal("suggestion");
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => onNavigate("home")} style={styles.brand}>
          <Text style={styles.brandMark}>♫</Text>
          <View>
            <Text style={styles.brandTitle}>Tirando de Ouvido</Text>
            <Text style={styles.brandCaption}>FEED DE MÚSICA</Text>
          </View>
        </Pressable>
        <View style={styles.headerActions}>
          {isAdmin ? <Pressable onPress={() => onNavigate("admin")}><Text style={styles.headerLink}>Admin</Text></Pressable> : null}
          {user ? (
            <View style={styles.userActions}>
              {userLabel ? <Text numberOfLines={1} style={styles.userLabel}>{userLabel}</Text> : null}
              <Pressable accessibilityRole="button" onPress={() => void handleSignOut()} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Sair</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={openAuth} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Entrar</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>●  MÚSICO DE IGREJA</Text>
          <Text style={styles.heroTitle}>Bora treinar{`\n`}o ouvido?</Text>
          <Text style={styles.heroCopy}>Cantores reais de igreja para você passar sufoco.</Text>
          <View style={styles.stats}>
            <View><Text style={styles.statValue}>{String(approvedTracks.length).padStart(2, "0")}</Text><Text style={styles.statLabel}>no feed</Text></View>
            <View style={styles.statDivider} />
            <View><Text style={styles.statValue}>{activeVisitors ?? "—"}</Text><Text style={styles.statLabel}>online</Text></View>
          </View>
          <AppButton label="+  Enviar música" onPress={openUpload} />
        </View>

        {feedError ? <Banner>{feedError}</Banner> : null}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            accessibilityLabel="Pesquisar músicas"
            onChangeText={setSearch}
            placeholder="Buscar música, cantor ou local"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={search}
          />
        </View>
        <ScrollView horizontal contentContainerStyle={styles.categoryList} showsHorizontalScrollIndicator={false}>
          {availableCategories.map((item) => (
            <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryChip, category === item && styles.categoryChipSelected]}>
              <Text style={[styles.categoryText, category === item && styles.categoryTextSelected]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionTitle title="Faixas recentes" count={filteredTracks.length} note="APROVADAS PELA COMUNIDADE" />
        {loading ? (
          <View style={styles.loadingState}><ActivityIndicator color={colors.primary} /><Text style={styles.mutedText}>Carregando faixas...</Text></View>
        ) : filteredTracks.length ? (
          <View style={styles.trackList}>
            {filteredTracks.map((track, index) => (
              <View key={track.id} style={styles.trackCard}>
                <View style={[styles.trackArtwork, artworkColors[index % artworkColors.length]]}>
                  <Text style={styles.trackArtworkText}>♫</Text>
                </View>
                <View style={styles.trackInfo}>
                  <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
                  <Text numberOfLines={1} style={styles.trackArtist}>{track.artist} · {track.location || "Desconhecido"}</Text>
                  <Text style={styles.trackCategory}>{track.category}</Text>
                </View>
                <TrackAudio title={track.title} url={audioUrls[track.id]} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>♫</Text>
            <Text style={styles.emptyTitle}>{search || category !== "Todas" ? "Nenhuma faixa encontrada" : "O feed começa com você"}</Text>
            <Text style={styles.mutedText}>{search || category !== "Todas" ? "Tente outra busca ou categoria." : "Envie uma música e ela aparece aqui depois da aprovação."}</Text>
            {!search && category === "Todas" ? <AppButton label="Enviar a primeira faixa" onPress={openUpload} /> : null}
          </View>
        )}

        {user && ownTracks.length > 0 ? (
          <View style={styles.submissions}>
            <SectionTitle title="Suas submissões" count={ownTracks.length} note="ACOMPANHE A MODERAÇÃO" />
            {ownTracks.slice(0, 5).map((track) => (
              <View key={track.id} style={styles.submissionRow}>
                <View style={styles.submissionInfo}>
                  <Text style={styles.trackTitle}>{track.title}</Text>
                  <Text style={styles.trackArtist}>{track.artist}</Text>
                </View>
                <Text style={[styles.status, track.status === "approved" && styles.statusApproved, track.status === "rejected" && styles.statusRejected]}>
                  {statusLabel(track.status)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.suggestionBox}>
          <Text style={styles.suggestionTitle}>Sua ideia faz diferença</Text>
          <Text style={styles.mutedText}>Ajude a melhorar a comunidade.</Text>
          <AppButton label="Sugerir melhoria" onPress={openSuggestion} variant="secondary" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>♫  Tirando de Ouvido</Text>
          <Text style={styles.mutedText}>Feito para quem toca na igreja.</Text>
          <View style={styles.footerLinks}>
            {infoLinks.map(([page, label]) => (
              <Pressable key={page} onPress={() => onNavigate(page)}><Text style={styles.footerLink}>{label}</Text></Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setModal(null)} transparent visible={modal !== null}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeading}>
                <View>
                  <Text style={styles.eyebrow}>
                    {modal === "auth" ? "SUA CONTA" : modal === "submit" ? "NOVO ENVIO" : "SUGESTÃO DA COMUNIDADE"}
                  </Text>
                  <Text style={styles.modalTitle}>
                    {modal === "auth" ? authMode === "login" ? "Entre para continuar" : "Crie sua conta"
                      : modal === "submit" ? "Compartilhe seu som" : "Ajude a melhorar o app"}
                  </Text>
                </View>
                <Pressable accessibilityLabel="Fechar" onPress={() => setModal(null)}><Text style={styles.closeButton}>×</Text></Pressable>
              </View>
              {modal === "auth" ? (
                <View style={styles.form}>
                  <Text style={styles.modalCopy}>Envie faixas e acompanhe cada etapa da aprovação.</Text>
                  <View style={styles.authTabs}>
                    {(["login", "signup"] as const).map((item) => (
                      <Pressable key={item} onPress={() => { setAuthMode(item); setAuthError(""); setAuthMessage(""); }} style={[styles.authTab, authMode === item && styles.authTabActive]}>
                        <Text style={[styles.authTabText, authMode === item && styles.authTabTextActive]}>{item === "login" ? "Entrar" : "Criar conta"}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {authMode === "signup" ? <Field label="Nome" maxLength={80} onChangeText={setDisplayName} placeholder="Como podemos chamar você?" value={displayName} /> : null}
                  <Field autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={setEmail} placeholder="voce@email.com" value={email} />
                  <Field label="Senha" onChangeText={setPassword} placeholder="Mínimo de 6 caracteres" secureTextEntry value={password} />
                  {authError ? <Banner>{authError}</Banner> : null}
                  {authMessage ? <Banner variant="success">{authMessage}</Banner> : null}
                  <AppButton label={authMode === "login" ? "Entrar" : "Criar conta"} onPress={() => void handleAuth()} />
                  <Text style={styles.secureNote}>Acesso protegido pelo Supabase</Text>
                </View>
              ) : modal === "submit" ? (
                <View style={styles.form}>
                  <Text style={styles.modalCopy}>A faixa entra no feed depois de aprovada pela equipe.</Text>
                  <Field label="Nome da música" maxLength={120} onChangeText={setTitle} placeholder="Ex.: Depois da Chuva" value={title} />
                  <Field label="Nome do artista" maxLength={120} onChangeText={setArtist} placeholder="Seu nome artístico" value={artist} />
                  <Text style={styles.fieldLabel}>Categoria</Text>
                  <View style={styles.choiceList}>
                    {trackCategories.map((item) => (
                      <Pressable key={item} onPress={() => setNewCategory(item)} style={[styles.categoryChip, newCategory === item && styles.categoryChipSelected]}>
                        <Text style={[styles.categoryText, newCategory === item && styles.categoryTextSelected]}>{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Field label="Local onde foi cantado" maxLength={120} onChangeText={setLocation} placeholder="Ex.: São Carlos (opcional)" value={location} />
                  <AppButton label={audioFile ? `Arquivo: ${audioFile.name}` : "Escolher arquivo de áudio"} onPress={() => void chooseAudio()} variant="secondary" />
                  <Text style={styles.secureNote}>MP3, WAV, OGG, M4A ou FLAC · até 50 MB · privado até aprovação</Text>
                  {feedError ? <Banner>{feedError}</Banner> : null}
                  <AppButton disabled={!audioFile || !title.trim() || !artist.trim()} label="Enviar para aprovação" loading={submitting} onPress={() => void handleSubmitTrack()} />
                </View>
              ) : (
                <View style={styles.form}>
                  <Text style={styles.modalCopy}>As sugestões são visíveis apenas para a administração.</Text>
                  <Field label="Título da sugestão" maxLength={120} onChangeText={setSuggestionTitle} placeholder="Ex.: melhorar a busca por músicas" value={suggestionTitle} />
                  <Field label="Conte sua ideia" maxLength={2000} multiline onChangeText={setSuggestionMessage} placeholder="O que você gostaria que mudasse ou fosse acrescentado?" value={suggestionMessage} />
                  {suggestionError ? <Banner>{suggestionError}</Banner> : null}
                  <AppButton disabled={!suggestionTitle.trim() || !suggestionMessage.trim()} label="Enviar sugestão" loading={submitting} onPress={() => void handleSubmitSuggestion()} />
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const infoLinks: [AppPage, string][] = [
  ["about", "Sobre"],
  ["privacy", "Privacidade"],
  ["terms", "Termos"],
  ["contact", "Contato"],
];

const artworkColors = [
  { backgroundColor: "#252B3C" },
  { backgroundColor: "#263B36" },
  { backgroundColor: "#443028" },
  { backgroundColor: "#352F48" },
  { backgroundColor: "#24394A" },
];

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 66,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { color: colors.primary, fontSize: 28, fontWeight: "700" },
  brandTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  brandCaption: { color: colors.muted, fontSize: 9, letterSpacing: 1.1, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  userActions: { alignItems: "flex-end", gap: 3 },
  userLabel: { maxWidth: 120, color: colors.muted, fontSize: 10 },
  headerLink: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  headerButton: { backgroundColor: colors.card, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 },
  headerButtonText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  content: { padding: 18, paddingBottom: 46, gap: 16 },
  hero: { paddingTop: 12, paddingBottom: 20, borderBottomWidth: 1, borderColor: colors.border, gap: 12 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  heroTitle: { color: colors.text, fontSize: 38, fontWeight: "800", lineHeight: 42, letterSpacing: -1 },
  heroCopy: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  stats: { flexDirection: "row", alignItems: "center", gap: 18, marginVertical: 3 },
  statValue: { color: colors.text, fontSize: 23, fontWeight: "700" },
  statLabel: { color: colors.muted, fontSize: 11 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  searchBox: {
    minHeight: 47,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  searchIcon: { color: colors.muted, fontSize: 25 },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 10 },
  categoryList: { gap: 7, paddingVertical: 2 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  categoryChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  categoryTextSelected: { color: colors.background, fontWeight: "800" },
  loadingState: { minHeight: 100, alignItems: "center", justifyContent: "center", gap: 10 },
  mutedText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  trackList: { gap: 10, paddingTop: 12 },
  trackCard: {
    minHeight: 92,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  trackArtwork: { width: 46, height: 46, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  trackArtworkText: { color: colors.primary, fontSize: 23 },
  trackInfo: { flex: 1, gap: 3 },
  trackTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  trackArtist: { color: colors.muted, fontSize: 12 },
  trackCategory: { color: colors.primary, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 },
  audioButton: { minWidth: 54, paddingHorizontal: 9, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 7, alignItems: "center" },
  audioButtonDisabled: { opacity: 0.5 },
  audioButtonText: { color: colors.background, fontSize: 11, fontWeight: "800" },
  audioDuration: { color: colors.background, fontSize: 9 },
  emptyState: { paddingVertical: 25, alignItems: "center", gap: 10 },
  emptyIcon: { color: colors.primary, fontSize: 32 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  submissions: { marginTop: 12 },
  submissionRow: { minHeight: 62, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  submissionInfo: { flex: 1, gap: 4 },
  status: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  statusApproved: { color: colors.green },
  statusRejected: { color: colors.danger },
  suggestionBox: { marginTop: 10, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, gap: 10 },
  suggestionTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  footer: { paddingTop: 22, gap: 9, borderTopWidth: 1, borderColor: colors.border },
  footerBrand: { color: colors.text, fontWeight: "700" },
  footerLinks: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 8 },
  footerLink: { color: colors.primary, fontSize: 12 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.72)" },
  modalPanel: { maxHeight: "92%", paddingTop: 22, paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 30 : 18, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: colors.background },
  modalContent: { gap: 17, paddingBottom: 18 },
  modalHeading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  modalTitle: { marginTop: 7, color: colors.text, fontSize: 24, fontWeight: "800" },
  closeButton: { color: colors.muted, fontSize: 32, lineHeight: 32, paddingHorizontal: 5 },
  modalCopy: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  form: { gap: 14 },
  authTabs: { flexDirection: "row", borderBottomWidth: 1, borderColor: colors.border },
  authTab: { flex: 1, alignItems: "center", paddingVertical: 11, borderBottomWidth: 2, borderColor: "transparent" },
  authTabActive: { borderColor: colors.primary },
  authTabText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  authTabTextActive: { color: colors.primary },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "600" },
  choiceList: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  secureNote: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center" },
});
