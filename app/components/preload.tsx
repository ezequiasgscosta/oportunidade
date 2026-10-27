"use client";

import { useSyncExternalStore } from "react";
import "../preLoad/preLoad.css";

const alturasBarras = [
  4, 8, 5, 12, 20, 35, 48, 30, 18, 10,
  24, 45, 65, 90, 58, 35, 20, 42, 28, 15,
  32, 18, 8, 5, 12, 24, 40, 55, 35, 20,
  12, 30, 50, 75, 95, 60, 38, 22, 12, 7,
  15, 25, 18, 10, 6, 4,
];

type PreLoadProps = {
  isLoading?: boolean;
};

function subscribeToPageLoad(onPageLoad: () => void) {
  if (document.readyState === "complete") return () => {};

  window.addEventListener("load", onPageLoad, { once: true });
  return () => window.removeEventListener("load", onPageLoad);
}

function isPageLoaded() {
  return document.readyState === "complete";
}

function isPageLoadingOnServer() {
  return false;
}

export default function PreLoad({ isLoading = true }: PreLoadProps) {
  const pageLoaded = useSyncExternalStore(
    subscribeToPageLoad,
    isPageLoaded,
    isPageLoadingOnServer,
  );

  if (!isLoading && pageLoaded) return null;

  return (
    <div className="tela-carregamento" role="status" aria-label="Carregando a página">
      <div className="conteudo-carregamento">
        <svg
          viewBox="0 0 100 100"
          className="desenho-orelha"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            className="contorno-orelha"
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
              className="barra-equalizador"
              x1={63 + indice * 7}
              y1={50 - altura / 2}
              x2={63 + indice * 7}
              y2={50 + altura / 2}
              style={{ animationDelay: `${indice * 0.12}s` }}
            />
          ))}
        </svg>

        <h1 className="titulo-aplicativo">
          <span className="titulo-linha-branca">Tirando de</span>
          <span className="titulo-linha-laranja">Ouvido</span>
        </h1>

        <div className="frases-apresentacao" aria-hidden="true">
          <p className="frase frase-primeira">treine seu ouvido.</p>
          <p className="frase frase-segunda">conquiste sua liberdade.</p>
        </div>
      </div>

      <div className="onda-sonora" aria-hidden="true">
        {alturasBarras.map((altura, indice) => (
          <div
            key={indice}
            className="onda-barra"
            style={{
              height: `${altura}%`,
              animationDelay: `${indice * 0.045}s`,
              opacity: 0.35 + (altura / 100) * 0.65,
            }}
          />
        ))}
      </div>
    </div>
  );
}
