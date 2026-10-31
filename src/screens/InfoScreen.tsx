import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton, Banner } from "../components";
import type { InfoPage } from "../lib/types";
import { colors } from "../theme";

type Props = {
  page: InfoPage;
  onHome: () => void;
  onNavigate: (page: InfoPage) => void;
};

type InfoSection = { title: string; paragraphs: string[] };

const pages: Record<InfoPage, { eyebrow: string; title: string; description: string; updated?: string; sections: InfoSection[] }> = {
  about: {
    eyebrow: "NOSSA COMUNIDADE",
    title: "Louvores que aproximam.",
    description: "Tirando de Ouvido é um espaço para descobrir, ouvir e compartilhar música cristã com outras pessoas.",
    sections: [
      {
        title: "Um lugar para compartilhar música",
        paragraphs: ["O feed reúne hinos da Harpa, hinos avulsos e covers enviados pela comunidade. Cada faixa passa por aprovação antes de aparecer publicamente."],
      },
      {
        title: "Feito em comunidade",
        paragraphs: ["Quem participa pode ouvir as faixas aprovadas e, com uma conta, enviar suas próprias gravações. Respeito, cuidado e crédito a quem compõe e interpreta são parte essencial desse espaço."],
      },
      {
        title: "Faça parte",
        paragraphs: ["Explore o feed, compartilhe uma música que tenha autorização para publicar ou fale com a equipe pela página de contato."],
      },
    ],
  },
  privacy: {
    eyebrow: "SEUS DADOS",
    title: "Política de privacidade",
    description: "Esta página explica quais informações são usadas para operar o Tirando de Ouvido, incluindo cookies, analytics e publicidade.",
    updated: "Última atualização: 29 de outubro de 2026",
    sections: [
      {
        title: "Informações que usamos",
        paragraphs: [
          "Ao criar uma conta, usamos seu nome e email para identificar seu perfil e autenticar seu acesso. Quando você envia uma música, armazenamos o título, o nome do artista, a categoria, o arquivo de áudio e o estado da análise.",
          "Se você enviar uma sugestão de melhoria, armazenamos o título e o texto da sugestão vinculados à sua conta para que a equipe possa analisá-la. Essas sugestões não são exibidas publicamente.",
          "Usamos Supabase para autenticação, banco de dados e armazenamento dos áudios. As faixas pendentes não são disponibilizadas publicamente; as aprovadas podem ser ouvidas no feed.",
        ],
      },
      {
        title: "Cookies, analytics e anúncios",
        paragraphs: [
          "No app, o Supabase mantém sua sessão de login no armazenamento local do dispositivo. A versão web pode usar cookies e armazenamento local para manter a sessão. O site pode carregar Google Analytics e AdSense quando esses serviços estiverem configurados.",
          "Esses serviços são operados pelo Google e podem tratar dados conforme as próprias políticas. O site não vende dados pessoais.",
          "O app não exibe anúncios nem carrega analytics do Google.",
        ],
      },
      {
        title: "Uso, retenção e seus direitos",
        paragraphs: [
          "Usamos as informações para fornecer o feed, autenticar usuários, moderar envios, proteger o serviço e, quando ativados, medir audiência e exibir anúncios. Mantemos os dados enquanto a conta ou a faixa permanecer ativa, ou pelo período necessário para atender obrigações legais e de segurança.",
          "Você pode solicitar acesso, correção ou exclusão dos seus dados e da sua conta. Para isso, entre em contato pela equipe de atendimento.",
        ],
      },
      {
        title: "Proteção e alterações",
        paragraphs: [
          "Aplicamos controles de acesso para limitar o acesso a contas, envios pendentes e arquivos. Nenhum serviço conectado à internet pode garantir segurança absoluta. Podemos atualizar esta política e indicaremos a data da revisão nesta página.",
        ],
      },
      {
        title: "Visitantes online",
        paragraphs: [
          "Para mostrar uma estimativa de visitantes conectados, o app cria um identificador aleatório no armazenamento local e informa a presença ao Supabase Realtime enquanto a conexão estiver ativa. Esse identificador não contém seu nome ou email; várias instâncias do mesmo aplicativo podem contar como um visitante.",
          "Para estatísticas de audiência no painel administrativo, registramos o identificador aleatório do dispositivo e a data da visita, uma vez por dia. Esses dados não são vinculados ao seu nome ou email.",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "COMBINADOS DA COMUNIDADE",
    title: "Termos de uso",
    description: "Ao navegar ou criar uma conta no Tirando de Ouvido, você concorda com estas condições de uso.",
    updated: "Última atualização: 21 de outubro de 2026",
    sections: [
      {
        title: "Uso do app",
        paragraphs: ["Use o Tirando de Ouvido de forma legal, respeitosa e sem prejudicar outras pessoas ou a disponibilidade do serviço. Você é responsável por manter a segurança das credenciais da sua conta e pelas atividades realizadas nela."],
      },
      {
        title: "Envio de músicas e direitos autorais",
        paragraphs: [
          "Ao enviar uma gravação, você confirma que tem os direitos ou as autorizações necessárias para disponibilizar o áudio e as informações fornecidas. O envio concede ao Tirando de Ouvido permissão não exclusiva para armazenar, analisar, reproduzir e disponibilizar a faixa dentro do serviço.",
          "O envio não transfere a propriedade da música. Não envie material que viole direitos autorais, direitos de imagem, privacidade ou outras leis. A equipe pode recusar ou remover conteúdo quando necessário.",
        ],
      },
      {
        title: "Moderação e disponibilidade",
        paragraphs: ["As músicas são analisadas antes de entrar no feed. Uma aprovação não significa endosso da equipe. O serviço pode ser alterado, suspenso ou encerrado para manutenção, segurança ou outros motivos operacionais."],
      },
      {
        title: "Contas e encerramento",
        paragraphs: ["Podemos restringir contas ou remover conteúdo que viole estes termos ou prejudique a comunidade. Você pode solicitar o encerramento da conta e a remoção dos dados pela equipe de atendimento, observadas as obrigações legais aplicáveis."],
      },
      {
        title: "Serviços externos",
        paragraphs: ["O app usa Supabase para autenticação, banco de dados e armazenamento de áudios. O uso desses serviços também está sujeito às políticas do fornecedor. Consulte a política de privacidade para detalhes sobre dados."],
      },
    ],
  },
  contact: {
    eyebrow: "FALE COM A GENTE",
    title: "Contato",
    description: "Dúvidas sobre a comunidade, uma música enviada ou privacidade? A equipe pode ajudar.",
    sections: [
      {
        title: "Atendimento",
        paragraphs: ["Ao escrever, informe o email da sua conta e explique como podemos ajudar. Não envie senhas ou códigos de acesso."],
      },
      {
        title: "Remoção de conteúdo",
        paragraphs: ["Se você representa alguém com direitos sobre uma música publicada e acredita que ela deve ser revisada, entre em contato com o link da faixa e uma breve descrição do pedido."],
      },
      {
        title: "Privacidade e dados",
        paragraphs: ["Para solicitações de acesso, correção ou exclusão de dados, use o canal de atendimento. Nenhuma senha ou código de autenticação deve ser enviado por email."],
      },
    ],
  },
};

export default function InfoScreen({ page, onHome, onNavigate }: Props) {
  const [contactError, setContactError] = useState("");
  const content = pages[page];
  const contactEmail = process.env.EXPO_PUBLIC_CONTACT_EMAIL?.trim();

  async function openContactEmail() {
    if (!contactEmail) return;
    try {
      await Linking.openURL(`mailto:${contactEmail}`);
      setContactError("");
    } catch (error) {
      console.error("Falha ao abrir o aplicativo de email.", error);
      setContactError("Não foi possível abrir o aplicativo de email neste dispositivo.");
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.brand}>♫  Tirando de Ouvido</Text>
        <AppButton label="Voltar ao feed" onPress={onHome} variant="secondary" />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>●  {content.eyebrow}</Text>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.description}>{content.description}</Text>
        {content.updated ? <Text style={styles.updated}>{content.updated}</Text> : null}
        <View style={styles.sections}>
          {content.sections.map((section) => (
            <View key={section.title} style={styles.card}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.paragraphs.map((paragraph) => (
                <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>
              ))}
              {page === "about" && section.title === "Faça parte" ? (
                <AppButton label="Conhecer o feed" onPress={onHome} />
              ) : null}
              {page === "contact" && section.title === "Atendimento" ? (
                contactEmail ? (
                  <AppButton label={contactEmail} onPress={() => void openContactEmail()} variant="secondary" />
                ) : (
                  <Text style={styles.paragraph}>O canal de atendimento ainda está sendo configurado. Volte em breve.</Text>
                )
              ) : null}
            </View>
          ))}
          {contactError ? <Banner>{contactError}</Banner> : null}
        </View>
        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            {infoLinks.map(([target, label]) => (
              <Text key={target} onPress={() => onNavigate(target)} style={styles.footerLink}>{label}</Text>
            ))}
          </View>
          <Text style={styles.footerNote}>Uma comunidade de louvor.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

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
    gap: 12,
  },
  brand: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "800" },
  content: { padding: 20, paddingBottom: 44, gap: 16 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -0.5 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  updated: { alignSelf: "flex-start", paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, color: colors.muted, fontSize: 11 },
  sections: { gap: 12, marginTop: 10 },
  card: { padding: 17, gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.card },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  paragraph: { color: "#C1CBD6", fontSize: 13, lineHeight: 21 },
  footer: { marginTop: 15, alignItems: "center", gap: 12 },
  footerLinks: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 18 },
  footerLink: { color: colors.primary, fontSize: 12 },
  footerNote: { color: colors.muted, fontSize: 12, textAlign: "center" },
});

const infoLinks: [InfoPage, string][] = [
  ["about", "Sobre"],
  ["privacy", "Privacidade"],
  ["terms", "Termos"],
  ["contact", "Contato"],
];
