import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { DEV } from "../config/dev";

/**
 * Espelha no servidor o diário da pessoa (refeições, água e treinos).
 *
 * O app continua lendo e escrevendo no aparelho, como sempre — é rápido e
 * funciona sem internet. Esta camada só ACOMPANHA: cada gravação local também
 * vai para a API, e ao entrar numa conta o que já está no servidor é baixado.
 *
 * Se o envio falhar (sem internet, servidor dormindo), a chave fica numa lista
 * de pendentes e é reenviada na próxima sincronização.
 */

const TIPOS = ["refeicoes", "agua", "treinos"] as const;
const PREFIXO = "@geladeira:";
export const CHAVE_PENDENTES = "@geladeira:pendentes";

const chaveLocal = (tipo: string, data: string) => `${PREFIXO}${tipo}:${data}`;

function decompor(chave: string): { tipo: string; data: string } | null {
  for (const tipo of TIPOS) {
    const inicio = `${PREFIXO}${tipo}:`;
    if (chave.startsWith(inicio)) return { tipo, data: chave.slice(inicio.length) };
  }
  return null;
}

// Tudo passa por uma fila: assim duas gravações seguidas (ex.: dois copos de
// água em sequência) chegam ao servidor na ordem certa.
let fila: Promise<unknown> = Promise.resolve();
function naFila<T>(tarefa: () => Promise<T>): Promise<T> {
  const p = fila.then(tarefa, tarefa);
  fila = p.catch(() => {});
  return p;
}

const semServidor = () => DEV.MODO_DEMO;

async function cabecalho() {
  const token = await AsyncStorage.getItem("@geladeira:token");
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function lerPendentes(): Promise<Set<string>> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_PENDENTES);
    return new Set(bruto ? (JSON.parse(bruto) as string[]) : []);
  } catch {
    return new Set();
  }
}

async function guardarPendentes(p: Set<string>) {
  await AsyncStorage.setItem(CHAVE_PENDENTES, JSON.stringify([...p]));
}

/** Envia o valor ATUAL da chave (não o de quando foi agendado): vence a última gravação. */
async function enviarAgora(chave: string): Promise<boolean> {
  const partes = decompor(chave);
  const headers = await cabecalho();
  const valor = await AsyncStorage.getItem(chave);
  if (!partes || !headers || valor == null) return true;

  try {
    await api.put(`/diary/${partes.tipo}/${partes.data}`, { conteudo: valor }, { headers });
    const pendentes = await lerPendentes();
    if (pendentes.delete(chave)) await guardarPendentes(pendentes);
    return true;
  } catch (erro: any) {
    // 4xx = o servidor recusou o conteúdo; reenviar não adianta. Só rede/5xx voltam à fila.
    const status = erro?.response?.status;
    if (!status || status >= 500 || status === 401 || status === 429) {
      const pendentes = await lerPendentes();
      pendentes.add(chave);
      await guardarPendentes(pendentes);
    }
    return false;
  }
}

/** Grava no aparelho e agenda o envio ao servidor. Use no lugar de AsyncStorage.setItem para o diário. */
export async function gravarDia(chave: string, valor: string) {
  await AsyncStorage.setItem(chave, valor);
  if (semServidor() || !decompor(chave)) return;
  naFila(() => enviarAgora(chave)).catch(() => {});
}

/**
 * Reenvia o que ficou pendente, baixa do servidor o que a pessoa já tinha e
 * sobe o que só existe no aparelho. Chamada ao entrar na conta e ao abrir o app.
 * Nunca lança erro: sem internet, o app segue funcionando com os dados locais.
 */
export function sincronizar(): Promise<void> {
  if (semServidor()) return Promise.resolve();
  return naFila(async () => {
    try {
      const headers = await cabecalho();
      if (!headers) return;

      // 1) reenvia o que falhou antes
      for (const chave of await lerPendentes()) await enviarAgora(chave);

      // 2) baixa o que está no servidor (não sobrescreve o que ainda está pendente)
      const { data } = await api.get<{ tipo: string; data: string; conteudo: string }[]>("/diary", { headers });
      const pendentes = await lerPendentes();
      const noServidor = new Set<string>();
      for (const r of data) {
        const chave = chaveLocal(r.tipo, r.data);
        noServidor.add(chave);
        if (!pendentes.has(chave)) await AsyncStorage.setItem(chave, r.conteudo);
      }

      // 3) sobe o que existe só aqui (ex.: registrado antes de haver servidor)
      const locais = (await AsyncStorage.getAllKeys()).filter((k) => decompor(k) && !noServidor.has(k));
      for (const chave of locais) await enviarAgora(chave);
    } catch {
      // sem rede ou servidor dormindo: tenta de novo na próxima vez
    }
  });
}

/** Como `sincronizar`, mas desiste de esperar após `ms` (o envio segue em segundo plano). */
export function sincronizarComLimite(ms = 15000): Promise<void> {
  return Promise.race([sincronizar(), new Promise<void>((r) => setTimeout(r, ms))]);
}
