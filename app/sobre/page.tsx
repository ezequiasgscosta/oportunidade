import type { Metadata } from "next";
import Link from "next/link";
import LayoutInformativo from "../components/layout-informativo";

export const metadata: Metadata = {
  title: "Sobre | Tirando de Ouvido",
  description: "Conheça o Tirando de Ouvido e a comunidade que compartilha louvores.",
};

export default function AboutPage() {
  return (
    <LayoutInformativo
      categoria="NOSSA COMUNIDADE"
      titulo="Louvores que aproximam."
      descricao="Tirando de Ouvido é um espaço para descobrir, ouvir e compartilhar música cristã com outras pessoas."
    >
      <section>
        <h2>Um lugar para compartilhar música</h2>
        <p>O feed reúne hinos da Harpa, hinos avulsos e covers enviados pela comunidade. Cada faixa passa por aprovação antes de aparecer publicamente.</p>
      </section>
      <section>
        <h2>Feito em comunidade</h2>
        <p>Quem participa pode ouvir as faixas aprovadas e, com uma conta, enviar suas próprias gravações. Respeito, cuidado e crédito a quem compõe e interpreta são parte essencial desse espaço.</p>
      </section>
      <section className="info-callout">
        <h2>Faça parte</h2>
        <p>Explore o feed, compartilhe uma música que tenha autorização para publicar ou fale com a equipe pela página de contato.</p>
        <Link className="info-action" href="/">Conhecer o feed</Link>
      </section>
    </LayoutInformativo>
  );
}