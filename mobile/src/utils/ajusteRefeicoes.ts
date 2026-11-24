/**
 * Redistribui a meta do dia entre as refeições que ainda faltam.
 *
 * Cada refeição tem uma fatia da meta. Quando a pessoa registra uma refeição acima
 * (ou abaixo) da fatia, a diferença é repartida entre as pendentes, na proporção da
 * fatia de cada uma. Travas: cada pendente fica entre 50% e 130% do original (e,
 * para quem quer emagrecer, nunca sobe), e diferenças pequenas são ignoradas.
 */
export type AjusteRefeicao = { chave: string; kcalBase: number; kcalAjustada: number };

export type ResultadoAjuste = {
  /** Só as refeições pendentes que mudaram. */
  ajustes: Record<string, AjusteRefeicao>;
  /** Frase para mostrar sob a lista; null quando nada foi ajustado. */
  aviso: string | null;
};

const LIMIAR_KCAL = 50;
const arred5 = (n: number) => Math.round(n / 5) * 5;

export function ajustarPendentes(args: {
  metaKcal: number;
  refeicoes: { chave: string; nome: string; fracaoDaMeta: number; kcalConsumidas?: number }[];
  objetivo?: string;
}): ResultadoAjuste {
  const { metaKcal, refeicoes, objetivo } = args;
  const feitas = refeicoes.filter((r) => r.kcalConsumidas !== undefined);
  const pendentes = refeicoes.filter((r) => r.kcalConsumidas === undefined);
  if (feitas.length === 0 || pendentes.length === 0) return { ajustes: {}, aviso: null };

  const planejado = feitas.reduce((s, r) => s + metaKcal * r.fracaoDaMeta, 0);
  const consumido = feitas.reduce((s, r) => s + (r.kcalConsumidas ?? 0), 0);
  const excesso = consumido - planejado; // > 0: comeu a mais
  if (Math.abs(excesso) < LIMIAR_KCAL) return { ajustes: {}, aviso: null };

  const somaFracoes = pendentes.reduce((s, r) => s + r.fracaoDaMeta, 0);
  const ajustes: Record<string, AjusteRefeicao> = {};
  for (const r of pendentes) {
    const base = metaKcal * r.fracaoDaMeta;
    const teto = objetivo === "Emagrecer" ? base : base * 1.3;
    const novo = Math.min(Math.max(base - (excesso * r.fracaoDaMeta) / somaFracoes, base * 0.5), teto);
    const kcalAjustada = arred5(novo);
    if (Math.abs(kcalAjustada - arred5(base)) >= 5) ajustes[r.chave] = { chave: r.chave, kcalBase: arred5(base), kcalAjustada };
  }
  const mudadas = pendentes.filter((r) => ajustes[r.chave]);
  if (mudadas.length === 0) return { ajustes: {}, aviso: null };

  const dif = Math.round(Math.abs(excesso));
  const abertura = excesso > 0 ? `Você passou cerca de ${dif} kcal do planejado` : `Você comeu cerca de ${dif} kcal a menos que o planejado`;
  const lista = mudadas.map((r) => `${r.nome} (~${ajustes[r.chave].kcalAjustada} kcal)`).join(", ");
  return { ajustes, aviso: `${abertura}. Ajustamos as próximas refeições: ${lista}.` };
}
