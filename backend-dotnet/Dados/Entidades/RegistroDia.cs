namespace GeladeiraVirtual.Api.Dados.Entidades;

/// <summary>
/// Um "pacote" de dados de um dia da pessoa: as refeições, a água ou os treinos.
///
/// O app guarda cada um desses como um JSON por dia (uma chave no aparelho).
/// Aqui guardamos exatamente o mesmo JSON, indexado por usuário + tipo + data.
/// Assim o servidor não precisa conhecer o formato interno de cada registro, e
/// o app pode evoluir sem uma migration a cada campo novo.
/// </summary>
public class RegistroDia
{
    public Guid Id { get; set; }

    public Guid UsuarioId { get; set; }

    /// <summary>"refeicoes" | "agua" | "treinos".</summary>
    public string Tipo { get; set; } = null!;

    /// <summary>Dia local da pessoa (sem fuso): 2026-11-08.</summary>
    public DateOnly Data { get; set; }

    /// <summary>JSON bruto enviado pelo app.</summary>
    public string Conteudo { get; set; } = null!;

    public DateTime AtualizadoEm { get; set; }

    public virtual Usuario Usuario { get; set; } = null!;
}
