// Vitaminas e minerais dos alimentos usados no plano da nutricionista.
// Valores APROXIMADOS por 100 g do alimento já preparado, a partir de memória
// das tabelas TACO e USDA (arredondados). São estimativa, não laudo: variedade,
// maturação e preparo mudam os números. Revisão por nutricionista recomendada.
//
// `vd` é o valor diário de referência de um adulto (rotulagem da Anvisa).
export type Micro =
  | "vitA" | "vitC" | "vitD" | "vitE" | "vitK" | "b1" | "b2" | "b3" | "b6" | "b12" | "folato"
  | "calcio" | "ferro" | "magnesio" | "zinco" | "potassio" | "fosforo" | "selenio" | "manganes" | "sodio" | "cobre";

export const MICROS: Record<Micro, { rotulo: string; unidade: string; vd: number; tipo: "vitamina" | "mineral" }> = {
  vitA: { rotulo: "Vitamina A", unidade: "µg", vd: 600, tipo: "vitamina" },
  vitC: { rotulo: "Vitamina C", unidade: "mg", vd: 45, tipo: "vitamina" },
  vitD: { rotulo: "Vitamina D", unidade: "µg", vd: 5, tipo: "vitamina" },
  vitE: { rotulo: "Vitamina E", unidade: "mg", vd: 10, tipo: "vitamina" },
  vitK: { rotulo: "Vitamina K", unidade: "µg", vd: 65, tipo: "vitamina" },
  b1: { rotulo: "Vitamina B1", unidade: "mg", vd: 1.2, tipo: "vitamina" },
  b2: { rotulo: "Vitamina B2", unidade: "mg", vd: 1.3, tipo: "vitamina" },
  b3: { rotulo: "Vitamina B3", unidade: "mg", vd: 16, tipo: "vitamina" },
  b6: { rotulo: "Vitamina B6", unidade: "mg", vd: 1.3, tipo: "vitamina" },
  b12: { rotulo: "Vitamina B12", unidade: "µg", vd: 2.4, tipo: "vitamina" },
  folato: { rotulo: "Folato (B9)", unidade: "µg", vd: 240, tipo: "vitamina" },
  calcio: { rotulo: "Cálcio", unidade: "mg", vd: 1000, tipo: "mineral" },
  ferro: { rotulo: "Ferro", unidade: "mg", vd: 14, tipo: "mineral" },
  magnesio: { rotulo: "Magnésio", unidade: "mg", vd: 260, tipo: "mineral" },
  zinco: { rotulo: "Zinco", unidade: "mg", vd: 7, tipo: "mineral" },
  potassio: { rotulo: "Potássio", unidade: "mg", vd: 3500, tipo: "mineral" },
  fosforo: { rotulo: "Fósforo", unidade: "mg", vd: 700, tipo: "mineral" },
  selenio: { rotulo: "Selênio", unidade: "µg", vd: 34, tipo: "mineral" },
  manganes: { rotulo: "Manganês", unidade: "mg", vd: 2.3, tipo: "mineral" },
  sodio: { rotulo: "Sódio", unidade: "mg", vd: 2400, tipo: "mineral" },
  cobre: { rotulo: "Cobre", unidade: "mg", vd: 0.9, tipo: "mineral" },
};

/** Ilustração (emoji) e micronutrientes por 100 g. A chave é o id do catálogo. */
export const INFO_ALIMENTO: Record<string, { emoji: string; micros: Partial<Record<Micro, number>> }> = {
  "ovo-mexido": { emoji: "🍳", micros: { b12: 1.3, vitA: 160, vitD: 1.7, b2: 0.45, selenio: 30 } },
  "pao-integral": { emoji: "🍞", micros: { ferro: 2.5, magnesio: 75, b3: 4 } },
  "pao-forma": { emoji: "🍞", micros: { ferro: 2, folato: 45 } },
  mamao: { emoji: "🥭", micros: { vitC: 61, vitA: 47, folato: 37 } },
  "cafe-preto": { emoji: "☕", micros: { potassio: 49, b2: 0.08, magnesio: 3 } },
  iogurte: { emoji: "🥣", micros: { calcio: 121, b12: 0.4, b2: 0.14 } },
  aveia: { emoji: "🌾", micros: { magnesio: 177, ferro: 4.7, b1: 0.8, zinco: 4 } },
  "pasta-amendoim": { emoji: "🥜", micros: { vitE: 9, magnesio: 168, b3: 13 } },
  banana: { emoji: "🍌", micros: { potassio: 358, b6: 0.4, vitC: 9 } },
  maca: { emoji: "🍎", micros: { vitC: 5, potassio: 107 } },
  frango: { emoji: "🍗", micros: { b3: 11, b6: 0.6, selenio: 27, fosforo: 230 } },
  "frango-desfiado": { emoji: "🍗", micros: { b3: 11, b6: 0.6, selenio: 27, fosforo: 230 } },
  alcatra: { emoji: "🥩", micros: { b12: 2.6, zinco: 6, ferro: 2.7 } },
  arroz: { emoji: "🍚", micros: { magnesio: 12, manganes: 0.5 } },
  feijao: { emoji: "🫘", micros: { folato: 150, ferro: 1.5, magnesio: 45, potassio: 350 } },
  alface: { emoji: "🥬", micros: { vitK: 100, vitA: 150, folato: 38 } },
  tomate: { emoji: "🍅", micros: { vitC: 14, vitA: 42, potassio: 237 } },
  cenoura: { emoji: "🥕", micros: { vitA: 835, potassio: 320 } },
  brocolis: { emoji: "🥦", micros: { vitC: 65, vitK: 141, folato: 108 } },
  "batata-doce": { emoji: "🍠", micros: { vitA: 790, vitC: 13, potassio: 230 } },
  "queijo-minas": { emoji: "🧀", micros: { calcio: 580, fosforo: 400 } },
  leite: { emoji: "🥛", micros: { calcio: 120, b12: 0.5, b2: 0.2, fosforo: 90 } },
  azeite: { emoji: "🫒", micros: { vitE: 14, vitK: 60 } },
};

/** Guarda emoji e vitaminas/minerais vindos do servidor, para qualquer alimento do banco. */
export function registrarInfoDoServidor(id: string, emoji: string | null | undefined, micros: Record<string, number> | null | undefined) {
  if (!micros || Object.keys(micros).length === 0) return;
  INFO_ALIMENTO[id] = { emoji: emoji ?? INFO_ALIMENTO[id]?.emoji ?? "", micros: micros as Partial<Record<Micro, number>> };
}
