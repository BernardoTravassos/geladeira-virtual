using System.ComponentModel.DataAnnotations;

namespace GeladeiraVirtual.Api.Contratos;

/// <summary>
/// Cadastro. Senha mínima de 8 — mais exigente que os 6 do backend antigo.
/// O máximo de 72 não é capricho: o bcrypt IGNORA tudo além de 72 bytes, em
/// silêncio. Sem esse limite, duas senhas longas e diferentes poderiam abrir
/// a mesma conta.
/// </summary>
public sealed class CadastroRequest
{
    [Required(ErrorMessage = "E-mail é obrigatório")]
    [EmailAddress(ErrorMessage = "E-mail inválido")]
    [MaxLength(255, ErrorMessage = "E-mail longo demais")]
    public string Email { get; set; } = "";

    [Required(ErrorMessage = "Senha é obrigatória")]
    [MinLength(8, ErrorMessage = "A senha precisa de pelo menos 8 caracteres")]
    [MaxLength(72, ErrorMessage = "Senha longa demais")]
    // O atributo exige que o padrão case com a senha INTEIRA, daí o [\s\S]* nas pontas.
    [RegularExpression(@"^[\s\S]*[A-ZÀ-ÖØ-Þ][\s\S]*$", ErrorMessage = "A senha precisa ter pelo menos uma letra maiúscula")]
    public string Senha { get; set; } = "";
}

/// <summary>
/// Login NÃO tem tamanho mínimo de senha, de propósito: os usuários que já
/// existem se cadastraram quando o mínimo era 6. Exigir 8 aqui trancaria
/// essas pessoas fora da própria conta.
/// </summary>
public sealed class LoginRequest
{
    [Required(ErrorMessage = "E-mail é obrigatório")]
    [EmailAddress(ErrorMessage = "E-mail inválido")]
    [MaxLength(255, ErrorMessage = "E-mail longo demais")]
    public string Email { get; set; } = "";

    [Required(ErrorMessage = "Senha é obrigatória")]
    [MaxLength(72, ErrorMessage = "Senha longa demais")]
    public string Senha { get; set; } = "";
}

public sealed class EsqueciSenhaRequest
{
    [Required]
    [EmailAddress(ErrorMessage = "E-mail inválido")]
    [MaxLength(255, ErrorMessage = "E-mail longo demais")]
    public string Email { get; set; } = "";
}

public sealed class RedefinirSenhaRequest
{
    [Required]
    [EmailAddress(ErrorMessage = "E-mail inválido")]
    [MaxLength(255, ErrorMessage = "E-mail longo demais")]
    public string Email { get; set; } = "";

    [Required]
    [RegularExpression(@"^\d{6}$", ErrorMessage = "O código tem 6 dígitos")]
    public string Codigo { get; set; } = "";

    [Required]
    [MinLength(8, ErrorMessage = "A senha precisa de pelo menos 8 caracteres")]
    [MaxLength(72, ErrorMessage = "Senha longa demais")]
    // O atributo exige que o padrão case com a senha INTEIRA, daí o [\s\S]* nas pontas.
    [RegularExpression(@"^[\s\S]*[A-ZÀ-ÖØ-Þ][\s\S]*$", ErrorMessage = "A senha precisa ter pelo menos uma letra maiúscula")]
    public string NovaSenha { get; set; } = "";
}

public sealed class AlterarSenhaRequest
{
    [Required(ErrorMessage = "Informe a senha atual")]
    [MaxLength(72, ErrorMessage = "Senha longa demais")]
    public string SenhaAtual { get; set; } = "";

    [Required(ErrorMessage = "Informe a nova senha")]
    [MinLength(8, ErrorMessage = "A senha precisa de pelo menos 8 caracteres")]
    [MaxLength(72, ErrorMessage = "Senha longa demais")]
    // O atributo exige que o padrão case com a senha INTEIRA, daí o [\s\S]* nas pontas.
    [RegularExpression(@"^[\s\S]*[A-ZÀ-ÖØ-Þ][\s\S]*$", ErrorMessage = "A senha precisa ter pelo menos uma letra maiúscula")]
    public string NovaSenha { get; set; } = "";
}
