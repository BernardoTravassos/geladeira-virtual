namespace GeladeiraVirtual.Api.Configuracao;

/// <summary>
/// Configuração de envio de e-mail, por SMTP.
///
/// Escolhemos SMTP em vez da API HTTP do Resend de propósito: SMTP é padrão da
/// indústria, então o mesmo código serve para Resend, Amazon SES, Gmail ou um
/// servidor local de testes — trocando só estas variáveis, sem tocar no código.
/// </summary>
public sealed class ConfiguracaoEmail
{
    public required string Host { get; init; }
    public required int Porta { get; init; }

    /// <summary>No Resend é a palavra "resend". Vazio em servidores locais sem autenticação.</summary>
    public string? Usuario { get; init; }

    /// <summary>No Resend é a CHAVE DE API (começa com re_).</summary>
    public string? Senha { get; init; }

    /// <summary>
    /// Aceita "Nome &lt;endereco@dominio&gt;" ou só o endereço.
    /// Sem domínio verificado, o Resend só aceita onboarding@resend.dev como
    /// remetente — e só entrega no e-mail da sua própria conta Resend.
    /// </summary>
    public required string Remetente { get; init; }
}
