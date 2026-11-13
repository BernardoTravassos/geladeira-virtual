import { alimentoDoItem, ALIMENTOS, normalizar, nutrientes, Alimento } from "../data/alimentos";
import { filtrarAlimentos } from "./buscaAlimentos";
import { INFO_ALIMENTO, MICROS, Micro } from "../data/micronutrientes";

/** Ilustração padrão quando o alimento não tem uma própria. */
const EMOJI_CATEGORIA: Record<string, string> = {
  carboidratos: "🍚", paes: "🍞", proteinas: "🍗", vegetais: "🥗", frutas: "🍎",
  laticinios: "🥛", doces: "🍰", bebidas: "🥤", gorduras: "🫒", pratos: "🍽️",
};

export type ItemPlano = {
  alimentoId: string;
  gramas: number;
  medida?: string;
  /** Cópia do alimento, quando foi criado pela própria pessoa (não está no catálogo). */
  personalizado?: Alimento;
};

/** Um alimento reconhecido pela IA na foto do prato. */
export type AlimentoDaFoto = { nome: string; gramas: number; kcal?: number; proteina?: number; carbo?: number; gordura?: number };

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
  const alimento = alimentoDoItem(it);
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
  return agregar(itens.map(detalharItem).filter((x): x is ItemDetalhado => !!x));
}

function agregar(detalhados: ItemDetalhado[]) {
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

/**
 * Transforma os alimentos que a IA reconheceu numa foto no mesmo formato dos cards do plano.
 * As calorias e macros vêm da própria IA (quando existem); as vitaminas só aparecem quando o
 * alimento reconhecido é o mesmo de um do catálogo (ex.: "Arroz branco"), para não inventar.
 */
export function detalharFoto(alimentos: AlimentoDaFoto[]) {
  const itens: ItemDetalhado[] = alimentos.map((f, i) => {
    const igual = ALIMENTOS.find((a) => normalizar(a.nome) === normalizar(f.nome)) ?? filtrarAlimentos(ALIMENTOS, f.nome, null)[0];
    // Sem números da IA (registro antigo), usa o catálogo, se achar.
    const base: Alimento | undefined = igual && normalizar(igual.nome).split(" ").length <= normalizar(f.nome).split(" ").length + 1 ? igual : undefined;
    const temMacros = f.kcal != null;
    const por100 = (v: number) => (f.gramas > 0 ? (v / f.gramas) * 100 : 0);
    const sintetico: Alimento = {
      id: `foto-${i}`,
      nome: f.nome,
      categoria: base?.categoria ?? "pratos",
      porcaoPadrao: f.gramas,
      kcal: temMacros ? por100(f.kcal!) : base?.kcal ?? 0,
      proteina: temMacros ? por100(f.proteina ?? 0) : base?.proteina ?? 0,
      carbo: temMacros ? por100(f.carbo ?? 0) : base?.carbo ?? 0,
      gordura: temMacros ? por100(f.gordura ?? 0) : base?.gordura ?? 0,
    };
    const igualExato = ALIMENTOS.find((a) => normalizar(a.nome) === normalizar(f.nome));
    return {
      alimento: sintetico,
      emoji: (igualExato && INFO_ALIMENTO[igualExato.id]?.emoji) || EMOJI_CATEGORIA[sintetico.categoria] || "🍽️",
      gramas: f.gramas,
      macros: temMacros
        ? { kcal: Math.round(f.kcal!), proteina: +(f.proteina ?? 0).toFixed(1), carbo: +(f.carbo ?? 0).toFixed(1), gordura: +(f.gordura ?? 0).toFixed(1) }
        : nutrientes(sintetico, f.gramas),
      micros: igualExato ? microsDe(igualExato.id, f.gramas) : [],
    };
  });
  return agregar(itens);
}
