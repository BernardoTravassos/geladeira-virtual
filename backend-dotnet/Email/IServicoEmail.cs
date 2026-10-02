namespace GeladeiraVirtual.Api.Email;

public interface IServicoEmail
{
    Task EnviarAsync(
        string destinatario,
        string assunto,
        string corpoTexto,
        CancellationToken cancelamento = default);
}
