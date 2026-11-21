import AsyncStorage from "@react-native-async-storage/async-storage";
import { ORIENTACAO_NUTRICIONISTA as base, type OrientacaoRefeicao } from "../mocks/orientacaoNutricionista";
import { meusNutricionistas, planoDoPaciente, gravarPlanoDoPaciente } from "../services/nutri";
import { DEV } from "../config/dev";
import type { ItemPlano } from "./refeicaoDetalhe";
import { alimentoPorId } from "../data/alimentos";

/**
 * O plano de refeições tem DUAS camadas:
 *
 *  1. a prescrição do nutricionista, que mora no servidor (tabela planos_paciente): ele escreve,
 *     o paciente só lê;
 *  2. os ajustes do próprio paciente, guardados só no aparelho dele (`salvarEdicao`), por cima
 *     da prescrição. "Restaurar" apaga o ajuste e volta ao que o nutricionista indicou.
 *
 * As duas têm o mesmo formato: para cada refeição editada, só a lista de ALIMENTOS.
 */
const CHAVE = "@geladeira:planoNutri";
export const CHAVE_VINCULO = "@geladeira:vinculoNutri";

export type Edicoes = Record<string, ItemPlano[]>;

/** Refeições da rotina, vazias: o nutricionista preenche, e só o que ele preencher chega ao paciente. */
export const MODELO_REFEICOES: OrientacaoRefeicao[] = base.refeicoes.map((r) => ({
  chave: r.chave, nome: r.nome, horario: r.horario, sugestao: "", itens: [], dica: "", trocas: [],
}));

/** Só as refeições que o nutricionista prescreveu, já no formato que a Home mostra. */
export function montarPlano(prescricao: Edicoes): OrientacaoRefeicao[] {
  return MODELO_REFEICOES
    .filter((r) => (prescricao[r.chave]?.length ?? 0) > 0)
    .map((r) => ({ ...r, itens: prescricao[r.chave], sugestao: descreverItens(prescricao[r.chave]) }));
}

// ── Ajustes do próprio paciente (só neste aparelho) ───────────────────────────

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

// ── Vínculo e prescrição, do lado do paciente ─────────────────────────────────

export type VinculoNutri = { vinculoId?: string; nutricionista: { nome: string; crn: string }; prescricao: Edicoes };

function lerPrescricao(conteudo?: string | null): Edicoes {
  try {
    const o = conteudo ? JSON.parse(conteudo) : {};
    return o && typeof o === "object" ? (o as Edicoes) : {};
  } catch {
    return {};
  }
}

/** Último vínculo conhecido (funciona sem internet). */
export async function lerVinculoCache(): Promise<VinculoNutri | null> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_VINCULO);
    return bruto ? (JSON.parse(bruto) as VinculoNutri) : null;
  } catch {
    return null;
  }
}

/**
 * Pergunta ao servidor quem acompanha a pessoa e qual é o plano, e guarda o resultado no aparelho.
 * Sem internet devolve o que já estava guardado. Sem nutricionista, devolve null.
 */
export async function sincronizarVinculo(): Promise<VinculoNutri | null> {
  if (DEV.MODO_DEMO) return null;
  try {
    const [v] = await meusNutricionistas();
    if (!v) {
      await AsyncStorage.removeItem(CHAVE_VINCULO);
      return null;
    }
    const resultado: VinculoNutri = { vinculoId: v.vinculoId, nutricionista: v.nutricionista, prescricao: lerPrescricao(v.plano?.conteudo) };
    await AsyncStorage.setItem(CHAVE_VINCULO, JSON.stringify(resultado));
    return resultado;
  } catch {
    return lerVinculoCache();
  }
}

// ── Prescrição, do lado do nutricionista (servidor) ───────────────────────────

export async function carregarPrescricao(pacienteId: string): Promise<Edicoes> {
  return lerPrescricao(await planoDoPaciente(pacienteId));
}

export async function gravarPrescricao(pacienteId: string, prescricao: Edicoes) {
  await gravarPlanoDoPaciente(pacienteId, JSON.stringify(prescricao));
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
