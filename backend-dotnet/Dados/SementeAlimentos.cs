using System.Globalization;
using System.Text;
using System.Text.Json;
using GeladeiraVirtual.Api.Dados.Entidades;
using Microsoft.EntityFrameworkCore;

namespace GeladeiraVirtual.Api.Dados;

/// <summary>
/// Carrega o catálogo comum de alimentos (e as definições de vitaminas/minerais)
/// de Dados/Sementes/alimentos.json para o banco. Pode rodar quantas vezes quiser:
/// atualiza o que já existe e cria o que falta, sem tocar nos alimentos criados
/// pelas pessoas.
/// </summary>
public static class SementeAlimentos
{
    private sealed record MicroDef(string Chave, string Rotulo, string Unidade, decimal Vd, string Tipo);

    private sealed record AlimentoSemente(
        string Id, string Nome, string Categoria, int PorcaoPadrao,
        decimal Kcal, decimal Proteina, decimal Carbo, decimal Gordura,
        string? Medida, string? Emoji, string? Fonte, Dictionary<string, decimal> Micros);

    private sealed record Arquivo(List<MicroDef>? Micronutrientes, List<AlimentoSemente> Alimentos);

    /// <summary>
    /// Minúsculas, sem acento e sem pontuação ("Pão, de queijo" → "pao de queijo"), para a
    /// busca achar o alimento qualquer que seja a forma de digitar.
    /// </summary>
    public static string Normalizar(string texto)
    {
        var d = texto.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(d.Length);
        var espaco = true; // evita espaço no começo e espaços duplos
        foreach (var c in d)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            if (char.IsLetterOrDigit(c)) { sb.Append(char.ToLowerInvariant(c)); espaco = false; }
            else if (!espaco) { sb.Append(' '); espaco = true; }
        }
        return sb.ToString().TrimEnd();
    }

    public static async Task<(int alimentos, int micros)> Executar(GeladeiraContext banco)
    {
        // O catálogo curado traz as definições de vitaminas; os demais arquivos só trazem alimentos.
        var arquivos = new[] { "alimentos.json", "taco.json" }
            .Select(nome => Path.Combine(AppContext.BaseDirectory, "Dados", "Sementes", nome))
            .Where(File.Exists)
            .Select(c => JsonSerializer.Deserialize<Arquivo>(File.ReadAllText(c), new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? throw new InvalidOperationException($"{c} vazio."))
            .ToList();

        // Vitaminas e minerais primeiro: os alimentos apontam para eles.
        var defs = await banco.Micronutrientes.ToDictionaryAsync(m => m.Chave);
        foreach (var m in arquivos.SelectMany(f => f.Micronutrientes ?? []))
        {
            if (!defs.TryGetValue(m.Chave, out var def))
            {
                def = new Micronutriente { Chave = m.Chave };
                banco.Micronutrientes.Add(def);
                defs[m.Chave] = def;
            }
            def.Rotulo = m.Rotulo; def.Unidade = m.Unidade; def.ValorDiario = m.Vd; def.Tipo = m.Tipo;
        }

        var existentes = await banco.Alimentos
            .Include(a => a.Micros)
            .Where(a => a.UsuarioId == null && a.Fonte != "off")
            .ToDictionaryAsync(a => a.Id);

        var totalMicros = 0;
        var totalAlimentos = 0;
        foreach (var s in arquivos.SelectMany(f => f.Alimentos))
        {
            totalAlimentos++;
            if (!existentes.TryGetValue(s.Id, out var a))
            {
                a = new Alimento { Id = s.Id, CriadoEm = Relogio.Agora };
                banco.Alimentos.Add(a);
                existentes[s.Id] = a;
            }
            a.Nome = s.Nome; a.NomeBusca = Normalizar(s.Nome); a.Categoria = s.Categoria;
            a.PorcaoPadrao = s.PorcaoPadrao; a.Kcal = s.Kcal; a.Proteina = s.Proteina;
            a.Carbo = s.Carbo; a.Gordura = s.Gordura; a.Medida = s.Medida; a.Emoji = s.Emoji;
            a.Fonte = s.Fonte ?? "catalogo";

            // Substitui as vitaminas/minerais pelo conjunto do arquivo.
            foreach (var antigo in a.Micros.Where(x => !s.Micros.ContainsKey(x.Chave)).ToList())
                a.Micros.Remove(antigo);
            foreach (var (chave, valor) in s.Micros)
            {
                var atual = a.Micros.FirstOrDefault(x => x.Chave == chave);
                if (atual is null) a.Micros.Add(new AlimentoMicro { AlimentoId = s.Id, Chave = chave, Valor = valor });
                else atual.Valor = valor;
                totalMicros++;
            }
        }

        await banco.SaveChangesAsync();
        return (totalAlimentos, totalMicros);
    }
}
