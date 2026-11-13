import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OrientacaoRefeicao } from "../mocks/orientacaoNutricionista";
import type { ItemPlano } from "./refeicaoDetalhe";

/**
 * Alterações feitas no plano de refeições. Guardam só os ALIMENTOS de cada refeição
 * que foi editada; o resto (horário, dica, trocas) continua vindo do plano original.
 *
 * ⚠️ Por enquanto ficam só neste aparelho. Quando o vínculo nutricionista↔paciente
 * existir, o nutricionista edita no servidor e o paciente só lê.
 */
const CHAVE = "@geladeira:planoNutri";

export type Edicoes = Record<string, ItemPlano[]>;

export async function carregarEdicoes(): Promise<Edicoes> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Edicoes) : {};
  } catch {
    return {};
  }
}

export async function salvarEdicao(chave: string, itens: ItemPlano[]): Promise<Edicoes> {
  const atual = { ...(await carregarEdicoes()), [chave]: itens };
  await AsyncStorage.setItem(CHAVE, JSON.stringify(atual));
  return atual;
}

export async function restaurarEdicao(chave: string): Promise<Edicoes> {
  const { [chave]: _removida, ...resto } = await carregarEdicoes();
  await AsyncStorage.setItem(CHAVE, JSON.stringify(resto));
  return resto;
}

/** Aplica as edições sobre o plano original. */
export function aplicarEdicoes(refeicoes: OrientacaoRefeicao[], edicoes: Edicoes): OrientacaoRefeicao[] {
  return refeicoes.map((r) => (edicoes[r.chave] ? { ...r, itens: edicoes[r.chave] } : r));
}
