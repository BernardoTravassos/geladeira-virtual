using System.Globalization;
using System.Security.Cryptography;
using GeladeiraVirtual.Api.Autenticacao;
using GeladeiraVirtual.Api.Dados;
using GeladeiraVirtual.Api.Dados.Entidades;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeladeiraVirtual.Api.Controllers;

/// <summary>Área do nutricionista: convidar pacientes e acompanhá-los.</summary>
[ApiController]
[Route("nutritionist")]
[Authorize]
public sealed class NutricionistaController(GeladeiraContext banco) : ControllerBase
{
    // Sem 0/O, 1/I/L: o código é ditado por telefone ou digitado de uma foto.
    private const string Alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private const int MaxConvitesPendentes = 20;

    /// <summary>Gera um convite. O paciente digita o código no app para se vincular.</summary>
    [HttpPost("invites")]
    public async Task<IActionResult> CriarConvite()
    {
        if (!await EhNutricionista()) return Forbid();

        var pendentes = await banco.Vinculos.CountAsync(v => v.NutricionistaId == UsuarioId && v.Status == "pendente");
        if (pendentes >= MaxConvitesPendentes)
            return BadRequest(new { error = "Você já tem convites pendentes demais. Cancele alguns." });

        // Colisão é raríssima (31^8), mas o índice único é quem garante: tenta de novo se ocorrer.
        for (var tentativa = 0; tentativa < 5; tentativa++)
        {
            var vinculo = new Vinculo
            {
                NutricionistaId = UsuarioId,
                Codigo = GerarCodigo(),
                Status = "pendente",
                CriadoEm = Relogio.Agora,
            };
            banco.Vinculos.Add(vinculo);
            try
            {
                await banco.SaveChangesAsync();
                return StatusCode(StatusCodes.Status201Created, new { id = vinculo.Id, codigo = vinculo.Codigo });
            }
            catch (DbUpdateException)
            {
                banco.Entry(vinculo).State = EntityState.Detached;
            }
        }
        return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Não foi possível gerar o código." });
    }

    /// <summary>Pacientes ativos e convites pendentes.</summary>
    [HttpGet("patients")]
    public async Task<IActionResult> Pacientes()
    {
        if (!await EhNutricionista()) return Forbid();

        var vinculos = await banco.Vinculos.AsNoTracking()
            .Where(v => v.NutricionistaId == UsuarioId && v.Status != "encerrado")
            .Include(v => v.Paciente).ThenInclude(p => p!.Perfil)
            .OrderByDescending(v => v.CriadoEm)
            .ToListAsync();

        return Ok(vinculos.Select(v => new
        {
            vinculoId = v.Id,
            status = v.Status,
            codigo = v.Status == "pendente" ? v.Codigo : null,
            criadoEm = v.CriadoEm,
            aceitoEm = v.AceitoEm,
            paciente = v.Paciente is null ? null : new
            {
                id = v.Paciente.Id,
                nome = v.Paciente.Perfil?.Nome,
                email = v.Paciente.Email,
                objetivo = v.Paciente.Perfil?.Objetivo,
                idade = v.Paciente.Perfil?.Idade,
                pesoKg = v.Paciente.Perfil?.PesoKg,
            },
        }));
    }

    /// <summary>
    /// O diário de um paciente: só funciona com vínculo ATIVO, ou seja, depois de o
    /// próprio paciente ter aceitado. Mesmo formato de GET /diary.
    /// </summary>
    [HttpGet("patients/{pacienteId:guid}/diary")]
    public async Task<IActionResult> DiarioDoPaciente(Guid pacienteId)
    {
        if (!await EhNutricionista()) return Forbid();

        var vinculado = await banco.Vinculos.AnyAsync(v =>
            v.NutricionistaId == UsuarioId && v.PacienteId == pacienteId && v.Status == "ativo");
        if (!vinculado) return NotFound(new { error = "Paciente não encontrado." });

        var linhas = await banco.RegistrosDia.AsNoTracking()
            .Where(r => r.UsuarioId == pacienteId)
            .Select(r => new { r.Tipo, r.Data, r.Conteudo })
            .ToListAsync();

        return Ok(linhas.Select(r => new
        {
            tipo = r.Tipo,
            data = r.Data.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            conteudo = r.Conteudo,
        }));
    }

    /// <summary>Cancela um convite pendente ou encerra o acompanhamento de um paciente.</summary>
    [HttpDelete("links/{id:guid}")]
    public async Task<IActionResult> Encerrar(Guid id)
    {
        if (!await EhNutricionista()) return Forbid();

        var n = await banco.Vinculos
            .Where(v => v.Id == id && v.NutricionistaId == UsuarioId && v.Status != "encerrado")
            .ExecuteUpdateAsync(s => s.SetProperty(v => v.Status, "encerrado"));
        return n == 0 ? NotFound(new { error = "Vínculo não encontrado." }) : NoContent();
    }

    private static string GerarCodigo() =>
        string.Create(8, 0, (span, _) =>
        {
            for (var i = 0; i < span.Length; i++) span[i] = Alfabeto[RandomNumberGenerator.GetInt32(Alfabeto.Length)];
        });

    private Task<bool> EhNutricionista() =>
        banco.Usuarios.AnyAsync(u => u.Id == UsuarioId && u.Papel == "nutricionista");

    private Guid UsuarioId =>
        Guid.Parse(User.FindFirst(AutenticacaoExtensoes.ClaimUsuarioId)!.Value);
}

/// <summary>Lado do paciente: aceitar o convite e ver/encerrar o vínculo.</summary>
[ApiController]
[Route("links")]
[Authorize]
public sealed class VinculosController(GeladeiraContext banco) : ControllerBase
{
    /// <summary>O paciente informa o código do convite e passa a ser acompanhado.</summary>
    [HttpPost("accept")]
    public async Task<IActionResult> Aceitar([FromBody] AceitarConviteRequest req)
    {
        var papel = await banco.Usuarios.Where(u => u.Id == UsuarioId).Select(u => u.Papel).SingleAsync();
        if (papel != "paciente")
            return BadRequest(new { error = "Só pacientes aceitam convites." });

        if (await banco.Vinculos.AnyAsync(v => v.PacienteId == UsuarioId && v.Status == "ativo"))
            return Conflict(new { error = "Você já tem um nutricionista. Encerre o vínculo atual antes." });

        var codigo = (req.Codigo ?? "").Trim().ToUpperInvariant();
        var vinculo = await banco.Vinculos
            .Include(v => v.Nutricionista)
            .SingleOrDefaultAsync(v => v.Codigo == codigo && v.Status == "pendente");

        // Mesma resposta para código errado, usado ou cancelado.
        if (vinculo is null) return NotFound(new { error = "Código inválido ou já utilizado." });

        vinculo.PacienteId = UsuarioId;
        vinculo.Status = "ativo";
        vinculo.AceitoEm = Relogio.Agora;
        await banco.SaveChangesAsync();

        var nutri = await banco.Nutricionistas.AsNoTracking().SingleAsync(n => n.UsuarioId == vinculo.NutricionistaId);
        return Ok(new { vinculoId = vinculo.Id, nutricionista = new { nutri.Nome, nutri.Crn } });
    }

    /// <summary>Quem acompanha a pessoa hoje (lista vazia se ninguém).</summary>
    [HttpGet]
    public async Task<IActionResult> Meus()
    {
        var itens = await banco.Vinculos.AsNoTracking()
            .Where(v => v.PacienteId == UsuarioId && v.Status == "ativo")
            .Join(banco.Nutricionistas, v => v.NutricionistaId, n => n.UsuarioId,
                (v, n) => new { vinculoId = v.Id, v.AceitoEm, nutricionista = new { n.Nome, n.Crn } })
            .ToListAsync();
        return Ok(itens);
    }

    /// <summary>O paciente pode encerrar o acompanhamento quando quiser; o nutricionista perde o acesso.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Encerrar(Guid id)
    {
        var n = await banco.Vinculos
            .Where(v => v.Id == id && v.PacienteId == UsuarioId && v.Status == "ativo")
            .ExecuteUpdateAsync(s => s.SetProperty(v => v.Status, "encerrado"));
        return n == 0 ? NotFound(new { error = "Vínculo não encontrado." }) : NoContent();
    }

    private Guid UsuarioId =>
        Guid.Parse(User.FindFirst(AutenticacaoExtensoes.ClaimUsuarioId)!.Value);
}

public sealed class AceitarConviteRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.MaxLength(12)]
    public string? Codigo { get; set; }
}
