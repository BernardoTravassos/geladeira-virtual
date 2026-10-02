using System;
using System.Collections.Generic;

namespace GeladeiraVirtual.Api.Dados.Entidades;

public partial class Usuario
{
    public Guid Id { get; set; }

    public string Email { get; set; } = null!;

    public string SenhaHash { get; set; } = null!;

    public DateTime CriadoEm { get; set; }

    public virtual Assinatura? Assinatura { get; set; }

    public virtual ICollection<Consulta> Consultas { get; set; } = new List<Consulta>();

    public virtual Perfil? Perfil { get; set; }
}
