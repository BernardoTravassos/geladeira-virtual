using GeladeiraVirtual.Api.Configuracao;

namespace GeladeiraVirtual.Api.Email;

/// <summary>
/// Teste de envio por linha de comando, para provar que o caminho
/// API → SMTP → caixa de entrada funciona antes de construir qualquer coisa
/// em cima dele:
///
///   docker compose run --rm api-dotnet --testar-email seu@email.com
/// </summary>
public static class TesteEmail
{
    public static async Task<int> Executar(IServiceProvider servicos, string? destinatario)
    {
        if (string.IsNullOrWhiteSpace(destinatario))
        {
            Console.WriteLine("Uso: --testar-email <destinatario@exemplo.com>");
            return 1;
        }

        using var escopo = servicos.CreateScope();
        var configuracao = escopo.ServiceProvider.GetRequiredService<ConfiguracaoApp>();
        var email = escopo.ServiceProvider.GetRequiredService<IServicoEmail>();

        if (configuracao.Email is null)
        {
            Console.WriteLine("❌ Envio de e-mail não configurado.");
            Console.WriteLine();
            Console.WriteLine("   Defina em backend/.env:");
            Console.WriteLine("     SMTP_HOST=smtp.resend.com");
            Console.WriteLine("     SMTP_PORT=587");
            Console.WriteLine("     SMTP_USER=resend");
            Console.WriteLine("     SMTP_PASSWORD=<sua chave de API do Resend>");
            Console.WriteLine("     EMAIL_REMETENTE=onboarding@resend.dev");
            Console.WriteLine();
            Console.WriteLine("   Depois recrie o container: docker compose up -d --force-recreate api-dotnet");
            return 1;
        }

        Console.WriteLine($"Servidor:  {configuracao.Email.Host}:{configuracao.Email.Porta}");
        Console.WriteLine($"Remetente: {configuracao.Email.Remetente}");
        Console.WriteLine($"Para:      {destinatario}");
        Console.WriteLine();

        try
        {
            await email.EnviarAsync(
                destinatario,
                "Geladeira Virtual — teste de envio",
                "Se você está lendo isto, o envio de e-mail da API está funcionando.\n\n" +
                "Este é o teste da Fase 2: o próximo passo é usar este caminho para\n" +
                "enviar o código de recuperação de senha.\n");

            Console.WriteLine("✅ Enviado sem erro. Confira sua caixa de entrada (e o spam).");
            return 0;
        }
        catch (Exception erro)
        {
            Console.WriteLine($"❌ Falhou: {erro.Message}");
            Console.WriteLine();
            Console.WriteLine("Causas comuns:");
            Console.WriteLine("  · 'You can only send testing emails to your own email address'");
            Console.WriteLine("      → sem domínio verificado, o Resend só entrega no e-mail da");
            Console.WriteLine("        SUA conta Resend. Use esse endereço como destinatário.");
            Console.WriteLine("  · autenticação recusada → a SMTP_PASSWORD deve ser a chave de API (re_...)");
            Console.WriteLine("  · remetente inválido → sem domínio, use onboarding@resend.dev");
            return 1;
        }
    }
}
