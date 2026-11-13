# Hospedagem gratuita para o piloto (Neon + Render)

O app fala com a API; a API fala com o banco. Nada disso depende do seu PC.

## 1. Banco — Neon (grátis, sem cartão)
1. Crie conta em https://neon.tech e um projeto (região: South America/São Paulo, se houver).
2. Copie a **connection string** (`postgresql://usuario:senha@ep-xxxx.neon.tech/neondb?sslmode=require`).
   Guarde — é a `DATABASE_URL`.

## 2. API — Render (grátis)
1. Suba o repositório no GitHub (já está) e crie em https://render.com um **Web Service**
   → *Docker*, *Root Directory* `backend-dotnet`, plano **Free**.
2. Variáveis de ambiente:
   | Nome | Valor |
   |---|---|
   | `DATABASE_URL` | a string do Neon |
   | `JWT_SECRET` | texto aleatório com 32+ caracteres |
   | `ASPNETCORE_ENVIRONMENT` | `Production` |
   | `TRUST_PROXY` | `true` (a Render fica na frente da API) |
   | `ANTHROPIC_API_KEY` | opcional — só se a IA da foto for real |
   | `SMTP_*` | opcional — recuperação de senha (exige domínio verificado no Resend) |
3. Aplique as migrations uma vez, do seu PC, apontando para o Neon:
   ```bash
   cd backend-dotnet
   DATABASE_URL='<string do Neon>' JWT_SECRET='<qualquer 32+ caracteres>' dotnet run -- --migrar
   # além de criar as tabelas, carrega o catálogo de alimentos e vitaminas
   # (backend-dotnet/Dados/Sementes/alimentos.json). Pode repetir sem problema.
   ```
4. Teste: `https://SEU-APP.onrender.com/health`.
   No plano grátis a API **dorme após ~15 min parada**; o primeiro acesso demora ~1 min.

## 3. App
1. Em `mobile/app.json`, em `expo`, acrescente `"extra": { "apiUrl": "https://SEU-APP.onrender.com" }`.
2. Em `mobile/src/config/dev.ts`, ponha **false**: `MODO_DEMO`, `FORCAR_PAYWALL`,
   `SIMULAR_IA_PRATO` (ou deixe true se a IA ainda for simulada), `SIMULAR_SMARTWATCH`.
3. Gere o APK: `eas build --profile preview --platform android`.

## Antes de convidar pessoas
Dados de saúde são sensíveis (LGPD): tenha um termo de consentimento e um jeito de apagar a conta.
