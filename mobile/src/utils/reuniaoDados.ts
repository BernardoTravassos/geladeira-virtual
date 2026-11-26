import AsyncStorage from "@react-native-async-storage/async-storage";
import { getProfile } from "../services/api";
import { calcularMetaAguaMl, calcularMetas } from "./nutricao";
import { carregarDia, totaisDoRegistro } from "./refeicoes";
import { lerSaudeDoDia } from "./saude";
import { chaveData } from "./dia";
import type { Comando, DadosPaciente } from "./reuniaoEdicao";
import type { ItemPrato } from "./refeicoes";

/**
 * O que os dois lados trocam DURANTE a reunião, pelo canal de dados do LiveKit
 * (não passa pelo banco): o paciente manda o resumo do dia dele, e o
 * nutricionista manda destaques, metas combinadas e o fechamento da consulta.
 */
export const TOPICO = "gv";

export type ResumoDia = {
  kcal: number; metaKcal: number;
  proteina: number; metaProteina: number;
  carbo: number; metaCarbo: number;
  gordura: number; metaGordura: number;
  aguaMl: number; metaAguaMl: number;
  treinoMin: number; treinoKcal: number;
  refeicoes: number;
  /** Refeições da rotina ainda sem registro hoje (nomes). */
  pendentes: string[];
};

export type Alvo = "kcal" | "agua" | "treino" | "macros" | "refeicao";
export type Foco = { alvo: Alvo; titulo?: string; itens?: string[]; msg?: string };
export type MetaCombinada = { kcal?: number; aguaMl?: number };
export type Fechamento = { notas: string; meta?: MetaCombinada; focos: string[]; duracaoSeg: number; nutricionista: string };

export type AbaPainel = "hoje" | "plano" | "metas" | "perfil";
export type ItemPlanoPainel = { chave: string; nome: string; horario?: string; sugestao: string; itens: ItemPrato[] };
/** O painel compartilhado: o nutricionista mexe, e o paciente vê o mesmo, ao vivo. */
export type EstadoPainel = {
  aberto: boolean;
  aba: AbaPainel;
  /** Indicador que o nutricionista está apontando. */
  alvo?: Alvo | null;
  /** Refeição do plano em destaque. */
  sel?: number | null;
  plano?: ItemPlanoPainel[];
  /** Valores que o nutricionista está ajustando, antes de combinar. */
  rascunho?: MetaCombinada;
  combinada?: boolean;
};

export type Mensagem =
  | { t: "painel"; d: EstadoPainel }
  | { t: "resumo"; d: ResumoDia }
  | { t: "foco"; d: Foco }
  | { t: "meta"; d: MetaCombinada }
  | { t: "fim"; d: Fechamento }
  /** Paciente → nutricionista: perfil e registros de hoje, para editar. */
  | { t: "dados"; d: DadosPaciente }
  /** Nutricionista → paciente: uma alteração para o celular dele gravar. */
  | { t: "comando"; d: Comando }
  /** Paciente → nutricionista: se a alteração foi gravada. */
  | { t: "resposta"; d: { ok: boolean; texto: string } };

export const codificar = (m: Mensagem): Uint8Array => new TextEncoder().encode(JSON.stringify(m));

export function decodificar(bytes: Uint8Array): Mensagem | null {
  try {
    const m = JSON.parse(new TextDecoder().decode(bytes));
    return m && typeof m.t === "string" ? (m as Mensagem) : null;
  } catch {
    return null;
  }
}

const ROTINA = ["Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar", "Ceia"];
const CHAVES = ["cafe", "lanche-manha", "almoco", "lanche-tarde", "jantar", "ceia"];

/** Resumo do dia de quem está no celular, lido do aparelho (mesmas contas da Home). */
export async function resumoDoDia(): Promise<ResumoDia> {
  const perfil = await getProfile().catch(() => null);
  const metas = calcularMetas(perfil);
  const dia = await carregarDia().catch(() => ({} as any));
  const regs = Object.entries<any>(dia);
  const soma = regs.reduce((s, [, r]) => { const t = totaisDoRegistro(r); return { k: s.k + t.kcal, p: s.p + t.proteina, c: s.c + t.carbo, g: s.g + t.gordura }; }, { k: 0, p: 0, c: 0, g: 0 });
  let agua = 0;
  try {
    const bruto = await AsyncStorage.getItem(`@geladeira:agua:${chaveData(new Date())}`);
    const lista = bruto ? JSON.parse(bruto) : [];
    agua = Array.isArray(lista) ? lista.filter((n: any) => typeof n === "number").reduce((a: number, b: number) => a + b, 0) : 0;
  } catch {}
  const saude = await lerSaudeDoDia(Number(perfil?.peso_kg) || 70).catch(() => null);
  const feitas = new Set(regs.map(([k]) => (k === "lanche" ? "lanche-tarde" : k)));
  return {
    kcal: Math.round(soma.k), metaKcal: metas.calorias,
    proteina: Math.round(soma.p), metaProteina: metas.proteina,
    carbo: Math.round(soma.c), metaCarbo: metas.carboidrato,
    gordura: Math.round(soma.g), metaGordura: metas.gordura,
    aguaMl: agua, metaAguaMl: calcularMetaAguaMl(perfil),
    treinoMin: (saude?.treinos ?? []).reduce((s, t) => s + t.minutos, 0),
    treinoKcal: (saude?.treinos ?? []).reduce((s, t) => s + t.kcal, 0),
    refeicoes: regs.length,
    pendentes: ROTINA.filter((_, i) => !feitas.has(CHAVES[i])),
  };
}

export const fmtL = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`;
