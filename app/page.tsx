"use client";

import {
  AudioLines,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Disc3,
  Headphones,
  LoaderCircle,
  LogIn,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useActiveVisitors } from "./components/active-visitors";
import GoogleAd from "./components/google-ad";

type TrackStatus = "pending" | "approved" | "rejected";

type Track = {
  id: string;
  title: string;
  artist: string;
  category: string;
  audio_path: string;
  status: TrackStatus;
  submitted_by: string | null;
  created_at: string;
};

const categories = ["hino da harpa", "hino avulso", "cover"];
const audioBucket = "music-audio";

function getStatusLabel(status: TrackStatus) {
  if (status === "approved") return "No feed";
  if (status === "rejected") return "Não aprovada";
  return "Em análise";
}

export default function Home() {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadedForUser, setLoadedForUser] = useState<string | null>(null);
  const [feedError, setFeedError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [modal, setModal] = useState<"auth" | "submit" | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [newCategory, setNewCategory] = useState(categories[0]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const activeVisitors = useActiveVisitors();
  const isAdmin = adminUserId === user?.id;
  const feedLoading = loading || loadedForUser !== (user?.id ?? "anonymous");

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data.user);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
        if (active) setAdminUserId(data ? user.id : null);
      });

    return () => {
      active = false;
    };
  }, [supabase, user]);

  useEffect(() => {
    let active = true;

    void supabase
      .from("tracks")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setFeedError("Não foi possível carregar as músicas. Confira a configuração do banco.");
          setTracks([]);
        } else {
          setTracks((data ?? []) as Track[]);
        }
        setLoadedForUser(user?.id ?? "anonymous");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [supabase, user?.id, isAdmin, refreshIndex]);

  useEffect(() => {
    let active = true;
    void Promise.all(
      tracks.map(async (track) => {
        const { data } = await supabase.storage
          .from(audioBucket)
          .createSignedUrl(track.audio_path, 60 * 60 * 24);
        return [track.id, data?.signedUrl] as const;
      }),
    ).then((entries) => {
      if (active) {
        setAudioUrls(Object.fromEntries(entries.filter((entry) => entry[1])) as Record<string, string>);
      }
    });

    return () => {
      active = false;
    };
  }, [supabase, tracks]);

  const approvedTracks = tracks.filter((track) => track.status === "approved");
  const filteredTracks = approvedTracks.filter((track) => {
    const matchesCategory = category === "Todas" || track.category === category;
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch =
      !term ||
      `${track.title} ${track.artist} ${track.category}`.toLocaleLowerCase("pt-BR").includes(term);
    return matchesCategory && matchesSearch;
  });
  const ownTracks = tracks.filter((track) => track.submitted_by === user?.id);
  const availableCategories = ["Todas", ...categories.filter((item) => approvedTracks.some((track) => track.category === item))];
  const profileName = user?.user_metadata?.display_name;
  const userLabel = typeof profileName === "string" && profileName.trim()
    ? profileName.trim()
    : user?.email;

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");

    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError("Não foi possível entrar. Confira seu email e senha.");
      else setModal(null);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName.trim() } },
    });
    if (error) {
      setAuthError("Não foi possível criar a conta. Confira os dados e tente novamente.");
    } else if (data.session) {
      setModal(null);
    } else {
      setAuthMessage("Conta criada. Confira seu email para concluir o acesso.");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function handleSubmitTrack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !audioFile) return;

    setSubmitting(true);
    const extension = audioFile.name.split(".").pop()?.toLowerCase() || "audio";
    const audioPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(audioBucket)
      .upload(audioPath, audioFile, { contentType: audioFile.type, upsert: false });

    if (uploadError) {
      setFeedError("Não foi possível enviar o áudio. Confira o formato e o tamanho do arquivo.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("tracks").insert({
      title: title.trim(),
      artist: artist.trim(),
      category: newCategory,
      audio_path: audioPath,
      status: "pending",
      submitted_by: user.id,
    });

    if (insertError) {
      await supabase.storage.from(audioBucket).remove([audioPath]);
      setFeedError("O áudio foi enviado, mas não foi possível registrar a música.");
      setSubmitting(false);
      return;
    }

    setTitle("");
    setArtist("");
    setNewCategory(categories[0]);
    setAudioFile(null);
    setModal(null);
    setFeedError("");
    setRefreshIndex((index) => index + 1);
    setSubmitting(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#feed" aria-label="Onda, início">
          <span className="brand-mark"><AudioLines size={21} strokeWidth={2.4} /></span>
          <span className="brand-word">Canta <span>Igreja</span></span>
          <span className="brand-caption">FEED DE MÚSICA</span>
        </a>
        <nav className="top-actions" aria-label="Navegação principal">
          {isAdmin && (
            <Link className="nav-link" href="/admin">
              <ShieldCheck size={16} /> Admin
            </Link>
          )}
          {user ? (
            <>
              <span className="user-email">{userLabel}</span>
              <button className="quiet-button" onClick={handleSignOut} aria-label="Sair" title="Sair">
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <button className="quiet-button sign-in-link" onClick={() => { setModal("auth"); setAuthMode("login"); }}>
              <LogIn size={16} /> Entrar
            </button>
          )}
          <button
            className="add-button"
            onClick={() => {
              if (user) setModal("submit");
              else { setAuthMode("login"); setModal("auth"); }
            }}
          >
            <Plus size={17} strokeWidth={2.5} /> <span>Enviar música</span>
          </button>
        </nav>
      </header>

      <div className="page-content" id="feed">
        <section className="intro-row">
          <div>
            <div className="eyebrow"><span className="live-dot" /> ESCUTA DA COMUNIDADE</div>
            <h1>O que está tocando?</h1>
            <p className="intro-copy">Descubra sons novos, direto de quem faz música.</p>
          </div>
          <div className="intro-stats" aria-label="Resumo do feed">
            <div className="stat-block"><strong>{approvedTracks.length.toString().padStart(2, "0")}</strong><span>no feed</span></div>
            <span className="stat-rule" />
            <div className="stat-block"><strong>{activeVisitors ?? "—"}</strong><span>online</span></div>
          </div>
        </section>

        <>
            <section className="feed-toolbar" aria-label="Filtros do feed">
              <label className="search-field">
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">Pesquisar músicas</span>
                <input
                  type="search"
                  placeholder="Buscar música, artista ou categoria"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <kbd>/</kbd>
              </label>
              <div className="category-list" aria-label="Filtrar por categoria">
                {availableCategories.map((item) => (
                  <button
                    className={`category-filter ${category === item ? "selected" : ""}`}
                    key={item}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>

            {feedError && <p className="feedback-banner" role="alert">{feedError}</p>}

            <section className="track-section" aria-label="Músicas aprovadas">
              <div className="section-heading">
                <div className="section-title"><Disc3 size={18} /><h2>Faixas recentes</h2><span>{filteredTracks.length}</span></div>
                <span className="section-note">APROVADAS PELA COMUNIDADE</span>
              </div>

              {feedLoading ? (
                <div className="loading-state"><LoaderCircle className="spin" size={23} /><span>Carregando faixas...</span></div>
              ) : filteredTracks.length ? (
                <div className="track-list">
                  {filteredTracks.map((track, index) => (
                    <article className="track-row" key={track.id}>
                      <span className="track-number">{(index + 1).toString().padStart(2, "0")}</span>
                      <div className={`track-art art-${index % 5}`} aria-hidden="true">
                        <AudioLines size={21} strokeWidth={1.8} />
                      </div>
                      <div className="track-meta">
                        <h3>{track.title}</h3>
                        <p>{track.artist}</p>
                      </div>
                      <span className="track-category">{track.category}</span>
                      <audio controls preload="none" src={audioUrls[track.id]} aria-label={`Ouvir ${track.title}, de ${track.artist}`} />
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon"><Headphones size={23} /></span>
                  <h3>{search || category !== "Todas" ? "Nenhuma faixa encontrada" : "O feed começa com você"}</h3>
                  <p>{search || category !== "Todas" ? "Tente outra busca ou categoria." : "Envie uma música e ela aparece aqui depois da aprovação."}</p>
                  {!search && category === "Todas" && (
                    <button className="text-action" onClick={() => user ? setModal("submit") : setModal("auth")}>
                      <Plus size={16} /> Enviar a primeira faixa
                    </button>
                  )}
                </div>
              )}
            </section>

            <GoogleAd />

            {user && ownTracks.length > 0 && (
              <section className="submissions-section">
                <div className="section-heading">
                  <div className="section-title"><Clock3 size={17} /><h2>Suas submissões</h2><span>{ownTracks.length}</span></div>
                  <span className="section-note">ACOMPANHE A MODERAÇÃO</span>
                </div>
                <div className="submission-list">
                  {ownTracks.slice(0, 5).map((track) => (
                    <div className="submission-row" key={track.id}>
                      <div><strong>{track.title}</strong><span>{track.artist}</span></div>
                      <span className={`status-label status-${track.status}`}>
                        {track.status === "approved" ? <BadgeCheck size={14} /> : <Clock3 size={14} />}
                        {getStatusLabel(track.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
        </>

        <footer className="page-footer">
          <a className="footer-brand" href="#feed"><AudioLines size={16} /> Canta Igreja</a>
          <span>Feito para quem vive de música.</span>
          <nav className="legal-footer-links" aria-label="Informações do site">
            <Link href="/sobre">Sobre</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/termos">Termos</Link>
            <Link href="/contato">Contato</Link>
          </nav>
          <span className="footer-live"><span className="live-dot" /> COMUNIDADE ABERTA</span>
        </footer>
      </div>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar"><X size={19} /></button>
            {modal === "auth" ? (
              <>
                <span className="modal-symbol"><LogIn size={21} /></span>
                <p className="modal-kicker">SUA CONTA ONDA</p>
                <h2 id="modal-title">{authMode === "login" ? "Entre para continuar" : "Crie sua conta"}</h2>
                <p className="modal-copy">Envie faixas e acompanhe cada etapa da aprovação.</p>
                <div className="auth-tabs" role="tablist" aria-label="Acesso">
                  <button role="tab" aria-selected={authMode === "login"} className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setAuthError(""); setAuthMessage(""); }}>Entrar</button>
                  <button role="tab" aria-selected={authMode === "signup"} className={authMode === "signup" ? "active" : ""} onClick={() => { setAuthMode("signup"); setAuthError(""); setAuthMessage(""); }}>Criar conta</button>
                </div>
                <form className="modal-form" onSubmit={(event) => void handleAuth(event)}>
                  {authMode === "signup" && <label>Nome<input autoComplete="name" type="text" required maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Como podemos chamar você?" /></label>}
                  <label>Email<input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" /></label>
                  <label>Senha<input autoComplete={authMode === "login" ? "current-password" : "new-password"} type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" /></label>
                  {authError && <p className="form-error" role="alert">{authError}</p>}
                  {authMessage && <p className="form-success" role="status">{authMessage}</p>}
                  <button className="form-submit" type="submit">{authMode === "login" ? "Entrar" : "Criar conta"}<LogIn size={17} /></button>
                </form>
                <p className="secure-note"><ShieldCheck size={14} /> Acesso protegido pelo Supabase Auth</p>
              </>
            ) : (
              <>
                <span className="modal-symbol modal-symbol-lime"><Upload size={21} /></span>
                <p className="modal-kicker">NOVO ENVIO <span>01 / 02</span></p>
                <h2 id="modal-title">Compartilhe seu som</h2>
                <p className="modal-copy">A faixa entra no feed depois de aprovada pela equipe.</p>
                <form className="modal-form" onSubmit={(event) => void handleSubmitTrack(event)}>
                  <label>Nome da música<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Depois da Chuva" /></label>
                  <label>Nome do artista<input required maxLength={120} value={artist} onChange={(event) => setArtist(event.target.value)} placeholder="Seu nome artístico" /></label>
                  <label>Categoria<select value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  <label className="file-field">
                    <span>Arquivo de áudio <small>MP3, WAV, OGG, M4A ou FLAC · até 50 MB</small></span>
                    <input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/flac,audio/aac,audio/webm" required onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)} />
                    <span className="file-picker"><Upload size={17} />{audioFile ? audioFile.name : "Escolher arquivo"}</span>
                  </label>
                  {feedError && <p className="form-error" role="alert">{feedError}</p>}
                  <button className="form-submit" type="submit" disabled={submitting || !audioFile}>
                    {submitting ? <><LoaderCircle className="spin" size={17} /> Enviando...</> : <>Enviar para aprovação <ArrowUpRight size={17} /></>}
                  </button>
                </form>
                <p className="secure-note"><ShieldCheck size={14} /> O áudio fica privado até ser aprovado</p>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
