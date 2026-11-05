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

    /// <summary>
    /// Nulo quando SMTP_HOST não está definido: o envio de e-mail fica
    /// desligado e a API sobe normalmente. Quem depende dele (recuperação de
    /// senha) falha com mensagem clara, em vez de a API inteira se recusar a
    /// subir por causa de um recurso que ainda não está em uso.
    /// </summary>
    public ConfiguracaoEmail? Email { get; init; }

    /// <summary>
    /// Em desenvolvimento, o motivo do erro vai junto na resposta, para você
    /// ver no app sem abrir o log do container. Em produção, nunca.
    /// </summary>
    public bool MostrarErros { get; init; }

    /// <summary>
    /// Liga a leitura do IP real do cliente a partir de X-Forwarded-For.
    ///
    /// Atrás de um túnel ou proxy reverso, o IP de origem de TODA requisição é
    /// o do proxy — e o limite de tentativas, que conta por IP, passaria a
    /// dividir a cota entre todos os usuários juntos.
    ///
    /// Fica DESLIGADO por padrão porque confiar nesse cabeçalho sem haver um
    /// proxy de verdade na frente deixa qualquer um forjar o próprio IP e
    /// escapar do limite. Ligue (TRUST_PROXY=true) só quando a API estiver
    /// exposta por um túnel ou proxy que você controla.
    /// </summary>
    public bool ConfiarNoProxy { get; init; }

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
        Email = CarregarEmail(config),
        ConfiarNoProxy = string.Equals(config["TRUST_PROXY"]?.Trim(), "true", StringComparison.OrdinalIgnoreCase),
        MostrarErros = !string.Equals(
            Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
            "Production", StringComparison.OrdinalIgnoreCase),
    };

    private static ConfiguracaoEmail? CarregarEmail(IConfiguration config)
    {
        var host = config["SMTP_HOST"]?.Trim();
        if (string.IsNullOrEmpty(host))
        {
            return null; // recurso desligado
        }

        var porta = int.TryParse(config["SMTP_PORT"]?.Trim(), out var valor) ? valor : 587;

        var remetente = config["EMAIL_REMETENTE"]?.Trim();
        var usuario = config["SMTP_USER"]?.Trim();
        var senha = config["SMTP_PASSWORD"]?.Trim();

        // Configuração pela metade — o caso comum é o SMTP_HOST já estar no
        // .env e a chave de API ainda não ter sido colada — DESLIGA o e-mail,
        // mas não impede a API de subir: é recurso que ainda não está em uso.
        // O aviso no startup (Program.cs) diz o que está faltando.
        if (string.IsNullOrEmpty(remetente)
            || (!string.IsNullOrEmpty(usuario) && string.IsNullOrEmpty(senha)))
        {
            return null;
        }

        return new ConfiguracaoEmail
        {
            Host = host,
            Porta = porta,
            Usuario = usuario,
            Senha = senha,
            Remetente = remetente,
        };
    }

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
