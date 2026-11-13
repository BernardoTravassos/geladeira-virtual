using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;
using GeladeiraVirtual.Api.Dados;
using GeladeiraVirtual.Api.Dados.Entidades;
using Microsoft.EntityFrameworkCore;

namespace GeladeiraVirtual.Api.Alimentos;

/// <summary>
/// Busca produtos de mercado no Open Food Facts (base aberta, ODbL: exige citar a
/// fonte) quando o catálogo local não tem o que a pessoa procurou. O que é achado
/// fica gravado em `alimentos` (fonte "off"), então a próxima busca já o encontra
/// sem sair do nosso banco, e o catálogo cresce sozinho com o uso.
///
/// É gentil com o serviço deles: um pedido por vez, no máximo ~1 por segundo, e
/// cada termo é consultado no máximo uma vez por dia.
/// </summary>
public sealed class ServicoOpenFoodFacts(HttpClient http, IServiceScopeFactory escopos, ILogger<ServicoOpenFoodFacts> log)
{
    private static readonly SemaphoreSlim UmPorVez = new(1, 1);
    private static readonly ConcurrentDictionary<string, DateTime> TermosConsultados = new();
    private static DateTime _ultimoPedido = DateTime.MinValue;

    private static readonly TimeSpan Intervalo = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan Revalidar = TimeSpan.FromHours(24);

    private const string CamposPedidos = "code,product_name,brands,nutriments,serving_quantity,serving_size";

    /// <summary>Procura por nome e grava os produtos que tiverem dados de calorias.</summary>
    public async Task<int> BuscarPorNome(string termoNormalizado, CancellationToken ct = default)
    {
        if (termoNormalizado.Length < 3) return 0;

        // Já consultamos esse termo hoje? Então não adianta perguntar de novo.
        if (TermosConsultados.TryGetValue(termoNormalizado, out var quando) && DateTime.UtcNow - quando < Revalidar)
            return 0;
        TermosConsultados[termoNormalizado] = DateTime.UtcNow;
        if (TermosConsultados.Count > 5000) TermosConsultados.Clear();

        var url = "https://br.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=20"
                  + $"&fields={CamposPedidos}&search_terms={Uri.EscapeDataString(termoNormalizado)}";
        var json = await Pedir(url, ct);
        if (json is null)
        {
            // Falhou (serviço fora do ar): não marca como consultado, para tentar de novo na próxima busca.
            TermosConsultados.TryRemove(termoNormalizado, out _);
            return 0;
        }

        var produtos = json.RootElement.TryGetProperty("products", out var p) ? p : default;
        if (produtos.ValueKind != JsonValueKind.Array) return 0;
        return await Gravar(produtos.EnumerateArray(), ct);
    }

    /// <summary>Procura um produto pelo código de barras (EAN).</summary>
    public async Task<bool> BuscarPorCodigo(string codigo, CancellationToken ct = default)
    {
        var json = await Pedir($"https://br.openfoodfacts.org/api/v2/product/{Uri.EscapeDataString(codigo)}.json?fields={CamposPedidos}", ct);
        if (json is null || !json.RootElement.TryGetProperty("product", out var produto)) return false;
        return await Gravar([produto], ct) > 0;
    }

    private async Task<JsonDocument?> Pedir(string url, CancellationToken ct)
    {
        await UmPorVez.WaitAsync(ct);
        try
        {
            var espera = Intervalo - (DateTime.UtcNow - _ultimoPedido);
            if (espera > TimeSpan.Zero) await Task.Delay(espera, ct);
            _ultimoPedido = DateTime.UtcNow;

            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            // O Open Food Facts pede que o cliente se identifique.
            req.Headers.UserAgent.ParseAdd("GeladeiraVirtual/0.1 (app de nutricao)");
            using var resp = await http.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode) return null;
            return await JsonDocument.ParseAsync(await resp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        }
        catch (Exception erro) when (erro is HttpRequestException or TaskCanceledException or JsonException)
        {
            // Sem internet ou serviço fora do ar: a busca segue só com o que temos.
            log.LogWarning("Open Food Facts indisponível: {Mensagem}", erro.Message);
            return null;
        }
        finally
        {
            UmPorVez.Release();
        }
    }

    private async Task<int> Gravar(IEnumerable<JsonElement> produtos, CancellationToken ct)
    {
        using var escopo = escopos.CreateScope();
        var banco = escopo.ServiceProvider.GetRequiredService<GeladeiraContext>();

        var candidatos = new Dictionary<string, Alimento>();
        foreach (var p in produtos)
        {
            var a = Converter(p);
            if (a is not null) candidatos[a.Id] = a;
        }
        if (candidatos.Count == 0) return 0;

        var jaExistem = (await banco.Alimentos
            .Where(a => candidatos.Keys.Contains(a.Id))
            .Select(a => a.Id)
            .ToListAsync(ct)).ToHashSet();

        var novos = candidatos.Values.Where(a => !jaExistem.Contains(a.Id)).ToList();
        if (novos.Count == 0) return 0;

        banco.Alimentos.AddRange(novos);
        try { await banco.SaveChangesAsync(ct); }
        catch (DbUpdateException) { return 0; } // outra requisição gravou o mesmo produto agora
        return novos.Count;
    }

    private static Alimento? Converter(JsonElement p)
    {
        var codigo = Texto(p, "code");
        var nome = Texto(p, "product_name")?.Trim();
        if (string.IsNullOrWhiteSpace(codigo) || codigo.Length > 20 || string.IsNullOrWhiteSpace(nome)) return null;
        if (!p.TryGetProperty("nutriments", out var n) || n.ValueKind != JsonValueKind.Object) return null;

        // Energia: kcal direto, ou kJ convertido. Sem energia o produto não serve.
        var kcal = Numero(n, "energy-kcal_100g");
        if (kcal is null && Numero(n, "energy_100g") is { } kj) kcal = kj / 4.184m;
        if (kcal is null or < 0 or > 1000) return null;

        var marca = Texto(p, "brands")?.Split(',')[0].Trim();
        var exibido = !string.IsNullOrWhiteSpace(marca) && !nome.Contains(marca, StringComparison.OrdinalIgnoreCase)
            ? $"{nome} ({marca})" : nome;
        if (exibido.Length > 120) exibido = exibido[..120];

        var porcao = Numero(p, "serving_quantity");
        var medida = Texto(p, "serving_size");

        var a = new Alimento
        {
            Id = $"off-{codigo}",
            Nome = exibido,
            NomeBusca = SementeAlimentos.Normalizar(exibido),
            Categoria = "pratos", // produtos de mercado não vêm categorizados; "pratos e lanches" é o mais neutro
            PorcaoPadrao = porcao is > 0 and <= 5000 ? (int)Math.Round(porcao.Value) : 100,
            Kcal = Math.Round(kcal.Value, 1),
            Proteina = Limitar(Numero(n, "proteins_100g")),
            Carbo = Limitar(Numero(n, "carbohydrates_100g")),
            Gordura = Limitar(Numero(n, "fat_100g")),
            Medida = medida is { Length: > 0 and <= 120 } ? $"porção: {medida}" : null,
            Fonte = "off",
            CodigoBarras = codigo,
            CriadoEm = Relogio.Agora,
        };

        // Sódio (g → mg) quando existir.
        if (Numero(n, "sodium_100g") is { } sodio and > 0 and < 100)
            a.Micros.Add(new AlimentoMicro { AlimentoId = a.Id, Chave = "sodio", Valor = Math.Round(sodio * 1000, 1) });
        return a;
    }

    private static decimal Limitar(decimal? v) => Math.Clamp(v ?? 0, 0, 100);

    private static string? Texto(JsonElement e, string nome) =>
        e.TryGetProperty(nome, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static decimal? Numero(JsonElement e, string nome)
    {
        if (!e.TryGetProperty(nome, out var v)) return null;
        if (v.ValueKind == JsonValueKind.Number && v.TryGetDecimal(out var d)) return d;
        if (v.ValueKind == JsonValueKind.String && decimal.TryParse(v.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out d)) return d;
        return null;
    }
}
