import AsyncStorage from "@react-native-async-storage/async-storage";
import { getProfile, saveProfile } from "../services/api";
import { alimentoDoItem } from "../data/alimentos";
import { chaveData } from "./dia";
import { carregarDia, salvarRefeicao, totaisDoRegistro, type ItemPrato } from "./refeicoes";
import { registrarGoleAgora, reagendarLembretes } from "./lembretes";
import { gravarDia } from "./sincronizacao";
import { restaurarEdicao, sincronizarVinculo } from "./planoNutri";
import { perfilComCampo, type CampoReuniao } from "./perfilEdicao";
import type { PerfilApi } from "./nutricao";

/**
 * Edições feitas pelo nutricionista DURANTE a reunião.
 *
 * Quem grava é o celular do próprio paciente (que está na chamada): o aparelho é a fonte dos
 * registros do dia e do perfil, então nada é sobrescrito pela sincronização depois. O nutricionista
 * manda um comando pelo canal de dados e recebe de volta os dados já atualizados.
 */
export type RefeicaoHoje = { chave: string; kcal: number; itens: ItemPrato[]; foto: string[] };
export type DadosPaciente = { perfil: PerfilApi | null; agua: number[]; refeicoes: RefeicaoHoje[] };

export type Comando =
  | { op: "perfil"; campo: CampoReuniao; valor: string }
  | { op: "agua-mais"; ml: number }
  | { op: "agua-desfazer" }
  | { op: "refeicao-gramas"; chave: string; alimentoId: string; delta: number }
  | { op: "refeicao-remover-item"; chave: string; alimentoId: string }
  | { op: "refeicao-adicionar"; chave: string; alimentoId: string; gramas: number }
  | { op: "refeicao-apagar"; chave: string }
  /** O plano ou as metas mudaram no servidor: o paciente baixa de novo. */
  | { op: "plano"; refeicao?: string };

const chaveAgua = () => `@geladeira:agua:${chaveData(new Date())}`;

async function lerAgua(): Promise<number[]> {
  try {
    const b = await AsyncStorage.getItem(chaveAgua());
    const l = b ? JSON.parse(b) : [];
    return Array.isArray(l) ? l.filter((n: unknown) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export async function coletarDados(): Promise<DadosPaciente> {
  const perfil = await getProfile().catch(() => null);
  const dia = await carregarDia();
  return {
    perfil,
    agua: await lerAgua(),
    refeicoes: Object.entries(dia).map(([chave, r]) => ({
      chave,
      kcal: Math.round(totaisDoRegistro(r).kcal),
      itens: r.itens,
      foto: r.itens.length === 0 ? (r.estimativa?.alimentos ?? []).map((a) => `${a.nome} (${a.gramas} g)`) : [],
    })),
  };
}

/** Aplica no aparelho do paciente. Devolve o texto do aviso mostrado a ele; lança Error se não der. */
export async function aplicarComando(c: Comando): Promise<string> {
  if (c.op === "perfil") {
    const perfil = await getProfile();
    if (!perfil) throw new Error("O paciente ainda não preencheu o perfil.");
    try {
      await saveProfile(perfilComCampo(perfil, c.campo, c.valor));
    } catch (e: any) {
      throw new Error(e?.response?.data?.error || e?.message || "Não foi possível salvar o perfil.");
    }
    reagendarLembretes();
    return "Seu perfil foi atualizado.";
  }
  if (c.op === "agua-mais" || c.op === "agua-desfazer") {
    const lista = await lerAgua();
    const nova = c.op === "agua-mais" ? [...lista, c.ml] : lista.slice(0, -1);
    await gravarDia(chaveAgua(), JSON.stringify(nova));
    if (c.op === "agua-mais") registrarGoleAgora();
    reagendarLembretes();
    return "Sua água de hoje foi corrigida.";
  }
  if (c.op === "plano") {
    if (c.refeicao) await restaurarEdicao(c.refeicao); // um ajuste antigo do paciente esconderia o novo plano
    await sincronizarVinculo();
    return c.refeicao ? "Seu plano foi atualizado." : "Suas metas foram atualizadas.";
  }

  const dia = await carregarDia();
  const reg = dia[c.chave];
  if (!reg) throw new Error("Essa refeição não está mais registrada.");
  if (c.op === "refeicao-apagar") await salvarRefeicao(c.chave, null);
  else {
    let itens = reg.itens;
    if (c.op === "refeicao-gramas") itens = itens.map((i) => (i.alimentoId === c.alimentoId ? { ...i, gramas: Math.min(5000, Math.max(5, i.gramas + c.delta)) } : i));
    else if (c.op === "refeicao-remover-item") itens = itens.filter((i) => i.alimentoId !== c.alimentoId);
    else if (!itens.some((i) => i.alimentoId === c.alimentoId)) {
      if (!alimentoDoItem({ alimentoId: c.alimentoId })) throw new Error("Este alimento não existe no celular do paciente.");
      itens = [...itens, { alimentoId: c.alimentoId, gramas: c.gramas }];
    }
    const vazio = itens.length === 0;
    // Sem itens e sem foto não sobra nada: o registro sai.
    await salvarRefeicao(c.chave, vazio && !reg.estimativa ? null : { ...reg, itens, estimativa: itens.length ? undefined : reg.estimativa });
  }
  reagendarLembretes();
  return "Uma refeição de hoje foi corrigida.";
}
