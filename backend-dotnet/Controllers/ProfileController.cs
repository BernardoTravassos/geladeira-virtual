using System.Globalization;
using GeladeiraVirtual.Api.Autenticacao;
using GeladeiraVirtual.Api.Contratos;
using GeladeiraVirtual.Api.Dados;
using GeladeiraVirtual.Api.Dados.Entidades;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeladeiraVirtual.Api.Controllers;

[ApiController]
[Route("profile")]
[Authorize]
public sealed class ProfileController(GeladeiraContext banco) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Buscar()
    {
        var perfil = await banco.Perfis
            .AsNoTracking()
            .SingleOrDefaultAsync(p => p.UsuarioId == UsuarioId);

        if (perfil is null)
        {
            return NotFound(new { error = "Perfil ainda não preenchido" });
        }

        return Ok(Formatar(perfil));
    }

    [HttpPost]
    public async Task<IActionResult> Salvar([FromBody] PerfilRequest requisicao)
    {
        var perfil = await banco.Perfis.SingleOrDefaultAsync(p => p.UsuarioId == UsuarioId);

        if (perfil is null)
        {
            perfil = new Perfil { UsuarioId = UsuarioId };
            banco.Perfis.Add(perfil);
        }

        perfil.Nome = requisicao.Nome.Trim();
        perfil.Idade = (int)requisicao.Idade;      // faixa já validada pelo Range
        perfil.Sexo = requisicao.Sexo;
        perfil.AlturaCm = (int)requisicao.AlturaCm;
        perfil.PesoKg = requisicao.PesoKg;
        perfil.Objetivo = requisicao.Objetivo;
        perfil.NivelAtividade = requisicao.NivelAtividade;
        // Com o nível informado, ele manda; o booleano antigo fica coerente com ele.
        perfil.PraticaExercicio = requisicao.NivelAtividade is null
            ? requisicao.PraticaExercicio
            : requisicao.NivelAtividade != "sedentario";
        // Texto vazio vira nulo: "sem intolerância" e "" são a mesma coisa.
        perfil.Intolerancias = string.IsNullOrWhiteSpace(requisicao.Intolerancias)
            ? null
            : requisicao.Intolerancias.Trim();
        perfil.Vegano = requisicao.Vegano;
        perfil.PreferenciaPreparo = requisicao.PreferenciaPreparo;
        perfil.TempoDisponivel = requisicao.TempoDisponivel;
        perfil.AtualizadoEm = Relogio.Agora;

        await banco.SaveChangesAsync();

        // 201 tanto ao criar quanto ao atualizar — igual ao backend antigo,
        // porque é o que o app já espera.
        return StatusCode(StatusCodes.Status201Created,
            new { message = "Perfil salvo com sucesso" });
    }

    private Guid UsuarioId =>
        Guid.Parse(User.FindFirst(AutenticacaoExtensoes.ClaimUsuarioId)!.Value);

    /// <summary>
    /// Monta a resposta no formato que o app já lê.
    ///
    /// Dois detalhes que parecem estranhos e são obrigatórios:
    ///
    /// 1. As chaves são snake_case, porque o backend antigo devolvia as linhas
    ///    cruas do Postgres e o nutricao.ts lê `perfil.altura_cm`.
    /// 2. `peso_kg` sai como TEXTO ("77.0"), porque o driver do Node converte
    ///    NUMERIC em string. O app faz `Number(perfil?.peso_kg)` contando com
    ///    isso. Mandar número quebraria nada hoje, mas devolver exatamente o
    ///    mesmo formato elimina qualquer surpresa na troca.
    ///
    /// `id` e `usuario_id` ficaram DE FORA (item 15): o app não os usa, e são
    /// identificadores internos sem motivo para circular.
    /// </summary>
    private static object Formatar(Perfil p) => new
    {
        nome = p.Nome,
        idade = p.Idade,
        sexo = p.Sexo,
        altura_cm = p.AlturaCm,
        peso_kg = p.PesoKg?.ToString(CultureInfo.InvariantCulture),
        objetivo = p.Objetivo,
        pratica_exercicio = p.PraticaExercicio,
        nivel_atividade = p.NivelAtividade,
        intolerancias = p.Intolerancias,
        vegano = p.Vegano,
        preferencia_preparo = p.PreferenciaPreparo,
        tempo_disponivel = p.TempoDisponivel,
        atualizado_em = DateTime.SpecifyKind(p.AtualizadoEm, DateTimeKind.Utc)
            .ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture),
    };
}
