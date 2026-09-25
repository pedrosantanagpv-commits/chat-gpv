# Chat GPV — V2 Firebase

A V2 substitui os dados simulados da V1 por Firebase Authentication + Cloud Firestore.

## O que já funciona

- atendimento criado pelo associado;
- sessão anônima do associado;
- fila em tempo real;
- login real da equipe por e-mail/senha;
- perfil da equipe em `usuarios/{uid}`;
- atendente assume atendimento com transação;
- conversa em tempo real;
- transferência de setor;
- finalização;
- painel administrativo com dados do Firestore;
- regras de segurança incluídas em `firestore.rules`.

## 1. Variáveis de ambiente

O projeto espera estas variáveis, já configuráveis na Vercel:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 2. Authentication

No Firebase Console, habilite:

- Email/Password
- Anonymous (Anônimo)

Email/Password é usado pela equipe. Anonymous cria uma identidade temporária para cada visitante do Chat GPV sem expor o banco publicamente.

## 3. Publicar as regras do Firestore

Firebase Console > Firestore Database > Regras.

Substitua o conteúdo atual pelo conteúdo de `firestore.rules` e clique em Publicar.

## 4. Criar o primeiro administrador

### Authentication

Firebase Console > Authentication > Users > Add user.

Crie o usuário interno com e-mail e senha e copie o UID gerado.

### Firestore

Crie a coleção `usuarios` e use o UID do Authentication como ID do documento.

Campos:

| Campo | Tipo | Exemplo |
|---|---|---|
| `nome` | string | `Pedro` |
| `email` | string | `email@gpv.com.br` |
| `role` | string | `admin` |
| `setor` | string | `Todos` |
| `ativo` | boolean | `true` |

Os perfis aceitos são `admin`, `supervisor` e `agent`.

Para um atendente comum, o campo `setor` precisa ser exatamente um dos nomes usados no Chat, por exemplo `Financeiro`, `Eventos`, `Rastreamento`, `Cadastro`, `Assistência 24h` ou `Outros assuntos`.

## 5. Rotas

- `/` — associado
- `/equipe` — equipe interna
- `/admin` — administração (somente `role: admin`)

## 6. Atualizar o GitHub / Vercel

Substitua os arquivos da V1 pelos arquivos desta V2 no repositório e faça commit/push. A Vercel fará o novo deploy automaticamente.

## Importante antes de divulgar publicamente

Esta V2 é para validação funcional. Antes de colocar o balão no site oficial, ainda vamos configurar App Check, proteção antiabuso/rate limit, política de retenção, logs/auditoria e só depois anexos/Storage.

## Hotfix 0.2.1

- Remove `scrollIntoView({ behavior: 'smooth' })` executado a cada nova mensagem.
- Auto-scroll agora usa o próprio contêiner (`scrollTop = scrollHeight`) dentro de `requestAnimationFrame`.
- Adicionadas barreiras `error.jsx` e `global-error.jsx` para impedir que uma exceção de renderização caia diretamente na tela genérica do Next.js.
- Nenhuma alteração nas coleções, regras do Firestore ou variáveis de ambiente.
