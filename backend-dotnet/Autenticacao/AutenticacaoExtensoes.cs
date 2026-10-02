using System.Text.Json;
using GeladeiraVirtual.Api.Contratos;
using GeladeiraVirtual.Api.Dados;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

namespace GeladeiraVirtual.Api.Autenticacao;

public static class AutenticacaoExtensoes
{
    /// <summary>Claim que o backend antigo usava. Mantida para compatibilidade.</summary>
    public const string ClaimUsuarioId = "usuarioId";

    /// <summary>Versão do token, para invalidar sessões (item 8).</summary>
    public const string ClaimTokenVersao = "tv";

    public static IServiceCollection AdicionarAutenticacaoJwt(
        this IServiceCollection servicos, ServicoJwt jwt)
    {
        servicos
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(opcoes =>
            {
                opcoes.TokenValidationParameters = jwt.ParametrosValidacao();

                // Sem isto, o .NET renomeia as claims para URLs longas e
                // "usuarioId" deixaria de ser encontrável pelo nome original.
                opcoes.MapInboundClaims = false;

                opcoes.Events = new JwtBearerEvents
                {
                    OnTokenValidated = ConferirVersaoDoToken,
                    OnChallenge = RespostaDeNaoAutorizado,
                };
            });

        return servicos;
    }

    /// <summary>
    /// A assinatura do token ser válida não basta: é preciso conferir se ele
    /// não foi invalidado depois de emitido.
    ///
    /// Cada token carrega a versão vigente quando foi criado. Redefinir a
    /// senha incrementa o contador do usuário — e aí todo token anterior
    /// deixa de valer, mesmo com assinatura perfeita e prazo em aberto.
    /// </summary>
    private static async Task ConferirVersaoDoToken(TokenValidatedContext contexto)
    {
        var usuarioId = contexto.Principal?.FindFirst(ClaimUsuarioId)?.Value;

        if (!Guid.TryParse(usuarioId, out var id))
        {
            contexto.Fail("Token sem usuarioId");
            return;
        }

        var banco = contexto.HttpContext.RequestServices.GetRequiredService<GeladeiraContext>();

        var versaoAtual = await banco.Usuarios
            .Where(u => u.Id == id)
            .Select(u => (int?)u.TokenVersao)
            .FirstOrDefaultAsync();

        if (versaoAtual is null)
        {
            // Conta apagada: o token continua assinado, mas não há mais dono.
            contexto.Fail("Usuário não existe");
            return;
        }

        // Tokens emitidos pelo backend antigo não têm a claim "tv". Tratamos
        // como versão 1 (o padrão da coluna), então eles continuam valendo —
        // até a primeira redefinição de senha, que os invalida junto.
        var versaoDoToken = int.TryParse(
            contexto.Principal?.FindFirst(ClaimTokenVersao)?.Value, out var v) ? v : 1;

        if (versaoDoToken != versaoAtual)
        {
            contexto.Fail("Sessão encerrada");
        }
    }

    /// <summary>
    /// O padrão do ASP.NET devolve 401 com corpo vazio. O app espera
    /// {"error": "..."} — este trecho mantém o contrato.
    /// </summary>
    private static async Task RespostaDeNaoAutorizado(JwtBearerChallengeContext contexto)
    {
        contexto.HandleResponse();

        contexto.Response.StatusCode = StatusCodes.Status401Unauthorized;
        contexto.Response.ContentType = "application/json";

        var mensagem = string.IsNullOrEmpty(contexto.Error) && contexto.AuthenticateFailure is null
            ? "Token não enviado"
            : "Token inválido ou expirado";

        await contexto.Response.WriteAsync(
            JsonSerializer.Serialize(new { error = mensagem }, JsonPadrao.Opcoes));
    }
}
