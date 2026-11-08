import AsyncStorage from "@react-native-async-storage/async-storage";
import { semente } from "./aleatorio";
import { DEV } from "../config/dev";
import { chaveData } from "./dia";
import { gravarDia } from "./sincronizacao";
import { lerHealthConnect, nativoDisponivel, pedirPermissaoHealthConnect } from "./healthConnect";

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

/** 90 → "1 h 30 min"; 45 → "45 min"; 120 → "2 h". */
export function formatarDuracao(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function estimarKcalTreino(tipo: string, minutos: number, pesoKg: number): number {
  const met = TIPOS_TREINO.find((t) => t.nome === tipo)?.met ?? 5;
  return Math.round(met * pesoKg * (minutos / 60));
}

/**
 * De onde vêm os dados do relógio:
 *  "real"     → Health Connect (app instalado no Android)
 *  "simulado" → dados inventados (DEV.SIMULAR_SMARTWATCH, p. ex. no Expo Go)
 *  "nenhum"   → só vale o que a pessoa registra à mão
 */
export type ModoSaude = "real" | "simulado" | "nenhum";
export const modoSaude = (): ModoSaude => (nativoDisponivel ? "real" : DEV.SIMULAR_SMARTWATCH ? "simulado" : "nenhum");

/** Conecta: pede a permissão de verdade (real) ou só marca como conectado (simulado). */
export async function conectarSaude(): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const modo = modoSaude();
  if (modo === "nenhum") {
    return { ok: false, mensagem: "A leitura do smartwatch só funciona no app instalado, no Android. Por enquanto, registre seus treinos à mão." };
  }
  if (modo === "real") {
    const r = await pedirPermissaoHealthConnect();
    if (!r.ok) return r;
  }
  await definirSmartwatchConectado(true);
  return { ok: true };
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
  await gravarDia(chaveTreinos(data), JSON.stringify([...atuais, novo]));
  return novo;
}

export async function removerTreinoManual(id: string, data = new Date()) {
  const atuais = lerTreinosSalvos(await AsyncStorage.getItem(chaveTreinos(data)));
  await gravarDia(chaveTreinos(data), JSON.stringify(atuais.filter((t) => t.id !== id)));
}

// ───────────── simulação do smartwatch (só DEV.SIMULAR_SMARTWATCH) ─────────────


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
  const modo = modoSaude();
  let salvos: [string, string | null][] = [];
  try {
    salvos = [...(await AsyncStorage.multiGet(datas.map(chaveTreinos)))];
  } catch {
    salvos = [];
  }
  const hoje = chaveData(new Date());

  // Dados reais do Health Connect, de uma vez para o período todo.
  let reais: Awaited<ReturnType<typeof lerHealthConnect>> | null = null;
  if (conectado && modo === "real") {
    try {
      reais = await lerHealthConnect(datas, (tipo, min) => estimarKcalTreino(tipo, min, pesoKg));
    } catch {
      reais = null; // sem leitura: segue só com o que foi registrado à mão
    }
  }

  return datas.map((data, i) => {
    const manuais = lerTreinosSalvos(salvos[i]?.[1] ?? null);
    const sim = conectado && modo === "simulado" ? simularDia(data, pesoKg, chaveData(data) === hoje) : null;
    const real = reais?.get(chaveData(data));
    const doRelogio = real?.treinos ?? sim?.treinos ?? [];
    const treinos = [...manuais, ...doRelogio];

    // Treinos manuais não estão no relógio, então o gasto deles soma por fora.
    const kcalManuais = manuais.reduce((a, t) => a + t.kcal, 0);
    const kcalRelogio = real ? real.ativasKcal : sim ? sim.gastoDiario + doRelogio.reduce((a, t) => a + t.kcal, 0) : 0;

    return {
      conectado,
      treinos,
      treinou: treinos.length > 0,
      passos: real?.passos ?? sim?.passos,
      caloriasGastas: Math.round(kcalManuais + kcalRelogio),
    };
  });
}

export async function lerSaudeDoDia(pesoKg: number, data = new Date()): Promise<SaudeDoDia> {
  return (await lerSaudeDeDatas([data], pesoKg))[0];
}
