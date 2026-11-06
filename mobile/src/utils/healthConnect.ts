import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { chaveData } from "./dia";
import type { Treino } from "./saude";

/**
 * Leitura real do Health Connect (Android): onde Samsung, Garmin, Fitbit e
 * outros relógios — e apps de treino — gravam passos, calorias e treinos.
 *
 * Só funciona no app INSTALADO (build próprio). No Expo Go o módulo nativo não
 * existe, então tudo aqui é protegido por `nativoDisponivel` e o módulo é
 * carregado com require() só na hora de usar: assim o Expo Go continua abrindo
 * normalmente.
 */
export const nativoDisponivel =
  Platform.OS === "android" && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const hc = () => require("react-native-health-connect");

const PERMISSOES = [
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "ActiveCaloriesBurned" },
  { accessType: "read", recordType: "ExerciseSession" },
] as const;

export type ResultadoConexao = { ok: true } | { ok: false; mensagem: string };

/** Pede ao Health Connect a permissão de leitura. */
export async function pedirPermissaoHealthConnect(): Promise<ResultadoConexao> {
  try {
    const { getSdkStatus, initialize, requestPermission, SdkAvailabilityStatus } = hc();
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
      return { ok: false, mensagem: "O Health Connect não está disponível neste aparelho." };
    }
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return { ok: false, mensagem: "Atualize o Health Connect na Play Store e tente de novo." };
    }
    if (!(await initialize())) {
      return { ok: false, mensagem: "Não foi possível iniciar o Health Connect." };
    }
    const concedidas: { recordType: string }[] = await requestPermission([...PERMISSOES]);
    const faltando = PERMISSOES.filter((p) => !concedidas.some((c) => c.recordType === p.recordType));
    if (faltando.length === PERMISSOES.length) {
      return { ok: false, mensagem: "A permissão não foi concedida. Você pode liberar nas configurações do Health Connect." };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, mensagem: `Falha ao acessar o Health Connect: ${e?.message ?? "erro desconhecido"}` };
  }
}

/** Abre a tela do Health Connect onde se vê (e apaga) os dados gravados, por app. */
export function abrirDadosHealthConnect(): boolean {
  try {
    hc().openHealthConnectDataManagement();
    return true;
  } catch {
    try {
      hc().openHealthConnectSettings();
      return true;
    } catch {
      return false;
    }
  }
}

export type DiaHealthConnect = { passos: number; ativasKcal: number; treinos: Treino[] };

const dia0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const amanha = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

/** Executa as tarefas em lotes pequenos, para não inundar a ponte nativa. */
async function emLotes<T, R>(itens: T[], tamanho: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const saida: R[] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    saida.push(...(await Promise.all(itens.slice(i, i + tamanho).map(fn))));
  }
  return saida;
}

/**
 * Lê passos, calorias ativas e treinos dos dias informados.
 * Passos e calorias: um total por dia, calculado pelo próprio Health Connect
 * (agregação), que já resolve fontes duplicadas — relógio e celular gravando
 * os mesmos passos não são somados duas vezes.
 */
export async function lerHealthConnect(
  datas: Date[],
  estimarKcal: (tipo: string, minutos: number) => number,
): Promise<Map<string, DiaHealthConnect>> {
  const { initialize, aggregateRecord, readRecords, ExerciseType } = hc();
  const resultado = new Map<string, DiaHealthConnect>();
  if (datas.length === 0 || !(await initialize())) return resultado;

  const filtro = (a: Date, b: Date) => ({ operator: "between", startTime: a.toISOString(), endTime: b.toISOString() });

  const totais = await emLotes(datas, 12, async (d) => {
    const f = filtro(dia0(d), amanha(d));
    const [p, c] = await Promise.all([
      aggregateRecord({ recordType: "Steps", timeRangeFilter: f }).catch(() => null),
      aggregateRecord({ recordType: "ActiveCaloriesBurned", timeRangeFilter: f }).catch(() => null),
    ]);
    return {
      chave: chaveData(d),
      passos: Math.round(p?.COUNT_TOTAL ?? 0),
      ativasKcal: Math.round(c?.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0),
    };
  });
  for (const t of totais) resultado.set(t.chave, { passos: t.passos, ativasKcal: t.ativasKcal, treinos: [] });

  // Treinos: poucos registros, então uma leitura só para o período inteiro.
  const nomes: Record<number, string> = {
    [ExerciseType.STRENGTH_TRAINING]: "Musculação",
    [ExerciseType.RUNNING]: "Corrida",
    [ExerciseType.RUNNING_TREADMILL]: "Corrida",
    [ExerciseType.WALKING]: "Caminhada",
    [ExerciseType.BIKING]: "Ciclismo",
    [ExerciseType.SWIMMING_POOL]: "Natação",
    [ExerciseType.SOCCER]: "Futebol",
    [ExerciseType.HIGH_INTENSITY_INTERVAL_TRAINING]: "Funcional / HIIT",
    [ExerciseType.YOGA]: "Yoga / Pilates",
    [ExerciseType.PILATES]: "Yoga / Pilates",
  };

  const primeiro = dia0(datas[0]);
  const ultimo = amanha(datas[datas.length - 1]);
  const sessoes: any[] = [];
  let pageToken: string | undefined;
  for (let pagina = 0; pagina < 20; pagina++) {
    const r = await readRecords("ExerciseSession", { timeRangeFilter: filtro(primeiro, ultimo), pageSize: 500, pageToken }).catch(() => null);
    if (!r) break;
    sessoes.push(...r.records);
    pageToken = r.pageToken;
    if (!pageToken) break;
  }
  sessoes.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  let anterior: number | null = null;
  for (const s of sessoes) {
    const ini = new Date(s.startTime);
    const fim = new Date(s.endTime);
    // Relógio e app de treino podem gravar a MESMA sessão: início a menos de 10 min = duplicata.
    if (anterior !== null && Math.abs(ini.getTime() - anterior) < 10 * 60 * 1000) continue;
    anterior = ini.getTime();

    const minutos = Math.max(1, Math.round((fim.getTime() - ini.getTime()) / 60000));
    const tipo = nomes[s.exerciseType] ?? (s.title as string | undefined) ?? "Treino";
    const kcalSessao = await aggregateRecord({ recordType: "ActiveCaloriesBurned", timeRangeFilter: filtro(ini, fim) })
      .then((c: any) => Math.round(c?.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0))
      .catch(() => 0);
    const origemPacote = String(s.metadata?.dataOrigin ?? "").toLowerCase();

    const chave = chaveData(ini);
    const dia = resultado.get(chave);
    if (!dia) continue;
    dia.treinos.push({
      id: `hc-${s.metadata?.id ?? ini.getTime()}`,
      tipo,
      minutos,
      kcal: kcalSessao > 0 ? kcalSessao : estimarKcal(tipo, minutos),
      origem: origemPacote.includes("gymrats") ? "gymrats" : "smartwatch",
    });
  }
  return resultado;
}
