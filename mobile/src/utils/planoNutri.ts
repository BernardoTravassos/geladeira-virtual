import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OrientacaoRefeicao } from "../mocks/orientacaoNutricionista";
import type { ItemPlano } from "./refeicaoDetalhe";
import { alimentoPorId } from "../data/alimentos";

/**
 * Alterações feitas no plano de refeições. Guardam só os ALIMENTOS de cada refeição
 * que foi editada; o resto (horário, dica, trocas) continua vindo do plano original.
 *
 * ⚠️ Por enquanto ficam só neste aparelho. Quando o vínculo nutricionista↔paciente
 * existir, o nutricionista edita no servidor e o paciente só lê.
 */
const CHAVE = "@geladeira:planoNutri";

/**
 * O paciente "1" é a pessoa que usa este aparelho (o app dela lê a chave padrão), então o que o
 * nutricionista prescreve para ela aparece na Home. Os demais pacientes têm uma chave própria.
 */
export const chavePlano = (pacienteId?: string) => (!pacienteId || pacienteId === "1" ? CHAVE : `${CHAVE}:${pacienteId}`);

export type Edicoes = Record<string, ItemPlano[]>;

export async function carregarEdicoes(pacienteId?: string): Promise<Edicoes> {
  try {
    const bruto = await AsyncStorage.getItem(chavePlano(pacienteId));
    return bruto ? (JSON.parse(bruto) as Edicoes) : {};
  } catch {
    return {};
  }
}

export async function salvarEdicao(chave: string, itens: ItemPlano[], pacienteId?: string): Promise<Edicoes> {
  const atual = { ...(await carregarEdicoes(pacienteId)), [chave]: itens };
  await AsyncStorage.setItem(chavePlano(pacienteId), JSON.stringify(atual));
  return atual;
}

export async function restaurarEdicao(chave: string, pacienteId?: string): Promise<Edicoes> {
  const { [chave]: _removida, ...resto } = await carregarEdicoes(pacienteId);
  await AsyncStorage.setItem(chavePlano(pacienteId), JSON.stringify(resto));
  return resto;
}

/** Aplica as edições sobre o plano original. */
export function aplicarEdicoes(refeicoes: OrientacaoRefeicao[], edicoes: Edicoes): OrientacaoRefeicao[] {
  return refeicoes.map((r) => (edicoes[r.chave] ? { ...r, itens: edicoes[r.chave] } : r));
}

/** "Ovo, de galinha, inteiro, cru" + "Pão integral" → "Ovo, Pão integral" (resumo de uma refeição). */
export function descreverItens(itens: ItemPlano[]) {
  return itens
    .map((i) => alimentoPorId(i.alimentoId)?.nome.split(",")[0].trim() ?? "")
    .filter(Boolean)
    .join(", ");
}
