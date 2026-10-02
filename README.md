# Geladeira Virtual

## Estrutura do projeto

```
geladeira-virtual/
├── backend-dotnet/  → API em C# (.NET 10) + ASP.NET Core + EF Core + PostgreSQL
├── mobile/          → App em React Native (Expo) + TypeScript
└── docker-compose.yml
```

## Como rodar o backend + banco de dados

1. Copie o arquivo de variáveis de ambiente e preencha os segredos:
   ```
   cp backend-dotnet/.env.example backend-dotnet/.env
   ```
   Gere o `JWT_SECRET` com:
   ```
   openssl rand -hex 64
   ```
   A API **se recusa a subir** com o segredo ausente, curto demais ou igual ao
   valor de exemplo — e diz por escrito o que está faltando.

2. Suba os containers (API + PostgreSQL):
   ```
   docker compose up -d --build
   ```

3. Aplique as migrations (cria ou atualiza as tabelas):
   ```
   docker compose run --rm api --migrar
   ```

4. Confirme que está no ar: `http://localhost:3333/health`

> ⚠️ Depois de editar o `.env`, recrie o container — o `env_file` só é lido na
> criação, não no restart:
> ```
> docker compose up -d --force-recreate api
> ```

## Comandos de diagnóstico

```
docker compose run --rm api --verificar-banco          # o que o EF consegue ler
docker compose run --rm api --migrar                   # aplica migrations pendentes
docker compose run --rm api --testar-email seu@email   # prova o envio de e-mail
docker compose logs -f api                             # log em tempo real
```

## Como rodar o app mobile

1. Entre na pasta do app e instale:
   ```
   cd mobile && npm install
   ```
2. Ajuste o endereço da API em `mobile/src/services/api.ts` (`BASE_URL`) para o
   IP desta máquina na sua rede — `hostname -I` mostra qual é.
3. Inicie o Expo:
   ```
   npm start
   ```
4. Escaneie o QR code com o app **Expo Go**.

> Se o celular não conectar, verifique o firewall: `sudo ufw allow 3333/tcp`.
> O ufw descarta pacotes em silêncio, e o sintoma é o app esperando sem erro.

### Chaves de desenvolvimento

`mobile/src/config/dev.ts` tem chaves para testar telas difíceis de provocar.
**Todas devem ficar `false` num build de verdade.**

## Banco de dados

O schema é gerenciado por **migrations do EF Core** (`backend-dotnet/Dados/Migrations/`).
Para mudar o banco, altere as entidades e gere uma migration:

```
cd backend-dotnet
DATABASE_URL=postgresql://geladeira:geladeira@localhost:5433/geladeira_virtual \
JWT_SECRET=$(openssl rand -hex 64) \
dotnet ef migrations add NomeDaMudanca --output-dir Dados/Migrations
```

Depois aplique com `docker compose run --rm api --migrar`.

## O que já está pronto

- [x] `POST /auth/register` e `POST /auth/login`
- [x] `POST /auth/forgot-password` e `POST /auth/reset-password` (código por e-mail)
- [x] `GET /profile` e `POST /profile`
- [x] Autenticação JWT com invalidação de sessão ao trocar a senha
- [x] Limite de tentativas, validação de entrada, normalização de e-mail
- [ ] `POST /meals/generate` — integrar com a API da Anthropic
- [ ] Limite diário do plano gratuito + integração de assinatura nas lojas
