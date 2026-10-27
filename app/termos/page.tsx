import type { Metadata } from "next";
import LayoutInformativo from "../components/layout-informativo";

export const metadata: Metadata = {
  title: "Termos de uso | Canta Igreja",
  description: "Condições de uso e envio de músicas ao Canta Igreja.",
};

export default function TermsPage() {
  return (
    <LayoutInformativo
      categoria="COMBINADOS DA COMUNIDADE"
      titulo="Termos de uso"
      descricao="Ao navegar ou criar uma conta no Canta Igreja, você concorda com estas condições de uso."
    >
      <p className="info-updated">Última atualização: 21 de outubro de 2026</p>
      <section>
        <h2>Uso do site</h2>
        <p>Use o Canta Igreja de forma legal, respeitosa e sem prejudicar outras pessoas ou a disponibilidade do serviço. Você é responsável por manter a segurança das credenciais da sua conta e pelas atividades realizadas nela.</p>
      </section>
      <section>
        <h2>Envio de músicas e direitos autorais</h2>
        <p>Ao enviar uma gravação, você confirma que tem os direitos ou as autorizações necessárias para disponibilizar o áudio e as informações fornecidas. O envio concede ao Canta Igreja permissão não exclusiva para armazenar, analisar, reproduzir e disponibilizar a faixa dentro do serviço.</p>
        <p>O envio não transfere a propriedade da música. Não envie material que viole direitos autorais, direitos de imagem, privacidade ou outras leis. A equipe pode recusar ou remover conteúdo quando necessário.</p>
      </section>
      <section>
        <h2>Moderação e disponibilidade</h2>
        <p>As músicas são analisadas antes de entrar no feed. Uma aprovação não significa endosso da equipe. O serviço pode ser alterado, suspenso ou encerrado para manutenção, segurança ou outros motivos operacionais.</p>
      </section>
      <section>
        <h2>Contas e encerramento</h2>
        <p>Podemos restringir contas ou remover conteúdo que viole estes termos ou prejudique a comunidade. Você pode solicitar o encerramento da conta e a remoção dos dados pela página de contato, observadas as obrigações legais aplicáveis.</p>
      </section>
      <section>
        <h2>Publicidade e serviços externos</h2>
        <p>O site pode exibir anúncios e usar serviços de terceiros, incluindo Google Analytics e Google AdSense. O uso desses serviços também está sujeito às políticas dos respectivos fornecedores. Consulte a política de privacidade para detalhes sobre cookies e dados.</p>
      </section>
    </LayoutInformativo>
  );
}