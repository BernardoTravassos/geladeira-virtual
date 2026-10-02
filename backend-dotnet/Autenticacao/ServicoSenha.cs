namespace GeladeiraVirtual.Api.Autenticacao;

public static class ServicoSenha
{
    /// <summary>
    /// Custo 11. O backend em TypeScript usava 10; subir um nível dobra o
    /// tempo de cálculo, o que atrapalha ataque de força bruta e é
    /// imperceptível num login único.
    /// Hashes antigos (custo 10) continuam válidos: o custo fica gravado
    /// dentro do próprio hash e o Verify o respeita.
    /// </summary>
    private const int Custo = 11;

    public static string Gerar(string senha) =>
        BCrypt.Net.BCrypt.HashPassword(senha, Custo);

    public static bool Confere(string senha, string hash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(senha, hash);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            // Hash corrompido ou em formato desconhecido: trata como senha
            // errada em vez de derrubar a requisição.
            return false;
        }
    }

    /// <summary>
    /// Gasta o mesmo tempo de um Verify real, para usar quando o e-mail não
    /// existe. Sem isso, "e-mail inexistente" responderia visivelmente mais
    /// rápido que "senha errada" — e esse atraso entrega quem tem conta.
    /// </summary>
    public static void ConferirEmFalso() =>
        BCrypt.Net.BCrypt.Verify("senha-que-nao-existe",
            "$2a$11$0000000000000000000000.0000000000000000000000000000000000");
}
