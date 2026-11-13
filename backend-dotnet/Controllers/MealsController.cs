using GeladeiraVirtual.Api.IA;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GeladeiraVirtual.Api.Controllers;

[ApiController]
[Route("meals")]
[Authorize]
public sealed class MealsController(IServicoAnaliseRefeicao analise) : ControllerBase
{
    private const long TamanhoMaximo = 5 * 1024 * 1024; // 5 MB

    /// <summary>Recebe a foto de um prato (multipart, campo "photo") e devolve os alimentos reconhecidos, por 100 g.</summary>
    [HttpPost("analyze")]
    [EnableRateLimiting("analise")]
    [RequestSizeLimit(TamanhoMaximo + 64 * 1024)]
    public async Task<IActionResult> Analisar([FromForm] IFormFile? photo, CancellationToken ct)
    {
        if (photo is null || photo.Length == 0)
        {
            return BadRequest(new { error = "Envie a foto do prato." });
        }
        if (photo.Length > TamanhoMaximo)
        {
            return BadRequest(new { error = "A foto é grande demais (máximo 5 MB)." });
        }

        // Não confiamos no Content-Type enviado pelo cliente: o tipo real vem dos primeiros bytes.
        byte[] bytes;
        await using (var fluxo = photo.OpenReadStream())
        {
            using var memoria = new MemoryStream();
            await fluxo.CopyToAsync(memoria, ct);
            bytes = memoria.ToArray();
        }

        var tipo = DetectarTipo(bytes);
        if (tipo is null)
        {
            return BadRequest(new { error = "Formato de imagem não suportado. Use JPEG, PNG ou WebP." });
        }

        try
        {
            var r = await analise.AnalisarAsync(bytes, tipo, ct);
            return Ok(new
            {
                eh_comida = r.EhComida,
                // Valores POR 100 g de cada alimento; a pessoa informa depois quanto comeu.
                alimentos = r.Alimentos.Select(a => new
                {
                    nome = a.Nome,
                    calorias_100g = a.Calorias100g,
                    proteina_100g = a.Proteina100g,
                    carboidratos_100g = a.Carboidratos100g,
                    gordura_100g = a.Gordura100g,
                }),
                confianca = r.Confianca,
                aviso = "Alimentos reconhecidos por IA a partir da foto, com valores aproximados por 100 g. Informe a quantidade que você realmente comeu.",
            });
        }
        catch (IaIndisponivelException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = ex.Message });
        }
    }

    private static string? DetectarTipo(byte[] b)
    {
        if (b.Length > 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return "image/jpeg";
        if (b.Length > 8 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47) return "image/png";
        if (b.Length > 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
            && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "image/webp";
        return null;
    }
}
