using GeladeiraVirtual.Api.Autenticacao;
using GeladeiraVirtual.Api.Configuracao;
using GeladeiraVirtual.Api.Dados;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace GeladeiraVirtual.Api.Controllers;

/// <summary>
/// Reunião por vídeo entre nutricionista e paciente (LiveKit).
/// O servidor só entrega o "crachá" (token) de uma sala. Quem pode entrar é
/// decidido aqui: apenas as duas pontas de um vínculo ATIVO, cada uma na sala
/// daquele vínculo. O vídeo em si não passa pela nossa API.
/// </summary>
[ApiController]
[Route("meetings")]
[Authorize]
public sealed class ReuniaoController(GeladeiraContext banco, ConfiguracaoApp configuracao) : ControllerBase
{
    private static readonly TimeSpan Validade = TimeSpan.FromHours(2);

    [HttpPost("{vinculoId:guid}/token")]
    public async Task<IActionResult> Token(Guid vinculoId)
    {
        var lk = configuracao.LiveKit;
        if (lk is null) return StatusCode(503, new { error = "A reunião por vídeo ainda não está configurada no servidor." });

        var eu = Guid.Parse(User.FindFirst(AutenticacaoExtensoes.ClaimUsuarioId)!.Value);
        var vinculo = await banco.Vinculos.AsNoTracking()
            .SingleOrDefaultAsync(v => v.Id == vinculoId && v.Status == "ativo" && (v.PacienteId == eu || v.NutricionistaId == eu));
        // Mesma resposta para vínculo inexistente, encerrado ou de outra pessoa.
        if (vinculo is null) return NotFound(new { error = "Reunião não encontrada." });

        var ehNutri = vinculo.NutricionistaId == eu;
        string nome = ehNutri
            ? await banco.Nutricionistas.Where(n => n.UsuarioId == eu).Select(n => n.Nome).FirstOrDefaultAsync() ?? "Nutricionista"
            : await banco.Perfis.Where(p => p.UsuarioId == eu).Select(p => p.Nome).FirstOrDefaultAsync() ?? "Paciente";

        var sala = $"vinculo-{vinculo.Id:N}";
        var agora = DateTime.UtcNow;
        var descritor = new SecurityTokenDescriptor
        {
            Issuer = lk.ApiKey,
            Claims = new Dictionary<string, object>
            {
                ["sub"] = eu.ToString(),
                ["name"] = nome,
                ["video"] = new Dictionary<string, object>
                {
                    ["room"] = sala,
                    ["roomJoin"] = true,
                    ["canPublish"] = true,
                    ["canSubscribe"] = true,
                    ["canPublishData"] = true,
                },
            },
            NotBefore = agora.AddSeconds(-10),
            Expires = agora.Add(Validade),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(lk.ApiSecret)), SecurityAlgorithms.HmacSha256),
        };
        var token = new JsonWebTokenHandler().CreateToken(descritor);
        return Ok(new { url = lk.Url, token, sala, nome, papel = ehNutri ? "nutricionista" : "paciente" });
    }
}
