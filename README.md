# NextAuth + Prisma + SQLite Starter

Feature inicial pronta com:

- Next.js (App Router)
- NextAuth com login por email e senha (Credentials)
- Prisma ORM + SQLite
- Super usuario admin
- UI minimalista em preto e branco (login + dashboard)

## Rodando localmente

```bash
npm install
npm run db:migrate -- --name init
npm run dev
```

Acesse `http://localhost:3000`.

Para alterar a porta via `.env`, defina:

```env
PORT=3000
```

Depois reinicie o servidor (`npm run dev` ou `npm run start`).

## Credenciais iniciais do super admin

Definidas em `./.env`:

- `ADMIN_EMAIL=admin@example.com`
- `ADMIN_PASSWORD=Admin@123456`

Voce pode trocar esses valores e rodar novamente:

```bash
npm run db:seed
```

## Scripts uteis

- `npm run db:generate` -> gera o client do Prisma
- `npm run db:migrate -- --name <nome>` -> cria/aplica migracao
- `npm run db:seed` -> cria/atualiza o super admin
- `npm run lint` -> valida regras de lint
- `npm run build` -> build de producao

## Bot WhatsApp integrado no webapp

Agora o sistema tambem suporta bot WhatsApp embutido no proprio Next.js (sem servico separado), com QR Code e status em tela:

- Tela: `/dashboard/admin/crm/canal-whatsapp`
- APIs internas:
  - `GET /api/internal/whatsapp/status`
  - `POST /api/internal/whatsapp/connect`
  - `POST /api/internal/whatsapp/send-test`

Variaveis recomendadas no `.env`:

```env
# Usa bot interno em vez de webhook externo
CRM_DELIVERY_MODE=INTERNAL_WHATSAPP_BOT

# Configuracao da sessao Baileys no processo do webapp
CRM_INTERNAL_WHATSAPP_SESSION_NAME=crm-whatsapp
CRM_INTERNAL_WHATSAPP_HEADLESS=false
CRM_BAILEYS_LOG_LEVEL=error
CRM_INTERNAL_WHATSAPP_MAX_RECONNECT_ATTEMPTS=3

# Segredo para endpoint interno de processamento de fila
INTERNAL_CRM_DISPATCH_SECRET=defina_um_segredo_forte
```

Se `CRM_DELIVERY_MODE` nao for definido como `INTERNAL_WHATSAPP_BOT`, o sistema continua usando o modo webhook (`CRM_DELIVERY_WEBHOOK_URL`).
