/**
 * Lê um número digitado em português: aceita vírgula OU ponto como separador
 * decimal ("77,5" e "77.5" valem o mesmo).
 *
 * Existe porque o teclado numérico do celular escreve a vírgula em aparelhos
 * configurados em português, e `Number("77,5")` devolve NaN — o app enviava
 * um valor inválido e só descobria o erro na última pergunta.
 *
 * Devolve null para qualquer coisa que não seja um número simples ("77,5kg",
 * "7,,5", "1.000,5", vazio), em vez de adivinhar o que a pessoa quis dizer.
 */
export function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(limpo)) return null;
  return Number(limpo);
}

export type RegraNumero = {
  /** Como a pergunta aparece nas mensagens de erro: "A idade", "O peso". */
  artigoRotulo: string;
  min: number;
  max: number;
  unidade?: string;
  /** Para campos que o banco guarda como inteiro. "baixo" = idade (37,9 anos → 37). */
  inteiro?: "baixo" | "proximo";
  /** Casas decimais a manter, quando não for inteiro. */
  casas?: number;
  /**
   * Detecta quem digitou na unidade errada. Valores MENORES que `menorQue` não
   * existem na unidade pedida, então só podem ser outra: altura de 1,75 não é
   * 1,75 cm — é 1,75 m. Em vez de a mensagem genérica de faixa ("entre 50 e
   * 250"), a pessoa recebe a explicação do erro de formato.
   */
  outraUnidade?: { menorQue: number; mensagem: string };
};

export type ResultadoNumero = { valor: number } | { erro: string };

/**
 * Valida a resposta contra a regra da pergunta. As faixas precisam bater com
 * as do backend (PerfilRequest.cs): o que o app aceita, a API tem que aceitar,
 * senão a pessoa só descobre o problema depois de responder tudo.
 */
export function interpretarNumero(texto: string, regra: RegraNumero): ResultadoNumero {
  const lido = lerNumero(texto);
  if (lido === null) {
    return { erro: "Digite apenas números. Pode usar vírgula, como em 70,5." };
  }

  if (regra.outraUnidade && lido < regra.outraUnidade.menorQue) {
    return { erro: regra.outraUnidade.mensagem };
  }

  let valor = lido;
  if (regra.inteiro === "baixo") valor = Math.floor(lido);
  else if (regra.inteiro === "proximo") valor = Math.round(lido);
  else if (regra.casas !== undefined) {
    const fator = 10 ** regra.casas;
    valor = Math.round(lido * fator) / fator;
  }

  if (valor < regra.min || valor > regra.max) {
    const un = regra.unidade ? ` ${regra.unidade}` : "";
    return { erro: `${regra.artigoRotulo} deve estar entre ${regra.min} e ${regra.max}${un}.` };
  }

  return { valor };
}
