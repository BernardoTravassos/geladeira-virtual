# Build em dois estágios: o SDK (grande) compila, e só o resultado vai para a
# imagem final, que roda sobre o runtime (bem menor).

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# O .csproj vem primeiro e sozinho: assim a camada do restore fica em cache e
# só refaz quando as dependências mudam, não a cada edição de código.
COPY GeladeiraVirtual.Api.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0

# O Npgsql procura a biblioteca GSSAPI (Kerberos) ao abrir conexão. Sem ela a
# conexão funciona, mas o log sai com uma linha "Error: libgssapi_krb5.so.2:
# cannot open shared object file" que não é erro de verdade — e log sujo faz
# perder tempo diagnosticando problema que não existe.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgssapi-krb5-2 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish ./

# Roda como usuário sem privilégios (as imagens oficiais definem APP_UID).
# O backend em TypeScript roda como root — isto é o item 18 já resolvido.
USER $APP_UID

EXPOSE 8080
ENTRYPOINT ["dotnet", "GeladeiraVirtual.Api.dll"]
