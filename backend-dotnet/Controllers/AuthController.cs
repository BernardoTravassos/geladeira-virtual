using GeladeiraVirtual.Api.Autenticacao;
using GeladeiraVirtual.Api.Contratos;
using GeladeiraVirtual.Api.Dados;
using GeladeiraVirtual.Api.Dados.Entidades;
using GeladeiraVirtual.Api.Email;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace GeladeiraVirtual.Api.Controllers;

[ApiController]
[Route("auth")]
public sealed class AuthController(
    GeladeiraContext banco,
    ServicoJwt jwt,
    IServicoEmail servicoEmail,
    ILogger<AuthController> log) : ControllerBase
{
    private static readonly TimeSpan ValidadeCodigo = TimeSpan.FromMinutes(15);
    private const int MaxTentativasCodigo = 5;

    // ───────────────────────────── cadastro ─────────────────────────────

    [HttpPost("register")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("auth")]
    public async Task<IActionResult> Cadastrar([FromBody] CadastroRequest requisicao)
    {
        var email = Normalizar(requisicao.Email);

        var usuario = new Usuario
        {
            Email = email,
            SenhaHash = ServicoSenha.Gerar(requisicao.Senha),
            CriadoEm = Relogio.Agora,
            TokenVersao = 1,
            Assinatura = new Assinatura
            {
                Plano = "gratuito",
                AtualizadoEm = Relogio.Agora,
            },
        };

        banco.Usuarios.Add(usuario);

        try
        {
            await banco.SaveChangesAsync();
        }
        catch (DbUpdateException erro) when (EhEmailDuplicado(erro))
        {
            // Deixamos o banco decidir, em vez de consultar antes e inserir
            // depois. Entre a consulta e a inserção cabe outra requisição com
            // o mesmo e-mail — a restrição UNIQUE não tem essa brecha.
            return Conflict(new { error = "E-mail já cadastrado" });
        }

        return StatusCode(StatusCodes.Status201Created,
            new { token = jwt.Gerar(usuario.Id, usuario.TokenVersao) });
    }

    // ────────────────────────────── login ───────────────────────────────

    [HttpPost("login")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("auth")]
    public async Task<IActionResult> Entrar([FromBody] LoginRequest requisicao)
    {
        var email = Normalizar(requisicao.Email);

        var usuario = await banco.Usuarios.SingleOrDefaultAsync(u => u.Email == email);

        if (usuario is null)
        {
            // Gasta o mesmo tempo de um Verify real: sem isso, e-mail
            // inexistente responde mais rápido e o atraso entrega quem tem conta.
            ServicoSenha.ConferirEmFalso();
            return Unauthorized(new { error = "E-mail ou senha incorretos" });
        }

        if (!ServicoSenha.Confere(requisicao.Senha, usuario.SenhaHash))
        {
            // Mensagem idêntica à de e-mail inexistente, de propósito.
            return Unauthorized(new { error = "E-mail ou senha incorretos" });
        }

        return Ok(new { token = jwt.Gerar(usuario.Id, usuario.TokenVersao) });
    }

    // ───────────────────────── esqueci a senha ──────────────────────────

    [HttpPost("forgot-password")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("auth-rigido")]
    public async Task<IActionResult> EsqueciSenha([FromBody] EsqueciSenhaRequest requisicao)
    {
        var email = Normalizar(requisicao.Email);
        var usuario = await banco.Usuarios.SingleOrDefaultAsync(u => u.Email == email);

        if (usuario is not null)
        {
            // Códigos anteriores que ainda valiam deixam de valer: só o mais
            // recente funciona.
            await banco.CodigosRecuperacao
                .Where(c => c.UsuarioId == usuario.Id && c.UsadoEm == null)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.UsadoEm, Relogio.Agora));

            var codigo = ServicoJwt.GerarCodigoNumerico();

            banco.CodigosRecuperacao.Add(new CodigoRecuperacao
            {
                UsuarioId = usuario.Id,
                CodigoHash = ServicoSenha.Gerar(codigo),
                ExpiraEm = Relogio.Agora.Add(ValidadeCodigo),
                CriadoEm = Relogio.Agora,
            });

            await banco.SaveChangesAsync();

            try
            {
                await servicoEmail.EnviarAsync(
                    usuario.Email,
                    "Geladeira Virtual — código para redefinir a senha",
                    $"Seu código é: {codigo}\n\n" +
                    $"Ele vale por {ValidadeCodigo.TotalMinutes:0} minutos e só pode ser usado uma vez.\n\n" +
                    "Se não foi você que pediu, ignore este e-mail: sua senha continua a mesma.\n");
            }
            catch (Exception erro)
            {
                // Falha de envio não pode mudar a resposta: se mudasse, a
                // diferença entre 200 e 500 revelaria quais e-mails existem.
                log.LogError(erro, "Falha ao enviar código de recuperação");
            }
        }

        // Resposta IDÊNTICA exista ou não a conta. Responder 404 para e-mail
        // inexistente transformaria este endpoint num detector de quem tem
        // conta no app.
        return Ok(new { message = "Se existe uma conta com esse e-mail, enviamos um código." });
    }

    // ──────────────────────── redefinir a senha ─────────────────────────

    [HttpPost("reset-password")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("auth")]
    public async Task<IActionResult> RedefinirSenha([FromBody] RedefinirSenhaRequest requisicao)
    {
        var email = Normalizar(requisicao.Email);
        var usuario = await banco.Usuarios.SingleOrDefaultAsync(u => u.Email == email);

        var agora = Relogio.Agora;

        var registro = usuario is null
            ? null
            : await banco.CodigosRecuperacao
                .Where(c => c.UsuarioId == usuario.Id && c.UsadoEm == null && c.ExpiraEm > agora)
                .OrderByDescending(c => c.CriadoEm)
                .FirstOrDefaultAsync();

        // Mensagem única para todos os casos (sem conta, sem código, código
        // expirado, código errado): cada mensagem distinta seria uma pista.
        const string generica = "Código inválido ou expirado. Peça um novo.";

        if (usuario is null || registro is null)
        {
            ServicoSenha.ConferirEmFalso();
            return BadRequest(new { error = generica });
        }

        if (registro.Tentativas >= MaxTentativasCodigo)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests,
                new { error = "Tentativas demais. Peça um código novo." });
        }

        if (!ServicoSenha.Confere(requisicao.Codigo, registro.CodigoHash))
        {
            registro.Tentativas++;
            await banco.SaveChangesAsync();
            return BadRequest(new { error = generica });
        }

        usuario.SenhaHash = ServicoSenha.Gerar(requisicao.NovaSenha);

        // Expulsa todas as sessões abertas. A pessoa troca a senha JUSTAMENTE
        // porque suspeita que alguém tem acesso — sem isto, o invasor
        // continuaria dentro com o token antigo por até 30 dias.
        usuario.TokenVersao++;

        registro.UsadoEm = agora;

        await banco.SaveChangesAsync();

        log.LogInformation("Senha redefinida; sessões anteriores invalidadas (usuário {Id})", usuario.Id);

        return Ok(new { message = "Senha alterada com sucesso" });
    }

    // ───────────────────────────── auxiliares ───────────────────────────

    /// <summary>
    /// Sem isto, "Bernardo@Hotmail.com" e "bernardo@hotmail.com" viram duas
    /// contas diferentes e a pessoa não entende por que a senha "não funciona".
    /// </summary>
    private static string Normalizar(string email) => email.Trim().ToLowerInvariant();

    private static bool EhEmailDuplicado(DbUpdateException erro) =>
        erro.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}
