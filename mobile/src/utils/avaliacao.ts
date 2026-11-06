import { Metas } from "./nutricao";

export type Avaliacao = {
  status: "dentro" | "acima" | "abaixo";
  titulo: string; // frase curta (cabe no rodapé)
  detalhe: string; // explicação para o cartão
  linhaDia: string; // quanto do dia já foi consumido
};

const TOLERANCIA = 0.2; // ±20% da meta da refeição conta como "dentro"

/**
 * Compara a refeição com a meta da PESSOA, que já muda conforme o objetivo
 * escolhido no wizard (calcularMetas: emagrecer −400 kcal, ganhar massa +300).
 * O mesmo prato pode estar ótimo para quem quer ganhar massa e acima do ideal
 * para quem quer emagrecer, por isso o texto também depende do objetivo.
 * É um guia geral, não uma prescrição nutricional.
 */
export function avaliarRefeicao(args: {
  kcal: number;
  proteina: number;
  metas: Metas;
  fracaoDaMeta: number;
  objetivo?: string;
  kcalOutrasRefeicoes: number;
  estimativa: boolean;
}): Avaliacao | null {
  const { kcal, proteina, metas, fracaoDaMeta, objetivo, kcalOutrasRefeicoes, estimativa } = args;
  if (kcal <= 0) return null;

  const alvo = Math.round(metas.calorias * fracaoDaMeta);
  const proteinaAlvo = metas.proteina * fracaoDaMeta;
  const razao = kcal / alvo;
  const aprox = estimativa ? "≈ " : "";

  const totalDia = kcalOutrasRefeicoes + kcal;
  const linhaDia = `${aprox}${Math.round(totalDia)} de ${metas.calorias} kcal da sua meta do dia`;

  const emagrecer = objetivo === "Emagrecer";
  const ganhar = objetivo === "Ganhar massa";
  const metaDoObjetivo = emagrecer
    ? "para emagrecer"
    : ganhar
      ? "para ganhar massa"
      : "para manter o peso";

  if (razao > 1 + TOLERANCIA) {
    const excesso = Math.round(kcal - alvo);
    const estouraODia = totalDia > metas.calorias;
    return {
      status: "acima",
      titulo: "Acima do ideal para a sua dieta",
      detalhe:
        `Esta refeição está cerca de ${excesso} kcal acima do planejado (${alvo} kcal ${metaDoObjetivo}).` +
        (estouraODia ? " Com ela, você passa da meta do dia." : "") +
        (emagrecer
          ? " Para emagrecer, vale reduzir a porção de carboidrato ou de gordura."
          : ganhar
            ? " Para ganhar massa o excesso pesa menos, mas prefira que venha de proteína e carboidrato."
            : " Compense com refeições mais leves no resto do dia."),
      linhaDia,
    };
  }

  if (razao < 1 - TOLERANCIA) {
    const falta = Math.round(alvo - kcal);
    return {
      status: "abaixo",
      titulo: "Abaixo do ideal para a sua dieta",
      detalhe:
        `Faltam cerca de ${falta} kcal para o planejado (${alvo} kcal ${metaDoObjetivo}).` +
        (ganhar
          ? " Para ganhar massa, comer pouco atrapalha o resultado: acrescente uma fonte de proteína ou carboidrato."
          : emagrecer
            ? " Comer menos que o planejado pode causar fome depois e atrapalhar a dieta."
            : " Considere complementar com um alimento nutritivo."),
      linhaDia,
    };
  }

  const faltaProteina = proteina < proteinaAlvo * (1 - TOLERANCIA);
  return {
    status: "dentro",
    titulo: "Dentro da sua dieta",
    detalhe:
      `Boa! Esta refeição está dentro do planejado (${alvo} kcal ${metaDoObjetivo}).` +
      (faltaProteina
        ? ` Só a proteína está um pouco baixa (cerca de ${Math.round(proteina)} g, o ideal é perto de ${Math.round(proteinaAlvo)} g).`
        : ""),
    linhaDia,
  };
}
