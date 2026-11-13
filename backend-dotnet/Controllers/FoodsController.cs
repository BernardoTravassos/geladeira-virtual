using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using GeladeiraVirtual.Api.Autenticacao;
using GeladeiraVirtual.Api.Dados;
using GeladeiraVirtual.Api.Dados.Entidades;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeladeiraVirtual.Api.Controllers;

/// <summary>
/// Catálogo de alimentos e o que cada um contém (macros por 100 g e vitaminas/minerais).
/// Devolve o catálogo comum mais os alimentos que a própria pessoa criou.
/// </summary>
[ApiController]
[Route("foods")]
[Authorize]
public sealed partial class FoodsController(GeladeiraContext banco, GeladeiraVirtual.Api.Alimentos.ServicoOpenFoodFacts openFoodFacts) : ControllerBase
{
    private static readonly string[] Categorias =
        ["carboidratos", "paes", "proteinas", "vegetais", "frutas", "laticinios", "doces", "bebidas", "gorduras", "pratos"];

    private const int MaxPersonalizados = 500;

    [GeneratedRegex(@"^custom-[A-Za-z0-9-]{1,60}$")]
    private static partial Regex PadraoIdPersonalizado();

    /// <summary>
    /// Lista e busca: ?busca=pao chapa &amp;categoria=doces &amp;limite=100 &amp;micros=true &amp;externo=true &amp;fontes=catalogo,pessoa
    ///
    /// A busca ignora acento e maiúsculas, aceita várias palavras em qualquer ordem
    /// ("chapa pao") e plural ("ovos" acha "ovo"). Com externo=true, se achar pouco,
    /// completa com produtos de mercado do Open Food Facts (e guarda no banco).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Listar(string? busca, string? categoria, int limite = 100, bool micros = false, bool externo = false, string? fontes = null, CancellationToken ct = default)
    {
        limite = Math.Clamp(limite, 1, 1000);
        var termo = string.IsNullOrWhiteSpace(busca) ? "" : SementeAlimentos.Normalizar(busca);

        var lista = await Consultar(termo, categoria, limite, micros, fontes, ct);

        // Poucos resultados para uma busca de verdade: tenta o Open Food Facts e repete a consulta.
        if (externo && termo.Length >= 3 && lista.Count < 8 && await openFoodFacts.BuscarPorNome(termo, ct) > 0)
            lista = await Consultar(termo, categoria, limite, micros, fontes, ct);

        return Ok(lista.Select(a => Mapear(a, micros)));
    }

    private async Task<List<Alimento>> Consultar(string termo, string? categoria, int limite, bool micros, string? fontes, CancellationToken ct)
    {
        var consulta = banco.Alimentos.AsNoTracking()
            .Where(a => a.UsuarioId == null || a.UsuarioId == UsuarioId);

        if (!string.IsNullOrWhiteSpace(categoria))
            consulta = consulta.Where(a => a.Categoria == categoria);

        // ?fontes=catalogo,pessoa restringe a origem (o app já traz a TACO embutida).
        var origens = (fontes ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (origens.Length > 0)
            consulta = consulta.Where(a => origens.Contains(a.Fonte));

        // Cada palavra precisa aparecer no nome, em qualquer ordem. "s" final é descartado
        // para "ovos" achar "ovo" (só em palavras com mais de 3 letras, para não estragar "gás").
        foreach (var palavra in termo.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            var p = palavra.Length > 3 && palavra.EndsWith('s') ? palavra[..^1] : palavra;
            consulta = consulta.Where(a => a.NomeBusca.Contains(p));
        }

        // O banco só filtra e traz um lote; a ordem fina é feita aqui, em memória.
        IQueryable<Alimento> filtrada = consulta.OrderBy(a => a.NomeBusca);
        if (micros) filtrada = filtrada.Include(a => a.Micros);
        var lote = await filtrada.Take(Math.Max(limite * 4, 400)).ToListAsync(ct);

        var palavras = termo.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(p => p.Length > 3 && p.EndsWith('s') ? p[..^1] : p).ToArray();

        // Ordem: 1) todas as palavras digitadas são palavras INTEIRAS do nome ("maca" acha
        // "Maçã" antes de "Macarrão"); 2) o nome começa com o digitado; 3) catálogo curado e
        // criados pela pessoa, depois TACO, depois produtos de mercado; 4) nomes mais curtos.
        return lote
            .OrderBy(a => palavras.Length > 0 && palavras.All(p => PalavraInteira(a.NomeBusca, p)) ? 0 : 1)
            .ThenBy(a => termo != "" && a.NomeBusca.StartsWith(termo) ? 0 : 1)
            .ThenBy(a => a.Fonte == "taco" ? 1 : a.Fonte == "off" ? 2 : 0)
            .ThenBy(a => a.NomeBusca.Length)
            .ThenBy(a => a.NomeBusca, StringComparer.Ordinal)
            .Take(limite)
            .ToList();
    }

    /// <summary>"maca" é palavra inteira em "maca crua", mas não em "macarrao". Aceita o plural do nome ("ovos").</summary>
    private static bool PalavraInteira(string nome, string palavra) =>
        $" {nome} ".Contains($" {palavra} ") || $" {nome} ".Contains($" {palavra}s ");

    /// <summary>Procura um produto pelo código de barras (EAN). Se não estiver no banco, tenta o Open Food Facts.</summary>
    [HttpGet("barcode/{codigo}")]
    public async Task<IActionResult> PorCodigoDeBarras(string codigo, CancellationToken ct)
    {
        if (!System.Text.RegularExpressions.Regex.IsMatch(codigo, @"^\d{8,14}$"))
            return BadRequest(new { error = "Código de barras inválido." });

        var a = await banco.Alimentos.AsNoTracking().Include(x => x.Micros).FirstOrDefaultAsync(x => x.CodigoBarras == codigo, ct);
        if (a is null && await openFoodFacts.BuscarPorCodigo(codigo, ct))
            a = await banco.Alimentos.AsNoTracking().Include(x => x.Micros).FirstOrDefaultAsync(x => x.CodigoBarras == codigo, ct);

        return a is null ? NotFound(new { error = "Produto não encontrado." }) : Ok(Mapear(a, true));
    }

    /// <summary>Um alimento com todas as vitaminas e minerais (e o % do valor diário de 100 g).</summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> Obter(string id)
    {
        var a = await banco.Alimentos.AsNoTracking()
            .Include(x => x.Micros).ThenInclude(m => m.Micronutriente)
            .SingleOrDefaultAsync(x => x.Id == id && (x.UsuarioId == null || x.UsuarioId == UsuarioId));

        if (a is null) return NotFound(new { error = "Alimento não encontrado." });

        return Ok(new
        {
            id = a.Id, nome = a.Nome, categoria = a.Categoria, porcaoPadrao = a.PorcaoPadrao,
            kcal = a.Kcal, proteina = a.Proteina, carbo = a.Carbo, gordura = a.Gordura,
            medida = a.Medida, emoji = a.Emoji, personalizado = a.UsuarioId != null, fonte = a.Fonte, codigoBarras = a.CodigoBarras,
            micros = a.Micros.OrderBy(m => m.Chave).Select(m => new
            {
                chave = m.Chave, rotulo = m.Micronutriente.Rotulo, unidade = m.Micronutriente.Unidade,
                tipo = m.Micronutriente.Tipo, valor = m.Valor,
                percentualVd = Math.Round(m.Valor / m.Micronutriente.ValorDiario * 100, 0),
            }),
        });
    }

    /// <summary>Definições de vitaminas e minerais (nome, unidade, valor diário de referência).</summary>
    [HttpGet("micronutrients")]
    public async Task<IActionResult> Micronutrientes() =>
        Ok(await banco.Micronutrientes.AsNoTracking().OrderBy(m => m.Tipo).ThenBy(m => m.Rotulo)
            .Select(m => new { chave = m.Chave, rotulo = m.Rotulo, unidade = m.Unidade, valorDiario = m.ValorDiario, tipo = m.Tipo })
            .ToListAsync());

    /// <summary>
    /// Cria ou atualiza um alimento da pessoa. O id é escolhido pelo app ("custom-...")
    /// para a operação poder ser repetida sem duplicar.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Gravar(string id, [FromBody] AlimentoRequest req)
    {
        if (!PadraoIdPersonalizado().IsMatch(id))
            return BadRequest(new { error = "O id de um alimento criado por você deve começar com \"custom-\"." });
        if (!Categorias.Contains(req.Categoria))
            return BadRequest(new { error = "Categoria inválida." });

        var a = await banco.Alimentos.SingleOrDefaultAsync(x => x.Id == id);
        if (a is not null && a.UsuarioId != UsuarioId)
            return NotFound(new { error = "Alimento não encontrado." });

        if (a is null)
        {
            if (await banco.Alimentos.CountAsync(x => x.UsuarioId == UsuarioId) >= MaxPersonalizados)
                return BadRequest(new { error = "Limite de alimentos criados atingido." });
            a = new Alimento { Id = id, UsuarioId = UsuarioId, CriadoEm = Relogio.Agora };
            banco.Alimentos.Add(a);
        }

        a.Nome = req.Nome.Trim();
        a.NomeBusca = SementeAlimentos.Normalizar(a.Nome);
        a.Categoria = req.Categoria;
        a.PorcaoPadrao = req.PorcaoPadrao;
        a.Kcal = req.Kcal; a.Proteina = req.Proteina; a.Carbo = req.Carbo; a.Gordura = req.Gordura;
        a.Fonte = "pessoa";
        a.Medida = string.IsNullOrWhiteSpace(req.Medida) ? null : req.Medida.Trim();
        a.Emoji = string.IsNullOrWhiteSpace(req.Emoji) ? null : req.Emoji.Trim();

        await banco.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Remove um alimento criado pela própria pessoa (o catálogo comum não se apaga).</summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Remover(string id)
    {
        var apagados = await banco.Alimentos
            .Where(a => a.Id == id && a.UsuarioId == UsuarioId)
            .ExecuteDeleteAsync();
        return apagados == 0 ? NotFound(new { error = "Alimento não encontrado." }) : NoContent();
    }

    private static object Mapear(Alimento a, bool micros) => new
    {
        id = a.Id, nome = a.Nome, categoria = a.Categoria, porcaoPadrao = a.PorcaoPadrao,
        kcal = a.Kcal, proteina = a.Proteina, carbo = a.Carbo, gordura = a.Gordura,
        medida = a.Medida, emoji = a.Emoji, personalizado = a.UsuarioId != null, fonte = a.Fonte, codigoBarras = a.CodigoBarras,
        micros = micros ? a.Micros.ToDictionary(m => m.Chave, m => m.Valor) : null,
    };

    private Guid UsuarioId =>
        Guid.Parse(User.FindFirst(AutenticacaoExtensoes.ClaimUsuarioId)!.Value);
}

public sealed class AlimentoRequest
{
    [Required, MinLength(2), MaxLength(120)] public string Nome { get; set; } = "";
    [Required] public string Categoria { get; set; } = "";
    [Range(1, 5000)] public int PorcaoPadrao { get; set; } = 100;
    [Range(0, 1000)] public decimal Kcal { get; set; }
    [Range(0, 100)] public decimal Proteina { get; set; }
    [Range(0, 100)] public decimal Carbo { get; set; }
    [Range(0, 100)] public decimal Gordura { get; set; }
    [MaxLength(120)] public string? Medida { get; set; }
    [MaxLength(16)] public string? Emoji { get; set; }
}
