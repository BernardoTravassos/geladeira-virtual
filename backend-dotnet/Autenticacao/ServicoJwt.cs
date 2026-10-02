using System.Security.Cryptography;
using System.Text;
using GeladeiraVirtual.Api.Configuracao;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace GeladeiraVirtual.Api.Autenticacao;

public sealed class ServicoJwt(ConfiguracaoApp configuracao)
{
    /// <summary>
    /// 30 dias — igual ao backend em TypeScript, para os tokens que já estão
    /// nos celulares continuarem valendo durante a migração.
    /// Com o TokenVersao implementado agora, dá para baixar isso com
    /// segurança; vale fazer depois que o app souber tratar 401 (item 9).
    /// </summary>
    private static readonly TimeSpan Validade = TimeSpan.FromDays(30);

    private SymmetricSecurityKey Chave =>
        new(Encoding.UTF8.GetBytes(configuracao.JwtSecret));

    public string Gerar(Guid usuarioId, int tokenVersao)
    {
        var descritor = new SecurityTokenDescriptor
        {
            // Os nomes das claims têm que bater com o que o backend antigo
            // emitia ("usuarioId"), senão os dois ficam incompatíveis.
            Claims = new Dictionary<string, object>
            {
                ["usuarioId"] = usuarioId.ToString(),
                ["tv"] = tokenVersao,
            },
            Expires = DateTime.UtcNow.Add(Validade),
            SigningCredentials = new SigningCredentials(Chave, SecurityAlgorithms.HmacSha256),
        };

        return new JsonWebTokenHandler().CreateToken(descritor);
    }

    public TokenValidationParameters ParametrosValidacao() => new()
    {
        // Algoritmo fixado: sem isto, um token poderia alegar outro algoritmo.
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        IssuerSigningKey = Chave,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,
        // O backend antigo não emitia issuer nem audience, então não há o que
        // validar — exigir aqui invalidaria todos os tokens já emitidos.
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.FromMinutes(1),
    };

    /// <summary>
    /// Código de 6 dígitos, sorteado com gerador criptográfico.
    /// Random comum é previsível: quem souber o instante da geração consegue
    /// reproduzir a sequência e adivinhar o código de outra pessoa.
    /// </summary>
    public static string GerarCodigoNumerico() =>
        RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
}
