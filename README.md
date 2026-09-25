# Chat GPV — V1 demonstrativa

Primeira versão navegável da Central Digital de Atendimento GPV.

## O que já existe

- `/` — jornada pública do associado: identificação, escolha do setor e chat demonstrativo.
- `/equipe` — login demonstrativo e painel interno com fila, atendimento, transferência, mensagens e encerramento.
- `/admin` — visão administrativa com indicadores e equipe simulados.
- Layout responsivo com identidade amarela, preta e branca.
- Dados 100% simulados/local state. **Não usar dados reais nesta versão.**

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Publicar

1. Crie um repositório vazio no GitHub.
2. Envie todos os arquivos desta pasta para o repositório.
3. Importe o repositório na Vercel.
4. Framework preset: Next.js (normalmente detectado automaticamente).
5. Não é necessário configurar variáveis de ambiente nesta V1.

## Próxima etapa — Firebase

A próxima versão deverá substituir os dados simulados por:

- Firebase Authentication: login da equipe.
- Firestore: atendimentos, mensagens, setores, usuários e protocolos.
- Realtime Database: presença/digitando, se necessário.
- Cloud Storage: anexos, com limites e regras de segurança.
- App Check / proteção antiabuso.
- Regras de acesso por perfil e setor.

### Coleções previstas

```text
users
sectors
conversations
  └── {conversationId}
      └── messages
protocols / metadados quando necessário
```

## Importante

Esta é uma versão de interface e fluxo. O botão de anexos, login, indicadores e mensagens não têm backend real ainda. Não coloque CPF, telefone, documentos ou dados de associados reais até conectarmos autenticação e regras de segurança.
