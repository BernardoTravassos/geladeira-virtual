using GeladeiraVirtual.Api.Configuracao;
using GeladeiraVirtual.Api.Dados;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Valida a configuração ANTES de montar a aplicação. Um erro aqui impede o
// boot, com mensagem explicando o que fazer.
var configuracao = ConfiguracaoApp.Carregar(builder.Configuration);
builder.Services.AddSingleton(configuracao);

builder.Services.AddDbContext<GeladeiraContext>(opcoes =>
    opcoes.UseNpgsql(ConexaoPostgres.DeUrl(configuracao.DatabaseUrl)));

builder.Services.AddControllers();

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

var app = builder.Build();

// Diagnóstico por linha de comando, não por HTTP:
//   docker compose run --rm api-dotnet --verificar-banco
if (args.Contains("--verificar-banco"))
{
    await VerificacaoBanco.Executar(app.Services);
    return;
}

app.UseCors();
app.MapControllers();

app.Run();
