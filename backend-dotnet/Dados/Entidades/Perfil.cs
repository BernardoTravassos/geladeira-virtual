using System;
using System.Collections.Generic;

namespace GeladeiraVirtual.Api.Dados.Entidades;

public partial class Perfil
{
    public Guid Id { get; set; }

    public Guid UsuarioId { get; set; }

    public string? Nome { get; set; }

    public int? Idade { get; set; }

    public string? Sexo { get; set; }

    public int? AlturaCm { get; set; }

    public string? Objetivo { get; set; }

    public bool? PraticaExercicio { get; set; }

    public string? Intolerancias { get; set; }

    public bool? Vegano { get; set; }

    public string? PreferenciaPreparo { get; set; }

    public string? TempoDisponivel { get; set; }

    public DateTime AtualizadoEm { get; set; }

    public decimal? PesoKg { get; set; }

    /// <summary>sedentario | leve | moderado | intenso | muito_intenso (base do cálculo de calorias).</summary>
    public string? NivelAtividade { get; set; }

    /// <summary>nao | 1tri | 2tri | 3tri | lactante.</summary>
    public string? Gestacao { get; set; }

    /// <summary>Percentual de gordura corporal, se a pessoa souber (usa Katch-McArdle).</summary>
    public decimal? GorduraPct { get; set; }

    public decimal? PesoMetaKg { get; set; }

    /// <summary>leve | moderado | acelerado: ritmo desejado para emagrecer ou ganhar massa.</summary>
    public string? Ritmo { get; set; }

    /// <summary>sentado | em_pe | fisico: o dia a dia fora do treino.</summary>
    public string? RotinaDiaria { get; set; }

    public int? DiasTreino { get; set; }

    public int? MinutosTreino { get; set; }

    /// <summary>leve | moderada | intensa.</summary>
    public string? IntensidadeTreino { get; set; }

    /// <summary>Lista separada por vírgula, só valores conhecidos (ver PerfilRequest.CondicoesPermitidas).</summary>
    public string? CondicoesSaude { get; set; }

    public virtual Usuario Usuario { get; set; } = null!;
}
