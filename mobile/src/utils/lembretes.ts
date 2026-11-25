import { Alert, Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lerVinculoCache, MODELO_REFEICOES } from "./planoNutri";
import { chaveData } from "./dia";

/**
 * Lembretes e parabéns do app, como notificações LOCAIS: ficam agendadas no próprio celular, sem servidor
 * e sem internet.
 *
 * O módulo nativo (expo-notifications) só existe em APKs gerados DEPOIS de instalado. Num APK antigo o
 * `require` falha, e tudo aqui vira no-op — o app abre normal e a tela de lembretes avisa que precisa atualizar.
 *
 * Como funciona a "esperteza": uma notificação agendada não pode decidir nada na hora de aparecer. Por isso
 * o plano dos próximos 3 dias é REFEITO sempre que algo muda (copo de água, refeição registrada, abrir o app):
 * se a meta de água já foi batida, os avisos de hoje somem; se a refeição já foi registrada, o lembrete dela some.
 */

type Notif = typeof import("expo-notifications");
let N: Notif | null = null;
try {
  if (Platform.OS !== "web") N = require("expo-notifications");
} catch {
  N = null;
}

export const lembretesDisponiveis = () => N != null;

export type Preferencias = {
  agua: { ativo: boolean; inicio: number; fim: number; intervaloH: number }; // inicio/fim em minutos desde 00:00
  refeicoes: { ativo: boolean };
  treino: { ativo: boolean; hora: number };
  pesar: { ativo: boolean };
  parabens: { ativo: boolean };
};

export const PADRAO: Preferencias = {
  agua: { ativo: false, inicio: 8 * 60, fim: 20 * 60, intervaloH: 2 },
  refeicoes: { ativo: false },
  treino: { ativo: false, hora: 18 * 60 },
  pesar: { ativo: false },
  parabens: { ativo: true },
};

const CHAVE_PREFS = "@geladeira:lembretes";
const CHAVE_META_AGUA = "@geladeira:metaAguaMl";
const CHAVE_ULTIMO_GOLE = "@geladeira:aguaUltimoGole";

/** Anota a hora do último gole: o lembrete seguinte não chega logo depois de beber. */
export function registrarGoleAgora() {
  AsyncStorage.setItem(CHAVE_ULTIMO_GOLE, String(Date.now())).catch(() => {});
}
const CHAVE_PARABENS = "@geladeira:parabensEnviados";
const CANAL = "lembretes";
const DIAS_A_FRENTE = 3;

export async function carregarPreferencias(): Promise<Preferencias> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_PREFS);
    const salvo = bruto ? JSON.parse(bruto) : {};
    return {
      agua: { ...PADRAO.agua, ...salvo.agua },
      refeicoes: { ...PADRAO.refeicoes, ...salvo.refeicoes },
      treino: { ...PADRAO.treino, ...salvo.treino },
      pesar: { ...PADRAO.pesar, ...salvo.pesar },
      parabens: { ...PADRAO.parabens, ...salvo.parabens },
    };
  } catch {
    return PADRAO;
  }
}

export async function salvarPreferencias(p: Preferencias) {
  await AsyncStorage.setItem(CHAVE_PREFS, JSON.stringify(p));
  reagendarLembretes();
}

/** A meta de água depende do perfil; o card de água avisa o valor aqui para os lembretes saberem. */
export function registrarMetaAgua(ml: number) {
  AsyncStorage.setItem(CHAVE_META_AGUA, String(Math.round(ml))).catch(() => {});
}

/** Chamar uma vez ao abrir o app: como o aviso aparece com o app aberto, e o canal do Android. */
export function configurarNotificacoes() {
  if (!N) return;
  try {
    N.setNotificationHandler({
      // Tudo aparece, mesmo com o app aberto.
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });
    criarCanal();
  } catch {}
}

let canalPronto: Promise<unknown> | null = null;
/** No Android 13+ o canal precisa existir ANTES de pedir permissão, senão a janela de permissão nem aparece. */
function criarCanal() {
  if (!N || Platform.OS !== "android") return Promise.resolve();
  if (!canalPronto) {
    canalPronto = N.setNotificationChannelAsync(CANAL, {
      name: "Lembretes e parabéns",
      importance: N.AndroidImportance.HIGH,
      lightColor: "#1F5D3A",
    }).catch(() => {});
  }
  return canalPronto;
}

/** Pede permissão (no Android 13+ e no iPhone a pessoa pode negar). Devolve se está liberado. */
export async function pedirPermissao(): Promise<boolean> {
  if (!N) return false;
  try {
    await criarCanal();
    const atual = await N.getPermissionsAsync();
    if (atual.granted) return true;
    if (atual.canAskAgain === false) {
      Alert.alert("Notificações desligadas", "Libere as notificações do Geladeira Virtual nos ajustes do celular para receber os lembretes.", [
        { text: "Agora não", style: "cancel" },
        { text: "Abrir ajustes", onPress: () => Linking.openSettings() },
      ]);
      return false;
    }
    const nova = await N.requestPermissionsAsync();
    return nova.granted;
  } catch {
    return false;
  }
}

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const formatarHora = hhmm;

function aDate(dia: Date, minutos: number) {
  const d = new Date(dia);
  d.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
  return d;
}

const litros = (ml: number) => (ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

async function lerJson<T>(chave: string, padrao: T): Promise<T> {
  try {
    const b = await AsyncStorage.getItem(chave);
    return b ? (JSON.parse(b) as T) : padrao;
  } catch {
    return padrao;
  }
}

/** Dias seguidos (até hoje) com pelo menos uma refeição registrada. Hoje sem registro não quebra a sequência. */
async function sequenciaDeDias(): Promise<number> {
  let n = 0;
  const d = new Date();
  for (let i = 0; i < 120; i++) {
    const dia = await lerJson<Record<string, unknown>>(`@geladeira:refeicoes:${chaveData(d)}`, {});
    const registrou = dia && typeof dia === "object" && Object.keys(dia).length > 0;
    if (registrou) n++;
    else if (i > 0) break; // hoje ainda pode não ter registro
    d.setDate(d.getDate() - 1);
  }
  return n;
}

type Agendamento = { id?: string; titulo: string; corpo: string; quando: Date };

let timer: ReturnType<typeof setTimeout> | null = null;
let rodando = false;

/** Refaz o plano de notificações. Pode ser chamado à vontade: junta chamadas próximas e nunca lança erro. */
export function reagendarLembretes() {
  if (!N) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    if (rodando) return reagendarLembretes();
    rodando = true;
    montarPlano().catch(() => {}).finally(() => { rodando = false; });
  }, 600);
}

async function montarPlano() {
  if (!N) return;
  const prefs = await carregarPreferencias();
  const algumAtivo = prefs.agua.ativo || prefs.refeicoes.ativo || prefs.treino.ativo || prefs.pesar.ativo || prefs.parabens.ativo;
  // Cancela o plano antigo, MENOS o teste e os parabéns já agendados: eles são de uma vez só, e refazer o
  // plano (o que acontece a cada toque no app) não pode apagá-los antes de aparecerem.
  const pendentes = await N.getAllScheduledNotificationsAsync();
  const idsPendentes = new Set(pendentes.map((t) => t.identifier));
  for (const t of pendentes) {
    if (t.identifier !== "teste" && !t.identifier.startsWith("parabens-")) await N.cancelScheduledNotificationAsync(t.identifier);
  }
  if (!algumAtivo) return;
  const permissao = await N.getPermissionsAsync();
  if (!permissao.granted) return;

  const agora = new Date();
  const hoje = chaveData(agora);
  const lista: Agendamento[] = [];

  const aguaHoje = (await lerJson<number[]>(`@geladeira:agua:${hoje}`, [])).filter((n) => typeof n === "number").reduce((a, b) => a + b, 0);
  const meta = Number(await AsyncStorage.getItem(CHAVE_META_AGUA)) || 0;
  const batida = meta > 0 && aguaHoje >= meta;
  const ultimoGole = Number(await AsyncStorage.getItem(CHAVE_ULTIMO_GOLE)) || 0;
  const refeicoesHoje = await lerJson<Record<string, unknown>>(`@geladeira:refeicoes:${hoje}`, {});
  const treinosHoje = await lerJson<unknown[]>(`@geladeira:treinos:${hoje}`, []);
  const treinouHoje = Array.isArray(treinosHoje) && treinosHoje.length > 0;

  for (let i = 0; i < DIAS_A_FRENTE; i++) {
    const dia = new Date(agora);
    dia.setDate(dia.getDate() + i);
    const ehHoje = i === 0;

    if (prefs.agua.ativo && !(ehHoje && batida)) {
      for (let m = prefs.agua.inicio; m <= prefs.agua.fim; m += prefs.agua.intervaloH * 60) {
        const quando = aDate(dia, m);
        if (quando <= agora) continue;
        // Bebeu há pouco: o aviso cairia cedo demais (o ideal é espaçar os goles ao longo do dia).
        if (ehHoje && ultimoGole && quando.getTime() - ultimoGole < prefs.agua.intervaloH * 60 * 60 * 1000 * 0.75) continue;
        // Ritmo esperado até este horário, repartindo a meta de forma uniforme entre início e fim.
        const janela = Math.max(1, prefs.agua.fim - prefs.agua.inicio);
        const esperado = meta * Math.min(1, Math.max(0, (m - prefs.agua.inicio) / janela));
        const atrasada = ehHoje && meta > 0 && aguaHoje < esperado * 0.7;
        // Um copo por vez: não se recomenda compensar de uma vez (muito volume junto passa direto).
        const corpo =
          ehHoje && meta > 0
            ? atrasada
              ? `Você bebeu ${litros(aguaHoje)} L e está abaixo do ritmo. Beba um copo agora e siga ao longo do dia, sem exagerar de uma vez.`
              : aguaHoje === 0
                ? `Que tal um copo d'água? A meta de hoje é ${litros(meta)} L.`
                : `Um copo agora ajuda. Você já bebeu ${litros(aguaHoje)} L de ${litros(meta)} L.`
            : "Que tal um copo d'água agora? Seu corpo agradece.";
        lista.push({ titulo: "Hora de beber água 💧", corpo, quando });
      }
    }

    if (prefs.refeicoes.ativo) {
      const temNutri = !!(await lerVinculoCache());
      for (const r of MODELO_REFEICOES) {
        if (ehHoje && refeicoesHoje[r.chave]) continue; // já registrou: sem lembrete
        const [h, mi] = r.horario.split(":").map(Number);
        const minutos = h * 60 + mi;
        const nome = r.nome.toLowerCase();
        const hora = hhmm(minutos);
        const antes = aDate(dia, minutos - 30);
        const na_hora = aDate(dia, minutos);
        const depois = aDate(dia, minutos + 60);
        // 30 min antes: um aviso leve, para a pessoa se organizar.
        if (antes > agora) {
          lista.push({
            titulo: `Já já é hora do ${nome} 😋`,
            corpo: temNutri ? `Daqui a 30 minutos (${hora}). Que tal já separar o que o seu nutricionista indicou?` : `Daqui a 30 minutos (${hora}). Vá preparando algo gostoso e nutritivo!`,
            quando: antes,
          });
        }
        if (na_hora > agora) {
          lista.push({
            titulo: `Hora do ${nome} 🍽️`,
            corpo: temNutri ? "Veja a indicação do seu nutricionista e registre o que comeu." : "Registre o que você comeu para acompanhar o seu dia.",
            quando: na_hora,
          });
        }
        // 1 h depois: só chega se a refeição continuar sem registro (o plano é refeito ao registrar).
        if (depois > agora) {
          lista.push({
            titulo: `Você já fez o ${nome}? 🤔`,
            corpo: "Ainda não vi o registro. Se você já comeu, anote para o seu dia ficar certinho; se não, ainda dá tempo!",
            quando: depois,
          });
        }
      }
    }

    if (prefs.treino.ativo && !(ehHoje && treinouHoje)) {
      const quando = aDate(dia, prefs.treino.hora);
      if (quando > agora) lista.push({ titulo: "Hora de treinar 💪", corpo: "Um treino hoje já faz diferença. Bora?", quando });
    }
  }

  if (prefs.parabens.ativo) {
    const enviados = await lerJson<{ agua?: string; sequencia?: number }>(CHAVE_PARABENS, {});
    // Se a pessoa desfez um gole e a meta deixou de estar batida, o parabéns de hoje volta a valer.
    if (!batida && enviados.agua === hoje) delete enviados.agua;
    // Meta de água batida: um parabéns por dia, 90 s depois (se a pessoa já saiu do app, ela vê).
    if (batida && enviados.agua !== hoje) {
      lista.push({ id: `parabens-agua-${hoje}`, titulo: "Meta de água batida! 🎉", corpo: `${litros(aguaHoje)} L hoje. Seu corpo agradece.`, quando: new Date(agora.getTime() + 20 * 1000) });
      enviados.agua = hoje;
    }
    // Sequência de dias registrando: avisa nos marcos (3, 7, 14, 30...).
    const seq = await sequenciaDeDias();
    if ([3, 7, 14, 30, 60, 100].includes(seq) && enviados.sequencia !== seq) {
      const noite = aDate(agora, 20 * 60);
      lista.push({
        id: `parabens-seq-${seq}`,
        titulo: `${seq} dias seguidos! 🔥`,
        corpo: "Você está registrando suas refeições todos os dias. Constância é o que dá resultado.",
        quando: noite > agora ? noite : new Date(agora.getTime() + 20 * 1000),
      });
      enviados.sequencia = seq;
    }
    await AsyncStorage.setItem(CHAVE_PARABENS, JSON.stringify(enviados));
  }

  // O iPhone guarda no máximo 64 notificações agendadas e descarta o resto sem avisar:
  // fica com as mais próximas (o plano é refeito a cada abertura do app).
  lista.sort((x, y) => x.quando.getTime() - y.quando.getTime());
  lista.splice(60);

  for (const a of lista) {
    if (a.id && idsPendentes.has(a.id)) continue; // já está agendado
    await N.scheduleNotificationAsync({
      ...(a.id ? { identifier: a.id } : {}),
      content: { title: a.titulo, body: a.corpo, sound: false },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: a.quando, ...(Platform.OS === "android" ? { channelId: CANAL } : {}) },
    }).catch(() => {});
  }

  // Pesar: semanal, toda segunda às 8h (repete sozinho).
  if (prefs.pesar.ativo) {
    await N.scheduleNotificationAsync({
      content: { title: "Hora de se pesar ⚖️", body: "Segunda-feira é bom dia para acompanhar sua evolução.", sound: false },
      trigger: { type: N.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 8, minute: 0, ...(Platform.OS === "android" ? { channelId: CANAL } : {}) },
    }).catch(() => {});
  }
}

/** Dispara uma notificação em 5 s para a pessoa ver como fica. Devolve o que aconteceu, para o app explicar. */
export async function enviarTeste(): Promise<{ ok: boolean; detalhe: string }> {
  if (!N) return { ok: false, detalhe: "Este app não tem o módulo de notificações (instale o APK mais recente)." };
  try {
    await criarCanal();
    if (!(await pedirPermissao())) return { ok: false, detalhe: "Permissão negada. Libere as notificações do app nos ajustes do celular." };
    await N.scheduleNotificationAsync({
      identifier: "teste",
      content: { title: "Tudo certo por aqui 💧", body: "É assim que os lembretes vão aparecer.", sound: false },
      trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, ...(Platform.OS === "android" ? { channelId: CANAL } : {}) },
    });
    const agendadas = (await N.getAllScheduledNotificationsAsync()).length;
    return { ok: true, detalhe: `Agendada (${agendadas} no total). Chega em 5 segundos, mesmo com o app aberto.` };
  } catch (e: any) {
    return { ok: false, detalhe: `Erro ao agendar: ${e?.message ?? e}` };
  }
}
