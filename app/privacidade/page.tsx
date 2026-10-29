import type { Metadata } from "next";
import LayoutInformativo from "../components/layout-informativo";

export const metadata: Metadata = {
  title: "Política de Privacidade | Tirando de Ouvido",
  description: "Saiba como o Tirando de Ouvido utiliza dados, cookies, analytics e anúncios.",
};

export default function PrivacyPage() {
  return (
    <LayoutInformativo
      categoria="SEUS DADOS"
      titulo="Política de privacidade"
      descricao="Esta página explica quais informações são usadas para operar o Tirando de Ouvido, incluindo cookies, analytics e publicidade."
    >
      <p className="info-updated">Última atualização: 29 de outubro de 2026</p>
      <section>
        <h2>Informações que usamos</h2>
        <p>Ao criar uma conta, usamos seu nome e email para identificar seu perfil e autenticar seu acesso. Quando você envia uma música, armazenamos o título, o nome do artista, a categoria, o arquivo de áudio e o estado da análise.</p>
        <p>Se você enviar uma sugestão de melhoria, armazenamos o título e o texto da sugestão vinculados à sua conta para que a equipe possa analisá-la. Essas sugestões não são exibidas publicamente.</p>
        <p>Usamos Supabase para autenticação, banco de dados e armazenamento dos áudios. As faixas pendentes não são disponibilizadas publicamente; as aprovadas podem ser ouvidas no feed.</p>
      </section>
      <section>
        <h2>Cookies, analytics e anúncios</h2>
        <p>Cookies e armazenamento local podem ser usados para manter sua sessão de login. Se configurado, o Google Analytics coleta informações de navegação para medir o uso do site. O Google AdSense pode usar cookies ou tecnologias semelhantes para exibir e medir anúncios.</p>
        <p>Esses serviços são operados pelo Google e podem tratar dados conforme as próprias políticas. Você pode consultar as configurações de privacidade e anúncios da sua Conta Google e gerenciar ou bloquear cookies nas configurações do navegador. Bloquear cookies essenciais pode afetar o login.</p>
        <p>Analytics e anúncios só são carregados quando os respectivos IDs estão configurados. O site não vende dados pessoais.</p>
      </section>
      <section>
        <h2>Uso, retenção e seus direitos</h2>
        <p>Usamos as informações para fornecer o feed, autenticar usuários, moderar envios, proteger o serviço e, quando ativados, medir audiência e exibir anúncios. Mantemos os dados enquanto a conta ou a faixa permanecer ativa, ou pelo período necessário para atender obrigações legais e de segurança.</p>
        <p>Você pode solicitar acesso, correção ou exclusão dos seus dados e da sua conta. Para isso, entre em contato pela página de contato. Pedidos podem exigir confirmação de identidade.</p>
      </section>
      <section>
        <h2>Proteção e alterações</h2>
        <p>Aplicamos controles de acesso para limitar o acesso a contas, envios pendentes e arquivos. Nenhum serviço conectado à internet pode garantir segurança absoluta. Podemos atualizar esta política e indicaremos a data da revisão nesta página.</p>
      </section>
      <section>
        <h2>Visitantes online</h2>
        <p>Para mostrar uma estimativa de visitantes conectados, o site cria um identificador aleatório no armazenamento local do navegador e informa a presença ao Supabase Realtime enquanto a conexão estiver ativa. Esse identificador não contém seu nome ou email; várias abas do mesmo navegador são contadas como um visitante. Você pode removê-lo limpando os dados do site no navegador.</p>
      </section>
      <section>
        <h2>Contagem de visitas</h2>
        <p>Para exibir estatísticas de audiência no painel administrativo, registramos o identificador aleatório do navegador e a data da visita, uma vez por dia. Os dados são usados para calcular visitantes únicos por dia e no período de 30 dias; não armazenamos páginas visitadas nem vinculamos esse registro ao seu nome ou email. Os registros são mantidos no banco de dados para compor o histórico. Limpar o armazenamento local cria um novo identificador para visitas futuras.</p>
      </section>
    </LayoutInformativo>
  );
}