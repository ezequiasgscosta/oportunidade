## Canta Igreja

Feed comunitário de louvor feito com Next.js e Supabase. O feed reúne hinos da Harpa, hinos avulsos e covers; pessoas autenticadas podem enviar áudio para análise, e administradores moderam as faixas.

## Configuração

1. Instale as dependências com `npm install`.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local` (há um modelo em `.env.example`).
3. Autentique e vincule o CLI: `npx supabase login` e `npx supabase link --project-ref sysdcvioobmsrkogryzi`.
4. Aplique o esquema e as políticas: `npx supabase db push`.
5. Crie a conta de administrador na tela de acesso e confirme o email, se o projeto exigir confirmação.
6. No SQL Editor do Supabase, execute o conteúdo de `supabase/bootstrap-admin.sql` uma vez para conceder o papel administrativo à conta.
7. Inicie a aplicação com `npm run dev`.

O painel administrativo fica em `/admin` e reúne estatísticas, moderação das músicas e gerenciamento dos administradores. Só contas com o papel `admin` concedido no banco podem acessá-lo.

Os áudios ficam no bucket privado `music-audio`; o upload exige autenticação e cada faixa começa como `pending`. URLs assinadas e políticas RLS permitem ouvir somente faixas aprovadas, próprias ou acessadas pelo admin.

As páginas públicas `/sobre`, `/privacidade`, `/termos` e `/contato` explicam o projeto, as regras, o uso de cookies e os canais de atendimento. Configure `NEXT_PUBLIC_CONTACT_EMAIL` na Vercel para publicar o email de contato. O painel mostra uma estimativa de visitantes online via Supabase Realtime, usando um identificador aleatório local.

Confirme que Realtime está habilitado no projeto Supabase para publicar a presença dos visitantes.

## Google Analytics e AdSense

Copie os valores reais do Search Console, GA4 e AdSense para as variáveis correspondentes em `.env.local` (veja `.env.example`) e reinicie o servidor. A verificação do Search Console gera uma meta tag; o GA4 registra visualizações também nas navegações internas; o anúncio só aparece com publisher ID `ca-pub-...` e slot numérico válidos. O AdSense exige uma conta aprovada e pode levar tempo para servir anúncios.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
