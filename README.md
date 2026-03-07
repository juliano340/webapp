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
