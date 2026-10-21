import Link from "next/link";
import { AudioLines, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type SiteInfoLayoutProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

const infoLinks = [
  { href: "/sobre", label: "Sobre" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos", label: "Termos" },
  { href: "/contato", label: "Contato" },
];

export default function SiteInfoLayout({ eyebrow, title, intro, children }: SiteInfoLayoutProps) {
  return (
    <div className="app-shell info-shell">
      <header className="topbar info-topbar">
        <Link className="brand" href="/" aria-label="Canta Igreja, página inicial">
          <span className="brand-mark"><AudioLines size={21} strokeWidth={2.4} /></span>
          <span className="brand-word">Canta <span>Igreja</span></span>
        </Link>
        <Link className="info-home-link" href="/"><ArrowLeft size={15} /> Voltar ao feed</Link>
      </header>

      <main className="info-content">
        <div className="eyebrow"><span className="live-dot" /> {eyebrow}</div>
        <h1>{title}</h1>
        <p className="info-intro">{intro}</p>
        <div className="info-body">{children}</div>
      </main>

      <footer className="info-footer">
        <Link className="footer-brand" href="/"><AudioLines size={15} /> Canta Igreja</Link>
        <nav aria-label="Informações do site">
          {infoLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
        </nav>
        <span>Uma comunidade de louvor.</span>
      </footer>
    </div>
  );
}