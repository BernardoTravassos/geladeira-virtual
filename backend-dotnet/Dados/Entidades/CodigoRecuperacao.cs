namespace GeladeiraVirtual.Api.Dados.Entidades;

/// <summary>
/// Código de 6 dígitos para redefinir a senha.
///
/// Guardamos o HASH do código, nunca o código em si — mesma lógica da senha.
/// Se o banco vazar, os códigos ativos não servem para ninguém entrar.
/// </summary>
public class CodigoRecuperacao
{
    public Guid Id { get; set; }

    public Guid UsuarioId { get; set; }

    public string CodigoHash { get; set; } = null!;

    /// <summary>Curto de propósito: código que não expira é chave permanente.</summary>
    public DateTime ExpiraEm { get; set; }

    /// <summary>Preenchido ao usar. Uso único — não dá para redefinir duas vezes com o mesmo código.</summary>
    public DateTime? UsadoEm { get; set; }

    /// <summary>
    /// 6 dígitos são só 1 milhão de combinações. Sem teto de tentativas, um
    /// script acerta por força bruta em pouco tempo.
    /// </summary>
    public int Tentativas { get; set; }

    public DateTime CriadoEm { get; set; }

    public virtual Usuario Usuario { get; set; } = null!;
}
