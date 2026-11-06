using System.ComponentModel.DataAnnotations;

namespace GeladeiraVirtual.Api.Contratos;

/// <summary>
/// As respostas do wizard.
///
/// Item 7 da lista de segurança: o backend antigo aceitava `z.string()` sem
/// limite nestes campos, e o banco é que reclamava — derrubando a API inteira
/// com um nome de 300 letras. Aqui cada campo tem faixa ou lista fechada, e a
/// recusa vira um 400 explicativo.
///
/// As listas abaixo têm que bater EXATAMENTE com as opções do WizardScreen,
/// acentos inclusive.
/// </summary>
public sealed class PerfilRequest
{
    [Required(ErrorMessage = "Nome é obrigatório")]
    [MinLength(1)]
    [MaxLength(100, ErrorMessage = "Nome longo demais")]
    public string Nome { get; set; } = "";

    // Os limites são double (13d, 120d) e não int: com limites int, o
    // validador converte o valor recebido para int ANTES de comparar — e um
    // número grande demais estoura a conversão, virando erro 500 em vez do
    // 400 explicativo que a gente quer.
    //
    // long, e não int, de propósito: um número que não cabe no tipo faz o
    // JSON inteiro falhar ao ser lido, e o erro vira "campo obrigatório" —
    // mensagem que não ajuda ninguém. Com um tipo largo, o valor entra e o
    // Range explica de verdade qual é o problema.
    [Range(13d, 120d, ErrorMessage = "Idade deve estar entre 13 e 120")]
    public long Idade { get; set; }

    [AllowedValues("Masculino", "Feminino", "Outro", ErrorMessage = "Sexo inválido")]
    public string Sexo { get; set; } = "";

    [Range(50d, 250d, ErrorMessage = "Altura deve estar entre 50 e 250 cm")]
    public long AlturaCm { get; set; }

    [Range(20.0, 400.0, ErrorMessage = "Peso deve estar entre 20 e 400 kg")]
    public decimal PesoKg { get; set; }

    [AllowedValues("Emagrecer", "Ganhar massa", "Manter o peso", "Comer mais saudável",
        ErrorMessage = "Objetivo inválido")]
    public string Objetivo { get; set; } = "";

    public bool PraticaExercicio { get; set; }

    /// <summary>
    /// Opcional: apps antigos não enviam. RegularExpression ignora nulo, ao
    /// contrário de AllowedValues, que recusaria a ausência do campo.
    /// </summary>
    [RegularExpression("^(sedentario|leve|moderado|intenso|muito_intenso)$",
        ErrorMessage = "Nível de atividade inválido")]
    public string? NivelAtividade { get; set; }

    [MaxLength(300, ErrorMessage = "Texto de intolerâncias longo demais")]
    public string? Intolerancias { get; set; }

    public bool Vegano { get; set; }

    [AllowedValues("Prático", "Elaborado", ErrorMessage = "Preferência de preparo inválida")]
    public string PreferenciaPreparo { get; set; } = "";

    [AllowedValues("Pouco tempo", "Tempo razoável", "Bastante tempo",
        ErrorMessage = "Tempo disponível inválido")]
    public string TempoDisponivel { get; set; } = "";
}
