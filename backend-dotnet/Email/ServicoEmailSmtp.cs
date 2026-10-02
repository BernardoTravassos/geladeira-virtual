using GeladeiraVirtual.Api.Configuracao;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace GeladeiraVirtual.Api.Email;

public sealed class ServicoEmailSmtp(ConfiguracaoApp configuracao, ILogger<ServicoEmailSmtp> log)
    : IServicoEmail
{
    public async Task EnviarAsync(
        string destinatario,
        string assunto,
        string corpoTexto,
        CancellationToken cancelamento = default)
    {
        var email = configuracao.Email
            ?? throw new InvalidOperationException(
                "[email] Envio de e-mail não está configurado. Defina SMTP_HOST, SMTP_PORT, " +
                "SMTP_USER, SMTP_PASSWORD e EMAIL_REMETENTE em backend/.env.");

        var mensagem = new MimeMessage();
        mensagem.From.Add(MailboxAddress.Parse(email.Remetente));
        mensagem.To.Add(MailboxAddress.Parse(destinatario));
        mensagem.Subject = assunto;
        // Só texto puro, de propósito: e-mail de código não precisa de HTML, e
        // HTML abre espaço para erro de escape com conteúdo vindo do usuário.
        mensagem.Body = new TextPart("plain") { Text = corpoTexto };

        // Portas 465/2465 já conectam criptografadas; 587 e 2587 começam em
        // texto e sobem para TLS. Exigimos TLS nos dois casos — nunca enviamos
        // credencial em texto claro.
        var seguranca = email.Porta is 465 or 2465
            ? SecureSocketOptions.SslOnConnect
            : SecureSocketOptions.StartTls;

        using var cliente = new SmtpClient();
        await cliente.ConnectAsync(email.Host, email.Porta, seguranca, cancelamento);

        // Servidor local de testes não pede autenticação; o Resend sim.
        // Variáveis locais para o compilador conseguir descartar o nulo.
        var usuario = email.Usuario;
        var senha = email.Senha;
        if (!string.IsNullOrEmpty(usuario) && !string.IsNullOrEmpty(senha))
        {
            await cliente.AuthenticateAsync(usuario, senha, cancelamento);
        }

        await cliente.SendAsync(mensagem, cancelamento);
        await cliente.DisconnectAsync(true, cancelamento);

        // Log sem o corpo da mensagem: ele contém o código de recuperação, que
        // é um segredo de curta duração e não pode ficar gravado em log.
        log.LogInformation("E-mail enviado para {Destinatario} (assunto: {Assunto})",
            Mascarar(destinatario), assunto);
    }

    private static string Mascarar(string email)
    {
        var partes = email.Split('@');
        var local = partes[0];
        var visivel = local.Length <= 2
            ? local
            : local[..2] + new string('*', Math.Min(local.Length - 2, 5));

        return partes.Length > 1 ? $"{visivel}@{partes[1]}" : visivel;
    }
}
