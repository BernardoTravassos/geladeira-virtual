using Npgsql;

namespace GeladeiraVirtual.Api.Dados;

public static class ConexaoPostgres
{
    /// <summary>
    /// Converte a DATABASE_URL do .env para o formato que o Npgsql espera.
    ///
    /// O backend em TypeScript usava a URL direto, porque o driver `pg` aceita
    /// os dois formatos. O Npgsql só aceita o de chave=valor:
    ///
    ///   entra:  postgresql://geladeira:senha@db:5432/geladeira_virtual
    ///   sai:    Host=db;Port=5432;Database=geladeira_virtual;Username=...
    ///
    /// Mantemos a DATABASE_URL como fonte única para os dois backends lerem o
    /// mesmo .env durante a migração.
    /// </summary>
    public static string DeUrl(string databaseUrl)
    {
        if (!Uri.TryCreate(databaseUrl, UriKind.Absolute, out var uri))
        {
            throw new InvalidOperationException(
                "[config] DATABASE_URL não é uma URL válida. Formato esperado: " +
                "postgresql://usuario:senha@host:porta/banco");
        }

        var credenciais = uri.UserInfo.Split(':', 2);

        var construtor = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            // Uri devolve -1 quando a porta não está explícita na URL.
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = Uri.UnescapeDataString(credenciais[0]),
            Password = credenciais.Length > 1 ? Uri.UnescapeDataString(credenciais[1]) : null,
        };

        if (string.IsNullOrEmpty(construtor.Database))
        {
            throw new InvalidOperationException(
                "[config] DATABASE_URL não indica o nome do banco (o trecho depois da barra).");
        }

        return construtor.ConnectionString;
    }
}
