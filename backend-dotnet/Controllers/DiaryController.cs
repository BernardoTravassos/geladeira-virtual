using System.Globalization;
using GeladeiraVirtual.Api.Autenticacao;
using GeladeiraVirtual.Api.Dados;
using GeladeiraVirtual.Api.Dados.Entidades;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeladeiraVirtual.Api.Controllers;

/// <summary>
/// Guarda no servidor o diário da pessoa (refeições, água e treinos de cada dia),
/// para que ele sobreviva a trocar de celular ou reinstalar o app.
/// </summary>
[ApiController]
[Route("diary")]
[Authorize]
public sealed class DiaryController(GeladeiraContext banco) : ControllerBase
{
    private static readonly string[] TiposValidos = ["refeicoes", "agua", "treinos"];

    // O conteúdo de um dia cabe com folga em 256 KB; o teto evita abuso.
    private const int TamanhoMaximo = 256 * 1024;

    /// <summary>Devolve tudo que a pessoa já gravou (usado ao entrar numa conta).</summary>
    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var linhas = await banco.RegistrosDia
            .AsNoTracking()
            .Where(r => r.UsuarioId == UsuarioId)
            .Select(r => new { r.Tipo, r.Data, r.Conteudo })
            .ToListAsync();

        return Ok(linhas.Select(r => new
        {
            tipo = r.Tipo,
            data = r.Data.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            conteudo = r.Conteudo,
        }));
    }

    /// <summary>Grava (ou substitui) um dia. Corpo: {"conteudo": "<json do app>"}.</summary>
    [HttpPut("{tipo}/{data}")]
    public async Task<IActionResult> Gravar(string tipo, string data, [FromBody] GravarDiaRequest requisicao)
    {
        if (!TiposValidos.Contains(tipo))
            return BadRequest(new { error = "Tipo de registro inválido." });

        if (!DateOnly.TryParseExact(data, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dia))
            return BadRequest(new { error = "Data inválida (use AAAA-MM-DD)." });

        if (string.IsNullOrWhiteSpace(requisicao.Conteudo) || requisicao.Conteudo.Length > TamanhoMaximo)
            return BadRequest(new { error = "Conteúdo ausente ou grande demais." });

        // Garante que é JSON válido: o que entra aqui volta tal qual para o app.
        try { System.Text.Json.JsonDocument.Parse(requisicao.Conteudo).Dispose(); }
        catch (System.Text.Json.JsonException) { return BadRequest(new { error = "Conteúdo não é um JSON válido." }); }

        var registro = await banco.RegistrosDia
            .SingleOrDefaultAsync(r => r.UsuarioId == UsuarioId && r.Tipo == tipo && r.Data == dia);

        if (registro is null)
        {
            registro = new RegistroDia { UsuarioId = UsuarioId, Tipo = tipo, Data = dia };
            banco.RegistrosDia.Add(registro);
        }

        registro.Conteudo = requisicao.Conteudo;
        registro.AtualizadoEm = Relogio.Agora;

        await banco.SaveChangesAsync();
        return NoContent();
    }

    private Guid UsuarioId =>
        Guid.Parse(User.FindFirst(AutenticacaoExtensoes.ClaimUsuarioId)!.Value);
}

public sealed class GravarDiaRequest
{
    public string? Conteudo { get; set; }
}
