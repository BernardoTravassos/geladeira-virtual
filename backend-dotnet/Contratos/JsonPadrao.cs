using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;

namespace GeladeiraVirtual.Api.Contratos;

public static class JsonPadrao
{
    /// <summary>
    /// Opções para os trechos que serializam JSON à mão (resposta 401 e o
    /// tratador de erro), fora do pipeline do MVC.
    ///
    /// Por padrão o System.Text.Json escapa acentos ("não" vira "não").
    /// É JSON válido e o app decodifica certo, mas fica diferente do que o
    /// MVC produz — e log e depuração ficam ilegíveis. O encoder abaixo
    /// mantém os caracteres latinos como são.
    ///
    /// "Unsafe" no nome se refere a inserir JSON dentro de HTML, o que não é
    /// o caso aqui: a resposta vai para um app nativo, não para um navegador.
    /// </summary>
    public static readonly JsonSerializerOptions Opcoes = new()
    {
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
    };
}
