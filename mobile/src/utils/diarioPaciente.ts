import type { LinhaDiario } from "../services/nutri";
import type { EstimativaSalva, ItemPrato } from "./refeicoes";
import { detalharFoto, detalharRefeicao } from "./refeicaoDetalhe";
import { chaveData } from "./dia";

/**
 * Transforma o diário que o servidor guarda (o mesmo JSON que o app do paciente grava) no que a
 * tela do nutricionista mostra. Nada é inventado: o que o servidor não tem (horário de cada gole,
 * dados do smartwatch, gasto calórico) simplesmente fica de fora.
 */

export const REFEICOES_DA_ROTINA = [
  { chave: "cafe", nome: "Café da manhã" },
  { chave: "lanche-manha", nome: "Lanche da manhã" },
  { chave: "almoco", nome: "Almoço" },
  { chave: "lanche-tarde", nome: "Lanche da tarde" },
  { chave: "jantar", nome: "Jantar" },
  { chave: "ceia", nome: "Ceia" },
];

export type RegistroNutri = {
  chave: string;
  nome: string;
  horario: string;
  /** "foto": reconhecido pela IA · "manual": a pessoa marcou os alimentos. */
  origem: "foto" | "manual";
  itens: ItemPrato[];
  estimativa?: EstimativaSalva;
};

export type DiarioReal = {
  aguaMl: number;
  /** Cada gole, em ml (o app não guarda a hora). */
  goles: number[];
  /** Água dos últimos 7 dias; o último é hoje. */
  aguaSemana: number[];
  /** Calorias registradas nos últimos 7 dias; o último é hoje. */
  kcalSemana: number[];
  rotulosSemana: string[];
  refeicoes: RegistroNutri[];
  treinos: { nome: string; minutos: number; kcal: number }[];
  pendentes: string[];
  /** % dos últimos 7 dias com pelo menos uma refeição registrada. */
  adesao: number;
  /** Quando foi a última refeição registrada (texto pronto), ou null. */
  ultimoRegistro: string | null;
};

const json = (c: string): any => {
  try { return JSON.parse(c); } catch { return null; }
};

export const detalheDoRegistro = (r: Pick<RegistroNutri, "itens" | "estimativa">) =>
  r.itens.length > 0 ? detalharRefeicao(r.itens) : detalharFoto(r.estimativa?.alimentos.map((a) => ({ ...a })) as any ?? []);

const hora = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(+d) ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
};

export function montarDiario(linhas: LinhaDiario[], agora = new Date()): DiarioReal {
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(agora);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const chaves = dias.map(chaveData);
  const hoje = chaves[6];
  const de = (tipo: string, data: string) => {
    const l = linhas.find((x) => x.tipo === tipo && x.data === data);
    return l ? json(l.conteudo) : null;
  };

  const registrosDe = (data: string): RegistroNutri[] => {
    const dia = de("refeicoes", data);
    if (!dia || typeof dia !== "object") return [];
    const legado = (k: string) => (k === "lanche" ? "lanche-tarde" : k);
    return Object.entries<any>(dia)
      .filter(([, r]) => r && (r.itens?.length || r.estimativa))
      .map(([k, r]) => {
        const chave = legado(k);
        return {
          chave,
          nome: REFEICOES_DA_ROTINA.find((m) => m.chave === chave)?.nome ?? chave,
          horario: hora(r.registradoEm),
          origem: r.estimativa && !(r.itens?.length) ? "foto" : "manual",
          itens: r.itens ?? [],
          estimativa: r.estimativa,
        } as RegistroNutri;
      })
      .sort((a, b) => REFEICOES_DA_ROTINA.findIndex((m) => m.chave === a.chave) - REFEICOES_DA_ROTINA.findIndex((m) => m.chave === b.chave));
  };

  const kcalDoDia = (data: string) =>
    registrosDe(data).reduce((s, r) => s + detalheDoRegistro(r).total.kcal, 0);
  const golesDe = (data: string): number[] => {
    const l = de("agua", data);
    return Array.isArray(l) ? l.filter((n) => typeof n === "number") : [];
  };

  const refeicoes = registrosDe(hoje);
  const feitas = new Set(refeicoes.map((r) => r.chave));
  const goles = golesDe(hoje);
  const treinosBrutos = de("treinos", hoje);

  // Última refeição registrada nos 7 dias.
  let ultimo: string | null = null;
  for (let i = 6; i >= 0 && !ultimo; i--) {
    const regs = registrosDe(chaves[i]);
    const comHora = regs.map((r) => r.horario).filter(Boolean);
    if (regs.length) ultimo = `${i === 6 ? "hoje" : i === 5 ? "ontem" : dias[i].toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}${comHora.length ? `, ${comHora[comHora.length - 1]}` : ""}`;
  }

  return {
    aguaMl: goles.reduce((a, b) => a + b, 0),
    goles,
    aguaSemana: chaves.map((c) => golesDe(c).reduce((a, b) => a + b, 0)),
    kcalSemana: chaves.map((c) => Math.round(kcalDoDia(c))),
    rotulosSemana: dias.map((d) => "DSTQQSS"[d.getDay()]),
    refeicoes,
    treinos: (Array.isArray(treinosBrutos) ? treinosBrutos : []).map((t: any) => ({
      nome: String(t.tipo ?? "Treino"), minutos: Number(t.minutos) || 0, kcal: Math.round(Number(t.kcal) || 0),
    })),
    pendentes: REFEICOES_DA_ROTINA.filter((m) => !feitas.has(m.chave)).map((m) => m.nome),
    adesao: Math.round((chaves.filter((c) => registrosDe(c).length > 0).length / 7) * 100),
    ultimoRegistro: ultimo,
  };
}
