import { alimentoPorId, nutrientes, Alimento } from "../data/alimentos";
import { INFO_ALIMENTO, MICROS, Micro } from "../data/micronutrientes";

/** Ilustração padrão quando o alimento não tem uma própria. */
const EMOJI_CATEGORIA: Record<string, string> = {
  carboidratos: "🍚", paes: "🍞", proteinas: "🍗", vegetais: "🥗", frutas: "🍎",
  laticinios: "🥛", doces: "🍰", bebidas: "🥤", gorduras: "🫒", pratos: "🍽️",
};

export type ItemPlano = { alimentoId: string; gramas: number; medida?: string };

export type MicroValor = { chave: Micro; rotulo: string; valor: number; unidade: string; vd: number; tipo: "vitamina" | "mineral" };

export type ItemDetalhado = {
  alimento: Alimento;
  emoji: string;
  gramas: number;
  medida?: string;
  macros: { kcal: number; proteina: number; carbo: number; gordura: number };
  micros: MicroValor[];
};

/** Mantém 1 casa decimal só quando ajuda (0,4 mg) e some com zeros inúteis (120 mg). */
export const formatarQuantidade = (n: number) => (n >= 10 ? Math.round(n) : +n.toFixed(1)).toLocaleString("pt-BR");

function microsDe(alimentoId: string, gramas: number): MicroValor[] {
  const info = INFO_ALIMENTO[alimentoId];
  if (!info) return [];
  const f = gramas / 100;
  return (Object.keys(info.micros) as Micro[])
    .map((k) => {
      const valor = (info.micros[k] ?? 0) * f;
      const m = MICROS[k];
      return { chave: k, rotulo: m.rotulo, valor, unidade: m.unidade, vd: Math.round((valor / m.vd) * 100), tipo: m.tipo };
    })
    .sort((a, b) => b.vd - a.vd);
}

export function detalharItem(it: ItemPlano): ItemDetalhado | null {
  const alimento = alimentoPorId(it.alimentoId);
  if (!alimento) return null;
  return {
    alimento,
    emoji: INFO_ALIMENTO[it.alimentoId]?.emoji || EMOJI_CATEGORIA[alimento.categoria] || "🍽️",
    gramas: it.gramas,
    medida: it.medida,
    macros: nutrientes(alimento, it.gramas),
    micros: microsDe(it.alimentoId, it.gramas),
  };
}

export function detalharRefeicao(itens: ItemPlano[]) {
  const detalhados = itens.map(detalharItem).filter((x): x is ItemDetalhado => !!x);
  const total = detalhados.reduce(
    (t, d) => ({ kcal: t.kcal + d.macros.kcal, proteina: t.proteina + d.macros.proteina, carbo: t.carbo + d.macros.carbo, gordura: t.gordura + d.macros.gordura }),
    { kcal: 0, proteina: 0, carbo: 0, gordura: 0 },
  );
  // Soma cada vitamina/mineral de todos os itens.
  const soma = new Map<Micro, MicroValor>();
  for (const d of detalhados) {
    for (const m of d.micros) {
      const atual = soma.get(m.chave);
      soma.set(m.chave, atual ? { ...atual, valor: atual.valor + m.valor } : { ...m });
    }
  }
  const micros = [...soma.values()]
    .map((m) => ({ ...m, vd: Math.round((m.valor / MICROS[m.chave].vd) * 100) }))
    .sort((a, b) => b.vd - a.vd);
  return { itens: detalhados, total, micros };
}
