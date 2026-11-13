namespace GeladeiraVirtual.Api.Dados.Entidades;

/// <summary>
/// Um alimento com os valores por 100 g. O catálogo comum tem UsuarioId nulo; os
/// criados por uma pessoa pertencem a ela e só ela os vê.
/// </summary>
public class Alimento
{
    /// <summary>Slug estável ("arroz", "pao-chapa") ou "custom-..." nos criados por pessoas.
    /// O app grava esse id nas refeições, então nunca renomeie um existente.</summary>
    public string Id { get; set; } = null!;
    public string Nome { get; set; } = null!;
    /// <summary>Nome sem acento e em minúsculas, para a busca achar "pao" em "Pão".</summary>
    public string NomeBusca { get; set; } = null!;
    public string Categoria { get; set; } = null!;
    public int PorcaoPadrao { get; set; }
    public decimal Kcal { get; set; }
    public decimal Proteina { get; set; }
    public decimal Carbo { get; set; }
    public decimal Gordura { get; set; }
    public string? Medida { get; set; }
    public string? Emoji { get; set; }
    /// <summary>"catalogo" (curado à mão), "taco", "off" (Open Food Facts) ou "pessoa".</summary>
    public string Fonte { get; set; } = "catalogo";
    /// <summary>EAN do produto (só nos vindos do Open Food Facts).</summary>
    public string? CodigoBarras { get; set; }
    public Guid? UsuarioId { get; set; }
    public DateTime CriadoEm { get; set; }
    public virtual ICollection<AlimentoMicro> Micros { get; set; } = new List<AlimentoMicro>();
}

/// <summary>Quanto de uma vitamina ou mineral há em 100 g de um alimento.</summary>
public class AlimentoMicro
{
    public string AlimentoId { get; set; } = null!;
    public string Chave { get; set; } = null!;
    public decimal Valor { get; set; }
    public virtual Alimento Alimento { get; set; } = null!;
    public virtual Micronutriente Micronutriente { get; set; } = null!;
}

/// <summary>Definição de uma vitamina/mineral: nome, unidade e valor diário de referência.</summary>
public class Micronutriente
{
    public string Chave { get; set; } = null!;
    public string Rotulo { get; set; } = null!;
    public string Unidade { get; set; } = null!;
    public decimal ValorDiario { get; set; }
    /// <summary>"vitamina" | "mineral".</summary>
    public string Tipo { get; set; } = null!;
}
