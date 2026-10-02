using Microsoft.AspNetCore.Mvc;

namespace GeladeiraVirtual.Api.Controllers;

[ApiController]
public sealed class HealthController : ControllerBase
{
    /// <summary>
    /// Rota de verificação — confirma que a API está no ar.
    /// Precisa responder exatamente {"status":"ok"}, igual ao backend em
    /// TypeScript, porque é o contrato que o app já conhece.
    /// </summary>
    [HttpGet("/health")]
    public IActionResult Health() => Ok(new { status = "ok" });
}
