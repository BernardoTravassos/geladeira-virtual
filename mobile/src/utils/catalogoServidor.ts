import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { DEV } from "../config/dev";
import { aplicarCatalogo, Alimento } from "../data/alimentos";
import { registrarInfoDoServidor } from "../data/micronutrientes";

/**
 * Catálogo de alimentos no servidor (tabela `alimentos`, com vitaminas e minerais
 * em `alimento_micros`). O app continua com o catálogo embutido como reserva: o
 * que vem do banco é aplicado por cima e vale sem precisar de nova versão do app.
 *
 * Os alimentos que a própria pessoa criou também ficam no servidor, então
 * sobrevivem a trocar de celular.
 */

const CHAVE_PERSONALIZADOS = "@geladeira:alimentosPersonalizados";

const semServidor = () => DEV.MODO_DEMO;

async function cabecalho() {
  const token = await AsyncStorage.getItem("@geladeira:token");
  return token ? { Authorization: `Bearer ${token}` } : null;
}

type AlimentoApi = Alimento & { micros?: Record<string, number> | null; emoji?: string | null };

const paraCorpo = (a: Alimento) => ({
  nome: a.nome,
  categoria: a.categoria,
  porcaoPadrao: a.porcaoPadrao,
  kcal: a.kcal,
  proteina: a.proteina,
  carbo: a.carbo,
  gordura: a.gordura,
  medida: a.medida ?? null,
});

/** Baixa o catálogo e os alimentos da pessoa. Falhas (sem internet) são silenciosas. */
export async function sincronizarCatalogo(): Promise<void> {
  if (semServidor()) return;
  const headers = await cabecalho();
  if (!headers) return;

  try {
    const { data } = await api.get<AlimentoApi[]>("/foods", { headers, params: { limite: 1000, micros: true, fontes: "catalogo,pessoa" } });

    const comuns: Alimento[] = [];
    const doServidor: Alimento[] = [];
    for (const a of data) {
      registrarInfoDoServidor(a.id, a.emoji, a.micros);
      const { micros, emoji, ...alimento } = a;
      (a.personalizado ? doServidor : comuns).push(alimento as Alimento);
    }
    aplicarCatalogo(comuns);

    // Une os criados pela pessoa: o servidor vence nos que existem nos dois
    // lados, e o que só existe aqui sobe para o servidor.
    const bruto = await AsyncStorage.getItem(CHAVE_PERSONALIZADOS);
    const locais: Alimento[] = bruto ? JSON.parse(bruto) : [];
    const ids = new Set(doServidor.map((x) => x.id));
    const soLocais = locais.filter((x) => !ids.has(x.id));

    for (const l of soLocais) {
      if (l.oculto) continue;
      await api.put(`/foods/${l.id}`, paraCorpo(l), { headers }).catch(() => {});
    }
    // Os que a pessoa escondeu aqui também saem do servidor.
    for (const l of locais.filter((x) => x.oculto && ids.has(x.id))) {
      await api.delete(`/foods/${l.id}`, { headers }).catch(() => {});
    }

    const ocultos = new Set(locais.filter((x) => x.oculto).map((x) => x.id));
    const unidos = [
      ...doServidor.filter((x) => !ocultos.has(x.id)).map((x) => ({ ...x, personalizado: true })),
      ...locais.filter((x) => x.oculto || !ids.has(x.id)),
    ];
    await AsyncStorage.setItem(CHAVE_PERSONALIZADOS, JSON.stringify(unidos));
  } catch {
    // Sem rede ou servidor dormindo: segue com o catálogo embutido.
  }
}

/** Envia um alimento recém-criado. Se falhar, a próxima sincronização envia. */
export async function enviarPersonalizado(a: Alimento) {
  if (semServidor()) return;
  const headers = await cabecalho();
  if (!headers) return;
  await api.put(`/foods/${a.id}`, paraCorpo(a), { headers }).catch(() => {});
}

export async function apagarPersonalizadoNoServidor(id: string) {
  if (semServidor()) return;
  const headers = await cabecalho();
  if (!headers) return;
  await api.delete(`/foods/${id}`, { headers }).catch(() => {});
}

/**
 * Busca no banco do servidor (milhares de alimentos), inclusive produtos de mercado.
 * Aplica o que achou no catálogo do app e devolve os ids NA ORDEM do servidor.
 * Sem internet (ou em modo demonstração) devolve null e a tela usa só o que já tem.
 */
export async function buscarNoServidor(termo: string): Promise<string[] | null> {
  if (semServidor()) return null;
  const headers = await cabecalho();
  if (!headers) return null;
  try {
    const { data } = await api.get<AlimentoApi[]>("/foods", {
      headers,
      params: { busca: termo, limite: 40, micros: true, externo: true },
      timeout: 12000,
    });
    const comuns: Alimento[] = [];
    for (const a of data) {
      registrarInfoDoServidor(a.id, a.emoji, a.micros);
      const { micros, emoji, ...alimento } = a;
      if (!a.personalizado) comuns.push(alimento as Alimento);
    }
    aplicarCatalogo(comuns);
    return data.map((a) => a.id);
  } catch {
    return null;
  }
}
