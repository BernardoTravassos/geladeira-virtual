namespace GeladeiraVirtual.Api.Configuracao;

/// <summary>
/// Configuração da API, validada uma única vez no boot. Se algo estiver
/// errado, a aplicação nem sobe — é melhor descobrir no segundo em que você
/// inicia o serviço do que quando um usuário tenta entrar.
/// Equivalente ao backend/src/env.ts do backend em TypeScript.
/// </summary>
public sealed class ConfiguracaoApp
{
    public required string JwtSecret { get; init; }
    public required string DatabaseUrl { get; init; }

    /// <summary>Opcional por enquanto: só será obrigatória quando /meals/generate existir.</summary>
    public string? AnthropicApiKey { get; init; }

    /// <summary>Origens permitidas para CORS. Vazio = nenhuma (o app nativo não é afetado).</summary>
    public string[] CorsOrigins { get; init; } = [];

    // Valores que já vieram nos arquivos de exemplo do repositório. Se algum
    // deles chegar aqui como valor real, não é segredo — está publicado.
    private static readonly string[] Placeholders =
    [
        "troque-por-um-segredo-forte",
        "mude-isso",
        "changeme",
        "secret",
    ];

    public static ConfiguracaoApp Carregar(IConfiguration config) => new()
    {
        JwtSecret = LerSegredo(config, "JWT_SECRET", tamanhoMinimo: 32),
        DatabaseUrl = LerObrigatoria(config, "DATABASE_URL"),
        AnthropicApiKey = config["ANTHROPIC_API_KEY"],
        CorsOrigins = (config["CORS_ORIGINS"] ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
    };

    private static string LerObrigatoria(IConfiguration config, string nome)
    {
        var valor = config[nome]?.Trim();

        if (string.IsNullOrEmpty(valor))
        {
            throw new InvalidOperationException(
                $"[config] A variável {nome} não está definida. " +
                "Defina em backend/.env (use backend/.env.example como referência).");
        }

        return valor;
    }

    private static string LerSegredo(IConfiguration config, string nome, int tamanhoMinimo)
    {
        var valor = LerObrigatoria(config, nome);

        if (Placeholders.Contains(valor))
        {
            throw new InvalidOperationException(
                $"[config] {nome} ainda está com o valor de exemplo do repositório, " +
                "então qualquer pessoa que leia o código pode forjar tokens válidos. " +
                "Gere um valor novo com:\n" +
                "  openssl rand -hex 64");
        }

        if (valor.Length < tamanhoMinimo)
        {
            throw new InvalidOperationException(
                $"[config] {nome} tem {valor.Length} caracteres, o mínimo é {tamanhoMinimo}. " +
                "Um segredo curto é quebrável por força bruta. Gere um valor novo com:\n" +
                "  openssl rand -hex 64");
        }

        return valor;
    }
}
