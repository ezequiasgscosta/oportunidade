import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import SiteInfoLayout from "../components/site-info-layout";

export const metadata: Metadata = {
  title: "Contato | Canta Igreja",
  description: "Entre em contato com a equipe do Canta Igreja.",
};

export default function ContactPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <SiteInfoLayout
      eyebrow="FALE COM A GENTE"
      title="Contato"
      intro="Dúvidas sobre a comunidade, uma música enviada, privacidade ou anúncios? A equipe pode ajudar."
    >
      <section className="contact-card">
        <span className="contact-icon"><MessageCircle size={21} /></span>
        <div>
          <h2>Atendimento</h2>
          {contactEmail ? (
            <a className="contact-email" href={`mailto:${contactEmail}`}><Mail size={16} /> {contactEmail}</a>
          ) : (
            <p>O canal de atendimento ainda está sendo configurado. Volte em breve para falar com a equipe.</p>
          )}
          <p>Ao escrever, informe o email da sua conta e explique como podemos ajudar. Não envie senhas ou códigos de acesso.</p>
        </div>
      </section>
      <section>
        <h2>Remoção de conteúdo</h2>
        <p>Se você representa alguém com direitos sobre uma música publicada e acredita que ela deve ser revisada, entre em contato com o link da faixa e uma breve descrição do pedido.</p>
      </section>
      <section>
        <h2>Privacidade e dados</h2>
        <p>Para solicitações de acesso, correção ou exclusão de dados, use o canal de atendimento acima. Veja também nossa <a href="/privacidade">Política de Privacidade</a>.</p>
      </section>
    </SiteInfoLayout>
  );
}