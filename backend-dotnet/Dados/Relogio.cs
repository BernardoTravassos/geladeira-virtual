namespace GeladeiraVirtual.Api.Dados;

public static class Relogio
{
    /// <summary>
    /// Horário UTC, mas sem a marcação de fuso.
    ///
    /// As colunas de data do banco são `timestamp without time zone` — foram
    /// criadas assim pelo backend em TypeScript. O Npgsql se recusa a gravar
    /// um DateTime com Kind=Utc nesse tipo de coluna, por achar que é engano
    /// de quem escreveu.
    ///
    /// O VALOR continua sendo UTC (o container do banco roda em UTC e as datas
    /// já existentes estão em UTC); só a etiqueta é removida. Assim o C# grava
    /// exatamente no mesmo formato que o backend antigo.
    /// </summary>
    public static DateTime Agora => DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);
}
