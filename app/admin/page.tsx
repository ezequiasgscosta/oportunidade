"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Clock3,
  LoaderCircle,
  LogIn,
  LogOut,
  Music2,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRoundMinus,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { useActiveVisitors } from "../components/active-visitors";
import { createClient } from "@/lib/supabase/client";

type TrackStatus = "pending" | "approved" | "rejected";
type Track = {
  id: string;
  title: string;
  artist: string;
  category: string;
  location: string;
  audio_path: string;
  status: TrackStatus;
  created_at: string;
};
type AdminMember = { user_id: string; email: string | null; created_at: string };
type DashboardStats = {
  total_users: number;
  total_tracks: number;
  approved_tracks: number;
  pending_tracks: number;
  rejected_tracks: number;
};
type TrackFilter = "pending" | "approved" | "rejected" | "all";

const audioBucket = "music-audio";
const categories = ["hino da harpa", "hino avulso", "cover"];
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

export default function AdminPage() {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [roleState, setRoleState] = useState<{ userId: string; isAdmin: boolean } | null>(null);
  const [stats, setStats] = useState(emptyStats);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [filter, setFilter] = useState<TrackFilter>("pending");
  const [activeTrack, setActiveTrack] = useState("");
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editCategory, setEditCategory] = useState(categories[0]);
  const [editLocation, setEditLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);
  const activeVisitors = useActiveVisitors();

  const isAdmin = Boolean(user && roleState?.userId === user.id && roleState.isAdmin);
  const checkingRole = Boolean(user) && roleState?.userId !== user?.id;
  const visibleTracks = tracks.filter((track) => filter === "all" || track.status === filter);
  const profileName = user?.user_metadata?.display_name;
  const adminDisplayName = typeof profileName === "string" && profileName.trim()
    ? profileName.trim()
    : user?.email;

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user);
        setAuthChecking(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecking(false);
      setRoleState(null);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let active = true;
    if (!user) return;

    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (active) setRoleState({ userId: user.id, isAdmin: Boolean(data) });
      });

    return () => {
      active = false;
    };
  }, [supabase, user]);

  useEffect(() => {
    let active = true;
    if (!user || !isAdmin) return;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      const [statsResult, adminsResult, tracksResult] = await Promise.all([
        supabase.rpc("admin_dashboard_stats"),
        supabase.rpc("admin_list_admins"),
        supabase.from("tracks").select("*").order("created_at", { ascending: false }),
      ]);

      if (!active) return;
      if (statsResult.error || adminsResult.error || tracksResult.error) {
        setError("Não foi possível carregar o painel. Aplique as migrations do Supabase e tente novamente.");
        setLoading(false);
        return;
      }

      const nextTracks = (tracksResult.data ?? []) as Track[];
      setStats((statsResult.data?.[0] as DashboardStats | undefined) ?? emptyStats);
      setAdmins((adminsResult.data ?? []) as AdminMember[]);
      setTracks(nextTracks);

      const urls = await Promise.all(
        nextTracks.map(async (track) => {
          const { data } = await supabase.storage
            .from(audioBucket)
            .createSignedUrl(track.audio_path, 60 * 60 * 24);
          return [track.id, data?.signedUrl] as const;
        }),
      );
      if (active) {
        setAudioUrls(Object.fromEntries(urls.filter((entry) => entry[1])) as Record<string, string>);
        setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [supabase, user, isAdmin, refreshIndex]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) setAuthError("Não foi possível entrar. Confira seu email e senha.");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function updateTrack(track: Track, status: TrackStatus) {
    setActiveTrack(track.id);
    setError("");
    const { error: updateError } = await supabase.from("tracks").update({ status }).eq("id", track.id);
    if (updateError) setError("Não foi possível atualizar a faixa.");
    else {
      setNotice(`“${track.title}” foi ${status === "approved" ? "aprovada" : "recusada"}.`);
      setRefreshIndex((index) => index + 1);
    }
    setActiveTrack("");
  }

  function startEditingTrack(track: Track) {
    setEditingTrack(track);
    setEditTitle(track.title);
    setEditArtist(track.artist);
    setEditCategory(track.category);
    setEditLocation(track.location);
    setError("");
    setNotice("");
  }

  async function saveTrackEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTrack) return;

    const title = editTitle.trim();
    const artist = editArtist.trim();
    const location = editLocation.trim() || "Desconhecido";
    if (!title || !artist) {
      setError("Informe o nome da música e do artista.");
      return;
    }

    setActiveTrack(editingTrack.id);
    setError("");
    setNotice("");
    const { error: updateError } = await supabase
      .from("tracks")
      .update({ title, artist, category: editCategory, location })
      .eq("id", editingTrack.id);

    if (updateError) {
      setError("Não foi possível salvar as alterações da música.");
    } else {
      setNotice(`“${title}” foi atualizada.`);
      setEditingTrack(null);
      setRefreshIndex((index) => index + 1);
    }
    setActiveTrack("");
  }

  async function deleteTrack(track: Track) {
    if (!window.confirm(`Excluir “${track.title}” permanentemente?`)) return;
    setActiveTrack(track.id);
    setError("");
    const { error: deleteError } = await supabase.from("tracks").delete().eq("id", track.id);
    if (deleteError) {
      setError("Não foi possível excluir a faixa.");
    } else {
      const { error: storageError } = await supabase.storage.from(audioBucket).remove([track.audio_path]);
      setNotice(storageError ? "Faixa excluída; o arquivo de áudio não pôde ser removido." : "Faixa excluída.");
      setRefreshIndex((index) => index + 1);
    }
    setActiveTrack("");
  }

  async function addAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAdmin(true);
    setError("");
    setNotice("");
    const { error: addError } = await supabase.rpc("admin_set_role", {
      p_email: newAdminEmail.trim(),
      p_is_admin: true,
    });
    if (addError) {
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

  async function removeAdmin(admin: AdminMember) {
    if (!admin.email || !window.confirm(`Remover o acesso administrativo de ${admin.email}?`)) return;
    setSavingAdmin(true);
    setError("");
    setNotice("");
    const { error: removeError } = await supabase.rpc("admin_set_role", {
      p_email: admin.email,
      p_is_admin: false,
    });
    if (removeError) {
      setError(removeError.message.includes("last administrator")
        ? "Não é possível remover o último administrador."
        : "Não foi possível remover esse administrador.");
    } else {
      setNotice("Acesso administrativo removido.");
      if (user && admin.user_id === user.id) setRoleState({ userId: user.id, isAdmin: false });
      setRefreshIndex((index) => index + 1);
    }
    setSavingAdmin(false);
  }

  if (authChecking || checkingRole) {
    return <main className="admin-gate"><LoaderCircle className="spin" size={24} /><span>Verificando acesso...</span></main>;
  }

  if (!user) {
    return (
      <main className="admin-gate-page">
        <Link className="admin-back-link" href="/"><ArrowLeft size={16} /> Voltar ao feed</Link>
        <section className="admin-login-panel">
          <span className="admin-login-icon"><ShieldCheck size={23} /></span>
          <p className="modal-kicker">ÁREA RESTRITA</p>
          <h1>Administração</h1>
          <p>Entre com uma conta que tenha acesso administrativo.</p>
          <form className="modal-form" onSubmit={(event) => void handleLogin(event)}>
            <label>Email<input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@email.com" /></label>
            <label>Senha<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" /></label>
            {authError && <p className="form-error" role="alert">{authError}</p>}
            <button className="form-submit" type="submit">Entrar <LogIn size={16} /></button>
          </form>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="admin-gate-page">
        <Link className="admin-back-link" href="/"><ArrowLeft size={16} /> Voltar ao feed</Link>
        <section className="admin-login-panel">
          <span className="admin-login-icon admin-denied-icon"><X size={23} /></span>
          <p className="modal-kicker">ACESSO RESTRITO</p>
          <h1>Sem permissão</h1>
          <p>Esta conta não tem acesso ao painel administrativo.</p>
          <button className="quiet-button" onClick={() => void handleLogout()}><LogOut size={16} /> Sair da conta</button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell admin-app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Onda, voltar ao feed">
          <span className="brand-mark"><Music2 size={20} /></span>
          <span className="brand-word">Tirando de<span>Ouvido</span></span>
          <span className="brand-caption">ADMINISTRAÇÃO</span>
        </Link>
        <nav className="top-actions" aria-label="Navegação administrativa">
          <span className="admin-session"><ShieldCheck size={15} /> {adminDisplayName}</span>
          <button className="quiet-button" onClick={() => void handleLogout()} title="Sair" aria-label="Sair"><LogOut size={17} /></button>
        </nav>
      </header>

      <div className="page-content admin-content">
        <section className="admin-page-heading">
          <div>
            <Link className="admin-back-link" href="/"><ArrowLeft size={15} /> Voltar ao feed</Link>
            <div className="eyebrow"><span className="live-dot" /> PAINEL DE CONTROLE</div>
            <h1>Administração</h1>
            <p>Visão geral da comunidade, moderação e acessos.</p>
          </div>
          <div className="admin-heading-tag"><ShieldCheck size={17} /> Acesso total</div>
        </section>

        {error && <p className="feedback-banner" role="alert">{error}</p>}
        {notice && <p className="admin-notice" role="status"><BadgeCheck size={16} />{notice}</p>}

        <section className="admin-stats-grid" aria-label="Estatísticas do site">
          <article className="admin-stat-card stat-users"><span className="admin-stat-icon"><UsersRound size={18} /></span><span className="admin-stat-label">USUÁRIOS</span><strong>{stats.total_users}</strong><small>contas cadastradas</small></article>
          <article className="admin-stat-card stat-total"><span className="admin-stat-icon"><Music2 size={18} /></span><span className="admin-stat-label">MÚSICAS</span><strong>{stats.total_tracks}</strong><small>envios no sistema</small></article>
          <article className="admin-stat-card stat-pending"><span className="admin-stat-icon"><Clock3 size={18} /></span><span className="admin-stat-label">PENDENTES</span><strong>{stats.pending_tracks}</strong><small>aguardando revisão</small></article>
          <article className="admin-stat-card stat-approved"><span className="admin-stat-icon"><BadgeCheck size={18} /></span><span className="admin-stat-label">APROVADAS</span><strong>{stats.approved_tracks}</strong><small>publicadas no feed</small></article>
          <article className="admin-stat-card stat-rejected"><span className="admin-stat-icon"><X size={18} /></span><span className="admin-stat-label">RECUSADAS</span><strong>{stats.rejected_tracks}</strong><small>não publicadas</small></article>
          <article className="admin-stat-card stat-online"><span className="admin-stat-icon"><UsersRound size={18} /></span><span className="admin-stat-label">ONLINE AGORA</span><strong>{activeVisitors ?? "—"}</strong><small>visitantes conectados</small></article>
        </section>
        <p className="online-count-note">Estimativa em tempo real: várias abas do mesmo navegador contam como um visitante.</p>

        <section className="admin-panel-section" aria-labelledby="moderation-title">
          <div className="admin-section-heading">
            <div><span className="admin-section-index">01</span><div><h2 id="moderation-title">Moderação de músicas</h2><p>Aprove, recuse ou remova os envios da comunidade.</p></div></div>
            <span className="admin-section-count">{stats.pending_tracks} pendentes</span>
          </div>
          <div className="admin-filter-tabs" role="tablist" aria-label="Filtrar músicas">
            {(Object.keys(filterLabels) as TrackFilter[]).map((item) => (
              <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                {filterLabels[item]}<span>{item === "all" ? stats.total_tracks : item === "pending" ? stats.pending_tracks : item === "approved" ? stats.approved_tracks : stats.rejected_tracks}</span>
              </button>
            ))}
          </div>
          {loading ? (
            <div className="loading-state"><LoaderCircle className="spin" size={22} /> Carregando painel...</div>
          ) : visibleTracks.length ? (
            <div className="admin-music-list">
              {visibleTracks.map((track) => (
                <article className="admin-music-row" key={track.id}>
                  <div className="track-art art-4"><Music2 size={19} /></div>
                  <div className="track-meta"><h3>{track.title}</h3><p>{track.artist} <span>/</span> {track.category} <span>/</span> {track.location || "Desconhecido"}</p></div>
                  <audio controls preload="none" src={audioUrls[track.id]} aria-label={`Ouvir ${track.title}, de ${track.artist}`} />
                  <span className={`admin-track-status status-${track.status}`}>{statusLabel(track.status)}</span>
                  <div className="admin-row-actions">
                    <button className="edit-track-button" disabled={activeTrack === track.id} onClick={() => startEditingTrack(track)} aria-label={`Editar ${track.title}`} title="Editar música"><Pencil size={15} /> Editar</button>
                    {track.status !== "approved" && <button className="approve-button" disabled={activeTrack === track.id} onClick={() => void updateTrack(track, "approved")}><Check size={15} /> Aprovar</button>}
                    {track.status === "pending" && <button className="reject-button" disabled={activeTrack === track.id} onClick={() => void updateTrack(track, "rejected")}><X size={15} /> Recusar</button>}
                    <button className="delete-button" disabled={activeTrack === track.id} onClick={() => void deleteTrack(track)} aria-label={`Excluir ${track.title}`} title="Excluir música">{activeTrack === track.id ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state"><BadgeCheck size={21} /><strong>Nenhuma música {filter === "all" ? "cadastrada" : filterLabels[filter].toLowerCase()}</strong><span>Os envios correspondentes aparecerão aqui.</span></div>
          )}
        </section>

        <section className="admin-panel-section admin-members-section" aria-labelledby="admins-title">
          <div className="admin-section-heading">
            <div><span className="admin-section-index">02</span><div><h2 id="admins-title">Administradores</h2><p>Gerencie quem pode acessar o painel e moderar o site.</p></div></div>
            <span className="admin-section-count">{admins.length} {admins.length === 1 ? "admin" : "admins"}</span>
          </div>
          <form className="add-admin-form" onSubmit={(event) => void addAdmin(event)}>
            <label htmlFor="new-admin-email">Adicionar administrador</label>
            <div><input id="new-admin-email" type="email" required value={newAdminEmail} onChange={(event) => setNewAdminEmail(event.target.value)} placeholder="email da conta já cadastrada" /><button className="add-admin-button" type="submit" disabled={savingAdmin}><Plus size={16} /> Adicionar</button></div>
            <small>A pessoa precisa ter uma conta criada no site antes de receber acesso administrativo.</small>
          </form>
          <div className="admin-members-list">
            {admins.map((admin, index) => (
              <article className="admin-member-row" key={admin.user_id}>
                <span className={`member-avatar member-avatar-${index % 4}`}><ShieldCheck size={17} /></span>
                <div className="member-details"><strong>{admin.email ?? "Email indisponível"}</strong><span>Admin desde {new Date(admin.created_at).toLocaleDateString("pt-BR")}{admin.user_id === user.id ? " · Você" : ""}</span></div>
                <span className="member-role">ADMIN</span>
                <button className="remove-admin-button" disabled={savingAdmin || admins.length === 1 || !admin.email} onClick={() => void removeAdmin(admin)} aria-label={`Remover ${admin.email ?? "administrador"}`} title={admins.length === 1 ? "O último admin não pode ser removido" : "Remover administrador"}><UserRoundMinus size={16} /></button>
              </article>
            ))}
          </div>
        </section>

        <footer className="page-footer">
          <Link className="footer-brand" href="/"><Music2 size={15} /> Tirando de Ouvido</Link>
          <span>Administração da comunidade</span>
          <nav className="legal-footer-links" aria-label="Informações do site">
            <Link href="/sobre">Sobre</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/termos">Termos</Link>
            <Link href="/contato">Contato</Link>
          </nav>
          <span className="footer-live"><span className="live-dot" /> SESSÃO PROTEGIDA</span>
        </footer>
      </div>
      {editingTrack && (
        <div className="modal-backdrop">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="edit-track-title">
            <button className="modal-close" type="button" onClick={() => setEditingTrack(null)} disabled={activeTrack === editingTrack.id} aria-label="Fechar edição"><X size={19} /></button>
            <p className="modal-kicker">EDIÇÃO DE MÚSICA</p>
            <h2 id="edit-track-title">Editar música</h2>
            <p className="modal-copy">Atualize as informações exibidas no feed. O status e o áudio não serão alterados.</p>
            <form className="modal-form" onSubmit={(event) => void saveTrackEdits(event)}>
              <label>Nome da música<input required maxLength={120} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /></label>
              <label>Nome do artista<input required maxLength={120} value={editArtist} onChange={(event) => setEditArtist(event.target.value)} /></label>
              <label>Categoria<select value={editCategory} onChange={(event) => setEditCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>Local onde foi cantado<input maxLength={120} value={editLocation} onChange={(event) => setEditLocation(event.target.value)} placeholder="Desconhecido" /></label>
              <div className="edit-track-actions">
                <button className="quiet-button" type="button" onClick={() => setEditingTrack(null)} disabled={activeTrack === editingTrack.id}>Cancelar</button>
                <button className="form-submit" type="submit" disabled={activeTrack === editingTrack.id}>
                  {activeTrack === editingTrack.id ? <><LoaderCircle className="spin" size={16} /> Salvando...</> : <>Salvar alterações <Save size={16} /></>}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}