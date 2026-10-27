"use client";

import "./cabecalho.css";
import { LogIn, LogOut, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";

type PropriedadesCabecalho = {
  temAcessoAdmin: boolean;
  usuarioAutenticado: boolean;
  nomeUsuario?: string;
  aoEntrar: () => void;
  aoSair: () => Promise<void>;
  aoEnviarMusica: () => void;
};

export default function Cabecalho({
  temAcessoAdmin,
  usuarioAutenticado,
  nomeUsuario,
  aoEntrar,
  aoSair,
  aoEnviarMusica,
}: PropriedadesCabecalho) {
  return (
    <header className="cabecalho">
      <a className="marca" href="#feed" aria-label="Onda, início">
        <span className="icone-marca">
          <svg
            className="ouvido"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              className="ouvido-contorno"
              d="M58 44
                 C58 24 43 17 30 25
                 C14 35 20 53 27 64
                 C31 71 27 82 36 86
                 C46 91 54 80 54 70
                 M46 58
                 C37 52 33 43 39 36
                 C44 30 52 35 51 42"
            />
            {[42, 25, 52, 70, 48].map((altura, indice) => (
              <line
                key={indice}
                className="ouvido-equalizador"
                x1={63 + indice * 7}
                y1={50 - altura / 2}
                x2={63 + indice * 7}
                y2={50 + altura / 2}
              />
            ))}
          </svg>
        </span>
        <span className="nome-marca">tirando d<span className="destaque-marca">e Ouvido</span></span>
        <span className="descricao-marca">FEED DE MÚSICA</span>
      </a>
      <nav className="acoes-cabecalho" aria-label="Navegação principal">
        {temAcessoAdmin && (
          <Link className="link-menu" href="/admin">
            <ShieldCheck size={16} /> Admin
          </Link>
        )}
        {usuarioAutenticado ? (
          <>
            <span className="nome-usuario">{nomeUsuario}</span>
            <button className="botao-simples" onClick={() => void aoSair()} aria-label="Sair" title="Sair">
              <LogOut size={17} />
            </button>
          </>
        ) : (
          <button className="botao-simples botao-entrar" onClick={aoEntrar}>
            <LogIn size={16} /> Entrar
          </button>
        )}
        <button className="botao-enviar-musica" onClick={aoEnviarMusica}>
          <Plus size={17} strokeWidth={2.5} /> <span>Enviar música</span>
        </button>
      </nav>
    </header>
  );
}
