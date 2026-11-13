import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alimento, alimentoDoItem, nutrientes } from "../data/alimentos";
import { gravarDia } from "./sincronizacao";

// Um item marcado no prato: o alimento e quantas gramas a pessoa comeu.
export type ItemPrato = {
  alimentoId: string;
  gramas: number;
  /** Cópia do alimento, só quando foi criado pela pessoa (não está no catálogo). */
  personalizado?: Alimento;
};

// Estimativa da IA a partir da foto (aproximada — não é medição).
export type EstimativaSalva = {
  kcal: number;
  proteina: number;
  carbo: number;
  gordura: number;
  alimentos: { nome: string; gramas: number }[];
  confianca: "baixa" | "media" | "alta";
};

export type RegistroRefeicao = {
  itens: ItemPrato[];
  estimativa?: EstimativaSalva;
  fotoUri?: string;
  registradoEm: string; // ISO
};

export type RegistroDoDia = Record<string, RegistroRefeicao>; // chave = "cafe" | "almoco" ...

// Fica no aparelho e é espelhado no servidor por utils/sincronizacao.ts.
const chaveDoDia = (d = new Date()) => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `@geladeira:refeicoes:${d.getFullYear()}-${mm}-${dd}`;
};

export async function carregarDia(): Promise<RegistroDoDia> {
  try {
    const bruto = await AsyncStorage.getItem(chaveDoDia());
    return bruto ? JSON.parse(bruto) : {};
  } catch {
    return {};
  }
}

export async function salvarRefeicao(chave: string, registro: RegistroRefeicao | null) {
  const dia = await carregarDia();
  if (registro) dia[chave] = registro;
  else delete dia[chave];
  await gravarDia(chaveDoDia(), JSON.stringify(dia));
}

export function totais(itens: ItemPrato[]) {
  return itens.reduce(
    (t, it) => {
      const al = alimentoDoItem(it);
      if (!al) return t;
      const n = nutrientes(al, it.gramas);
      return {
        kcal: t.kcal + n.kcal,
        proteina: +(t.proteina + n.proteina).toFixed(1),
        carbo: +(t.carbo + n.carbo).toFixed(1),
        gordura: +(t.gordura + n.gordura).toFixed(1),
      };
    },
    { kcal: 0, proteina: 0, carbo: 0, gordura: 0 },
  );
}

/**
 * Valores da refeição: se a pessoa marcou alimentos com gramas, esses valores
 * (mais precisos) valem; senão, usa-se a estimativa da IA pela foto.
 */
export function totaisDoRegistro(reg: Pick<RegistroRefeicao, "itens" | "estimativa">) {
  if (reg.itens.length === 0 && reg.estimativa) {
    const e = reg.estimativa;
    return { kcal: e.kcal, proteina: e.proteina, carbo: e.carbo, gordura: e.gordura };
  }
  return totais(reg.itens);
}
