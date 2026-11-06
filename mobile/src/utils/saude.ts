import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEV } from "../config/dev";
import { chaveData } from "./dia";

export type OrigemTreino = "manual" | "smartwatch" | "gymrats";

export type Treino = {
  id: string;
  tipo: string;
  minutos: number;
  kcal: number;
  origem: OrigemTreino;
};

export type SaudeDoDia = {
  conectado: boolean;
  treinos: Treino[];
  treinou: boolean;
  /** Passos do dia (só com smartwatch conectado). */
  passos?: number;
  /** Calorias gastas em atividade no dia, treinos incluídos (smartwatch) ou só dos treinos (manual). */
  caloriasGastas: number;
};

/** Gasto por hora = MET × peso (kg). Valores do Compêndio de Atividades Físicas. */
export const TIPOS_TREINO: { nome: string; met: number; icone: "activity" | "wind" | "sun" | "zap" | "heart" | "target" }[] = [
  { nome: "Musculação", met: 5.0, icone: "activity" },
  { nome: "Corrida", met: 9.8, icone: "wind" },
  { nome: "Caminhada", met: 3.8, icone: "sun" },
  { nome: "Ciclismo", met: 7.5, icone: "wind" },
  { nome: "Natação", met: 8.0, icone: "target" },
  { nome: "Futebol", met: 7.0, icone: "target" },
  { nome: "Funcional / HIIT", met: 8.0, icone: "zap" },
  { nome: "Yoga / Pilates", met: 3.0, icone: "heart" },
  { nome: "Outro", met: 5.0, icone: "activity" },
];

export function estimarKcalTreino(tipo: string, minutos: number, pesoKg: number): number {
  const met = TIPOS_TREINO.find((t) => t.nome === tipo)?.met ?? 5;
  return Math.round(met * pesoKg * (minutos / 60));
}

const CHAVE_CONECTADO = "@geladeira:smartwatch:conectado";
const chaveTreinos = (d: Date) => `@geladeira:treinos:${chaveData(d)}`;

export async function smartwatchConectado(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CHAVE_CONECTADO)) === "1";
  } catch {
    return false;
  }
}

export async function definirSmartwatchConectado(conectado: boolean) {
  await AsyncStorage.setItem(CHAVE_CONECTADO, conectado ? "1" : "0");
}

function lerTreinosSalvos(bruto: string | null): Treino[] {
  try {
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export async function adicionarTreinoManual(tipo: string, minutos: number, pesoKg: number, data = new Date()) {
  const atuais = lerTreinosSalvos(await AsyncStorage.getItem(chaveTreinos(data)));
  const novo: Treino = {
    id: `${Date.now()}`,
    tipo,
    minutos,
    kcal: estimarKcalTreino(tipo, minutos, pesoKg),
    origem: "manual",
  };
  await AsyncStorage.setItem(chaveTreinos(data), JSON.stringify([...atuais, novo]));
  return novo;
}

export async function removerTreinoManual(id: string, data = new Date()) {
  const atuais = lerTreinosSalvos(await AsyncStorage.getItem(chaveTreinos(data)));
  await AsyncStorage.setItem(chaveTreinos(data), JSON.stringify(atuais.filter((t) => t.id !== id)));
}

// ───────────── simulação do smartwatch (só DEV.SIMULAR_SMARTWATCH) ─────────────

function semente(n: number) {
  let s = n >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Dados inventados, mas estáveis: o mesmo dia gera sempre o mesmo resultado.
 * Hoje não ganha treino simulado, para dar para testar tanto "treinou" quanto
 * "ainda sem treino" registrando à mão.
 */
function simularDia(data: Date, pesoKg: number, ehHoje: boolean) {
  const rnd = semente(data.getFullYear() * 10000 + (data.getMonth() + 1) * 100 + data.getDate() + 31);
  const passos = Math.round(4000 + rnd() * 8500);
  const gastoDiario = Math.round(220 + rnd() * 380); // atividade fora de treino
  const treinos: Treino[] = [];
  if (!ehHoje && rnd() < 0.55) {
    const t = TIPOS_TREINO[Math.floor(rnd() * 7)];
    const minutos = 30 + Math.round(rnd() * 8) * 5;
    treinos.push({
      id: `sim-${chaveData(data)}`,
      tipo: t.nome,
      minutos,
      kcal: estimarKcalTreino(t.nome, minutos, pesoKg),
      origem: rnd() < 0.5 ? "gymrats" : "smartwatch",
    });
  }
  return { passos, gastoDiario, treinos };
}

/** Saúde de várias datas de uma vez (usado pelo Histórico). */
export async function lerSaudeDeDatas(datas: Date[], pesoKg: number): Promise<SaudeDoDia[]> {
  const conectado = await smartwatchConectado();
  let salvos: [string, string | null][] = [];
  try {
    salvos = [...(await AsyncStorage.multiGet(datas.map(chaveTreinos)))];
  } catch {
    salvos = [];
  }
  const hoje = chaveData(new Date());

  return datas.map((data, i) => {
    const manuais = lerTreinosSalvos(salvos[i]?.[1] ?? null);
    const sim = conectado && DEV.SIMULAR_SMARTWATCH ? simularDia(data, pesoKg, chaveData(data) === hoje) : null;
    const treinos = [...manuais, ...(sim?.treinos ?? [])];
    const kcalTreinos = treinos.reduce((a, t) => a + t.kcal, 0);
    return {
      conectado,
      treinos,
      treinou: treinos.length > 0,
      passos: sim?.passos,
      caloriasGastas: Math.round(kcalTreinos + (sim?.gastoDiario ?? 0)),
    };
  });
}

export async function lerSaudeDoDia(pesoKg: number, data = new Date()): Promise<SaudeDoDia> {
  return (await lerSaudeDeDatas([data], pesoKg))[0];
}
