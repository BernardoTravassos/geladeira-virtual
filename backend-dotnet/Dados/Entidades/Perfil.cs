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

    public virtual Usuario Usuario { get; set; } = null!;
}
