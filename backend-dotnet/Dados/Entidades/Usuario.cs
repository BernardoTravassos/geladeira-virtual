using System;
using System.Collections.Generic;

namespace GeladeiraVirtual.Api.Dados.Entidades;

public partial class Usuario
{
    public Guid Id { get; set; }

    public string Email { get; set; } = null!;

    public string SenhaHash { get; set; } = null!;

    public DateTime CriadoEm { get; set; }

    /// <summary>
    /// Contador que invalida tokens JWT já emitidos. Cada token carrega a
    /// versão vigente quando foi criado; se este número mudar, todos os
    /// tokens anteriores param de valer.
    ///
    /// É o que faz "redefinir a senha" expulsar quem estava logado — sem
    /// isso, quem invadiu a conta continuaria dentro por 30 dias mesmo
    /// depois de a pessoa trocar a senha.
    /// </summary>
    public int TokenVersao { get; set; } = 1;

    public virtual Assinatura? Assinatura { get; set; }

    public virtual ICollection<Consulta> Consultas { get; set; } = new List<Consulta>();

    public virtual ICollection<CodigoRecuperacao> CodigosRecuperacao { get; set; } = new List<CodigoRecuperacao>();

    public virtual Perfil? Perfil { get; set; }
}
