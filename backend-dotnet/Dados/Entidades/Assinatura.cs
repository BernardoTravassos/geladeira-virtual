using System;
using System.Collections.Generic;

namespace GeladeiraVirtual.Api.Dados.Entidades;

public partial class Assinatura
{
    public Guid Id { get; set; }

    public Guid UsuarioId { get; set; }

    public string Plano { get; set; } = null!;

    public DateTime AtualizadoEm { get; set; }

    public virtual Usuario Usuario { get; set; } = null!;
}
