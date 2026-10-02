using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GeladeiraVirtual.Api.Dados;

/// <summary>
/// Diagnóstico de leitura do banco, para provar que o mapeamento do EF Core
/// está correto antes de qualquer escrita.
///
/// Roda só por linha de comando (`--verificar-banco`), nunca por HTTP: quem
/// executa já tem acesso ao servidor, então não cria exposição nova.
/// </summary>
public static class VerificacaoBanco
{
    public static async Task Executar(IServiceProvider servicos)
    {
        using var escopo = servicos.CreateScope();
        var banco = escopo.ServiceProvider.GetRequiredService<GeladeiraContext>();

        Console.WriteLine("=== Contagem por tabela ===");
        Console.WriteLine($"  usuarios:    {await banco.Usuarios.CountAsync()}");
        Console.WriteLine($"  perfis:      {await banco.Perfis.CountAsync()}");
        Console.WriteLine($"  consultas:   {await banco.Consultas.CountAsync()}");
        Console.WriteLine($"  assinaturas: {await banco.Assinaturas.CountAsync()}");

        Console.WriteLine();
        Console.WriteLine("=== Usuarios, com perfil e plano (join pelo EF) ===");

        var usuarios = await banco.Usuarios
            .Include(u => u.Perfil)
            .Include(u => u.Assinatura)
            .OrderBy(u => u.CriadoEm)
            .AsNoTracking()
            .ToListAsync();

        foreach (var u in usuarios)
        {
            var perfil = u.Perfil is null
                ? "perfil nao preenchido"
                : $"{u.Perfil.Nome} · {u.Perfil.PesoKg?.ToString() ?? "sem peso"} kg · {u.Perfil.Objetivo}";

            Console.WriteLine($"  {Mascarar(u.Email),-26} plano={u.Assinatura?.Plano ?? "-",-9} {perfil}");
        }

        Console.WriteLine();
        Console.WriteLine("Nenhuma escrita foi feita (AsNoTracking, só SELECT).");
    }

    /// <summary>
    /// E-mail é dado pessoal e isto vai para o log do container — então sai
    /// mascarado.
    /// </summary>
    private static string Mascarar(string email)
    {
        var partes = email.Split('@');
        var local = partes[0];
        var visivel = local.Length <= 2
            ? local
            : local[..2] + new string('*', Math.Min(local.Length - 2, 5));

        return partes.Length > 1 ? $"{visivel}@{partes[1]}" : visivel;
    }
}
