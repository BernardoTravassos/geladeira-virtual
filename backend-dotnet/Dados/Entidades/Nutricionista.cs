namespace GeladeiraVirtual.Api.Dados.Entidades;

/// <summary>Dados profissionais de quem tem papel "nutricionista" em usuarios.</summary>
public class Nutricionista
{
    public Guid UsuarioId { get; set; }
    public string Nome { get; set; } = null!;
    public string Crn { get; set; } = null!;
    public DateTime CriadoEm { get; set; }
    public virtual Usuario Usuario { get; set; } = null!;
}

/// <summary>
/// Liga um nutricionista a um paciente. Nasce "pendente", só com o código do
/// convite; quando o paciente informa o código e consente, vira "ativo".
/// </summary>
public class Vinculo
{
    public Guid Id { get; set; }
    public Guid NutricionistaId { get; set; }
    public Guid? PacienteId { get; set; }
    public string Codigo { get; set; } = null!;
    /// <summary>"pendente" | "ativo" | "encerrado".</summary>
    public string Status { get; set; } = "pendente";
    public DateTime CriadoEm { get; set; }
    public DateTime? AceitoEm { get; set; }
    public virtual Usuario Nutricionista { get; set; } = null!;
    public virtual Usuario? Paciente { get; set; }
}
