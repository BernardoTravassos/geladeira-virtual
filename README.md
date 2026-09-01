# Geladeira Virtual

## Estrutura do projeto

```
geladeira-virtual/
├── backend/     → API em Node.js + TypeScript + Express + PostgreSQL
├── mobile/      → App em React Native (Expo) + TypeScript
└── docker-compose.yml
```

## Como rodar o backend + banco de dados

1. Copie o arquivo de variáveis de ambiente:
   ```
   cp backend/.env.example backend/.env
   ```
2. Suba os containers (API + PostgreSQL):
   ```
   docker compose up --build
   ```
3. Confirme que está no ar acessando: `http://localhost:3333/health`
4. Rode o schema do banco (cria as tabelas) — com o container do banco no ar:
   ```
   docker exec -i geladeira-db psql -U geladeira -d geladeira_virtual < backend/src/database/schema.sql
   ```

## Como rodar o app mobile

1. Entre na pasta do app:
   ```
   cd mobile
   npm install
   ```
2. Inicie o Expo:
   ```
   npm start
   ```
3. Escaneie o QR code com o app **Expo Go** no seu celular (Android ou iPhone) para ver o app rodando de verdade no seu aparelho.

## Próximos passos (código)

- [ ] Implementar `POST /auth/register` e `POST /auth/login` (backend/src/routes/auth.routes.ts)
- [ ] Implementar `POST /profile` (backend/src/routes/profile.routes.ts)
- [ ] Implementar `POST /meals/generate`, integrando com a API da IA (backend/src/routes/meal.routes.ts)
- [ ] Construir as telas de verdade (login, wizard, home) — ver mockup visual enviado no chat
