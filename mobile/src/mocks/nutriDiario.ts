/**
 * ⚠️ DADOS DE DEMONSTRAÇÃO — o que cada paciente registrou hoje.
 *
 * Quando o vínculo e a sincronização com o servidor estiverem ligados, estes dados vêm do
 * diário do paciente (refeições, água e treinos do dia), liberados pelo próprio paciente.
 * Os alimentos usam ids do catálogo, então calorias, macros e vitaminas são calculados
 * pelas mesmas contas do app do paciente — nada é digitado à mão aqui.
 */
import type { ItemPlano } from "../utils/refeicaoDetalhe";

export type RegistroRefeicao = {
  chave: string;
  nome: string;
  horario: string;
  /** "plano": comeu o que o nutricionista indicou · "foto": reconhecido pela IA · "manual": marcou os alimentos. */
  origem: "plano" | "foto" | "manual";
  itens: ItemPlano[];
};

export type DiarioDoDia = {
  aguaMl: number;
  aguaMetaMl: number;
  /** Horários dos goles de água. */
  goles: { hora: string; ml: number }[];
  /** Água dos últimos 7 dias (o último é hoje), em ml. */
  aguaSemana: number[];
  refeicoes: RegistroRefeicao[];
  treinos: { nome: string; minutos: number; kcal: number }[];
  /** Refeições da rotina que ainda não foram registradas hoje. */
  pendentes: string[];
};

export const DIARIOS: Record<string, DiarioDoDia> = {
  "1": {
    aguaMl: 1750, aguaMetaMl: 3000,
    goles: [{ hora: "07:25", ml: 250 }, { hora: "09:50", ml: 500 }, { hora: "12:35", ml: 250 }, { hora: "13:10", ml: 500 }, { hora: "14:00", ml: 250 }],
    aguaSemana: [2800, 3100, 2400, 3000, 3300, 2100, 1750],
    refeicoes: [
      { chave: "cafe", nome: "Café da manhã", horario: "07:20", origem: "plano", itens: [
        { alimentoId: "ovo-mexido", gramas: 100 }, { alimentoId: "pao-integral", gramas: 50 }, { alimentoId: "mamao", gramas: 150 }, { alimentoId: "cafe-preto", gramas: 100 } ] },
      { chave: "lanche-manha", nome: "Lanche da manhã", horario: "10:00", origem: "manual", itens: [
        { alimentoId: "iogurte", gramas: 170 }, { alimentoId: "banana", gramas: 100 }, { alimentoId: "aveia", gramas: 30 } ] },
      { chave: "almoco", nome: "Almoço", horario: "12:40", origem: "foto", itens: [
        { alimentoId: "strogonoff", gramas: 200 }, { alimentoId: "arroz", gramas: 180 }, { alimentoId: "alface", gramas: 40 }, { alimentoId: "tomate", gramas: 60 } ] },
    ],
    treinos: [{ nome: "Musculação", minutos: 55, kcal: 320 }],
    pendentes: ["Lanche da tarde", "Jantar", "Ceia"],
  },
  "2": {
    aguaMl: 1400, aguaMetaMl: 2400,
    goles: [{ hora: "07:10", ml: 250 }, { hora: "10:30", ml: 500 }, { hora: "13:00", ml: 650 }],
    aguaSemana: [2300, 2500, 2100, 2400, 2600, 1800, 1400],
    refeicoes: [
      { chave: "cafe", nome: "Café da manhã", horario: "07:00", origem: "manual", itens: [
        { alimentoId: "tapioca", gramas: 80 }, { alimentoId: "queijo-minas", gramas: 40 }, { alimentoId: "cafe-preto", gramas: 120 } ] },
      { chave: "almoco", nome: "Almoço", horario: "13:05", origem: "foto", itens: [
        { alimentoId: "atum", gramas: 100 }, { alimentoId: "alface", gramas: 60 }, { alimentoId: "tomate", gramas: 80 }, { alimentoId: "grao-bico", gramas: 80 }, { alimentoId: "azeite", gramas: 10 } ] },
    ],
    treinos: [{ nome: "Corrida", minutos: 40, kcal: 380 }, { nome: "Alongamento", minutos: 15, kcal: 40 }],
    pendentes: ["Lanche da tarde", "Jantar"],
  },
  "3": {
    aguaMl: 0, aguaMetaMl: 2600, goles: [],
    aguaSemana: [1900, 1700, 800, 2100, 0, 1500, 0],
    refeicoes: [], treinos: [],
    pendentes: ["Café da manhã", "Almoço", "Jantar"],
  },
  "4": {
    aguaMl: 900, aguaMetaMl: 2100,
    goles: [{ hora: "08:50", ml: 250 }, { hora: "09:40", ml: 250 }, { hora: "10:30", ml: 400 }],
    aguaSemana: [2000, 2200, 1700, 2100, 2300, 1600, 900],
    refeicoes: [
      { chave: "cafe", nome: "Café da manhã", horario: "09:15", origem: "foto", itens: [
        { alimentoId: "mamao", gramas: 200 }, { alimentoId: "aveia", gramas: 40 }, { alimentoId: "mel", gramas: 20 } ] },
    ],
    treinos: [],
    pendentes: ["Almoço", "Lanche da tarde", "Jantar"],
  },
};
