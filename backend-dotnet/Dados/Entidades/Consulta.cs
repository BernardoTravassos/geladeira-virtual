using System;
using System.Collections.Generic;

namespace GeladeiraVirtual.Api.Dados.Entidades;

public partial class Consulta
{
    public Guid Id { get; set; }

    public Guid UsuarioId { get; set; }

    public string RespostaIa { get; set; } = null!;

    public DateTime CriadoEm { get; set; }

    public virtual Usuario Usuario { get; set; } = null!;
}
