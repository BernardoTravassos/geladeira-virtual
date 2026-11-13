using GeladeiraVirtual.Api.Configuracao;
using System.Threading.RateLimiting;
using GeladeiraVirtual.Api.Autenticacao;
using GeladeiraVirtual.Api.Dados;
using GeladeiraVirtual.Api.Email;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Valida a configuração ANTES de montar a aplicação. Um erro aqui impede o
// boot, com mensagem explicando o que fazer.
var configuracao = ConfiguracaoApp.Carregar(builder.Configuration);
builder.Services.AddSingleton(configuracao);

builder.Services.AddDbContext<GeladeiraContext>(opcoes =>
    opcoes.UseNpgsql(ConexaoPostgres.DeUrl(configuracao.DatabaseUrl)));

builder.Services.AddScoped<IServicoEmail, ServicoEmailSmtp>();
builder.Services.AddScoped<ServicoJwt>();
builder.Services.AddHttpClient<GeladeiraVirtual.Api.Alimentos.ServicoOpenFoodFacts>(c => c.Timeout = TimeSpan.FromSeconds(8));
builder.Services.AddSingleton<GeladeiraVirtual.Api.IA.IServicoAnaliseRefeicao, GeladeiraVirtual.Api.IA.ServicoAnaliseRefeicao>();
builder.Services.AdicionarAutenticacaoJwt(new ServicoJwt(configuracao));
builder.Services.AddAuthorization();

// Força bruta de senha: sem teto, 10.000 tentativas por minuto são possíveis.
// "auth-rigido" é mais apertado porque /forgot-password dispara envio de
// e-mail — sem limite, vira ferramenta de bombardeio de caixa alheia.
builder.Services.AddRateLimiter(opcoes =>
{
    opcoes.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    opcoes.AddPolicy("auth", contexto => RateLimitPartition.GetFixedWindowLimiter(
        contexto.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(15) }));

    opcoes.AddPolicy("auth-rigido", contexto => RateLimitPartition.GetFixedWindowLimiter(
        contexto.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 3, Window = TimeSpan.FromMinutes(15) }));

    // Cada análise de foto custa dinheiro: teto por USUÁRIO (não por IP), para
    // que um token vazado ou um script não esgote o orçamento da API.
    opcoes.AddPolicy("analise", contexto => RateLimitPartition.GetFixedWindowLimiter(
        contexto.User.FindFirst("usuarioId")?.Value ?? contexto.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromHours(1) }));

    opcoes.OnRejected = async (contexto, _) =>
    {
        contexto.HttpContext.Response.ContentType = "application/json";
        await contexto.HttpContext.Response.WriteAsync(
            """{"error":"Muitas tentativas. Tente novamente em alguns minutos."}""");
    };
});

builder.Services.AddControllers();

// Por padrão o ASP.NET devolve erro de validação no formato ProblemDetails.
// O app espera {"error": "..."} — este trecho mantém o contrato.
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(opcoes =>
{
    opcoes.InvalidModelStateResponseFactory = contexto =>
    {
        // Só repassamos mensagens que NÓS escrevemos nas anotações de
        // validação. Elas vêm com a chave igual ao nome da propriedade
        // ("Nome", "Idade"). Erros do interpretador de JSON vêm com chave em
        // formato de caminho ("$", "$.idade") ou com exceção anexada, e a
        // mensagem deles é em inglês e expõe detalhe interno — essas viram
        // um texto genérico.
        var nossa = contexto.ModelState
            .Where(entrada => !string.IsNullOrEmpty(entrada.Key) && !entrada.Key.StartsWith('$'))
            .SelectMany(entrada => entrada.Value?.Errors ?? [])
            .Where(e => e.Exception is null)
            .Select(e => e.ErrorMessage)
            // Toda mensagem nossa está em português e vem de uma anotação de
            // validação. As geradas pelo ASP.NET começam com "The " ("The
            // requisicao field is required.") — essas não vão para o cliente.
            .FirstOrDefault(m => !string.IsNullOrWhiteSpace(m) && !m.StartsWith("The "));

        var mensagem = nossa ?? "Dados inválidos — confira os valores enviados";

        return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new { error = mensagem });
    };
});

// O app nativo não passa por CORS (não existe navegador no meio), então a
// lista padrão é vazia. Preencha CORS_ORIGINS só se houver versão web.
builder.Services.AddCors(opcoes =>
{
    opcoes.AddDefaultPolicy(politica =>
    {
        if (configuracao.CorsOrigins.Length > 0)
        {
            politica.WithOrigins(configuracao.CorsOrigins).AllowAnyHeader().AllowAnyMethod();
        }
    });
});

if (configuracao.ConfiarNoProxy)
{
    builder.Services.Configure<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>(opcoes =>
    {
        opcoes.ForwardedHeaders =
            Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor |
            Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;

        // Por padrão só um proxy em loopback é aceito. O túnel chega pela rede
        // do Docker, então precisamos aceitar o que vier — por isso este modo é
        // opt-in e documentado como "só atrás de um proxy seu".
        opcoes.KnownProxies.Clear();
        opcoes.KnownIPNetworks.Clear();
        opcoes.ForwardLimit = 1;   // só o último salto: um cabeçalho encadeado não vira IP do atacante
    });
}

var app = builder.Build();

// Precisa ser o PRIMEIRO do pipeline: o limitador de tentativas e os logs
// leem o IP depois dele.
if (configuracao.ConfiarNoProxy)
{
    app.UseForwardedHeaders();
    app.Logger.LogWarning(
        "TRUST_PROXY ligado: o IP do cliente vem de X-Forwarded-For. " +
        "Use só com a API atrás de um túnel/proxy seu.");
}

if (configuracao.Email is null)
{
    app.Logger.LogWarning(
        "Envio de e-mail DESLIGADO: faltam variáveis SMTP em backend/.env " +
        "(provavelmente a SMTP_PASSWORD, que é a chave de API do Resend). " +
        "A recuperação de senha não vai funcionar até isso ser preenchido.");
}

// Diagnóstico por linha de comando, não por HTTP:
//   docker compose run --rm api --verificar-banco
if (args.Contains("--verificar-banco"))
{
    await VerificacaoBanco.Executar(app.Services);
    return;
}

// Aplica as migrations pendentes. Substitui o schema.sql rodado à mão, que
// era fácil de esquecer — foi assim que a coluna peso_kg passou a existir no
// arquivo e não no banco.
//   docker compose run --rm api --migrar
if (args.Contains("--migrar"))
{
    using var escopo = app.Services.CreateScope();
    var banco = escopo.ServiceProvider.GetRequiredService<GeladeiraContext>();

    var pendentes = (await banco.Database.GetPendingMigrationsAsync()).ToList();
    if (pendentes.Count == 0)
    {
        Console.WriteLine("Banco já está atualizado — nenhuma migration pendente.");
    }
    else
    {
        Console.WriteLine($"Aplicando {pendentes.Count} migration(s):");
        foreach (var m in pendentes) Console.WriteLine($"  · {m}");
        await banco.Database.MigrateAsync();
    }

    // Catálogo de alimentos e vitaminas: pode repetir sem problema.
    var (qtdAlimentos, qtdMicros) = await GeladeiraVirtual.Api.Dados.SementeAlimentos.Executar(banco);
    Console.WriteLine($"Catálogo de alimentos: {qtdAlimentos} alimentos, {qtdMicros} valores de vitaminas/minerais.");
    Console.WriteLine("Concluído.");
    return;
}

//   docker compose run --rm api --testar-email seu@email.com
if (args.Contains("--testar-email"))
{
    var destinatario = args.SkipWhile(a => a != "--testar-email").Skip(1).FirstOrDefault();
    Environment.ExitCode = await TesteEmail.Executar(app.Services, destinatario);
    return;
}

// Qualquer exceção não tratada vira 500 em JSON, com o motivo no log do
// servidor. O ASP.NET não derruba o processo por causa disso — diferente do
// Node, onde uma promessa rejeitada encerrava a API inteira.
app.UseExceptionHandler(ramo => ramo.Run(async contexto =>
{
    contexto.Response.StatusCode = StatusCodes.Status500InternalServerError;
    contexto.Response.ContentType = "application/json";

    var erro = contexto.Features
        .Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;

    // Detalhe só fora de produção: mensagens do Postgres revelam nomes de
    // tabelas e colunas.
    var corpo = configuracao.MostrarErros && erro is not null
        ? System.Text.Json.JsonSerializer.Serialize(
            new { error = "Erro interno no servidor", detalhe = erro.Message },
            GeladeiraVirtual.Api.Contratos.JsonPadrao.Opcoes)
        : """{"error":"Erro interno no servidor"}""";

    await contexto.Response.WriteAsync(corpo);
}));

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Caminho que não existe: devolve JSON, não a página HTML padrão.
app.MapFallback(() => Results.NotFound(new { error = "Rota não encontrada" }));

app.Run();
