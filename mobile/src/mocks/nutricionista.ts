/**
 * ⚠️ DADOS DE DEMONSTRAÇÃO — nada aqui vem do backend.
 *
 * Existem para mostrar como a área do nutricionista vai funcionar, antes de as
 * funcionalidades que produzem esses dados existirem:
 *
 *   registro de refeições    → não construído
 *   calorias gastas          → depende da integração com smartwatch
 *   dados do smartwatch      → não construído
 *   cardápios gerados        → Fase 4, não construída
 *
 * Quando cada uma ficar pronta, a tela correspondente troca este arquivo pela
 * chamada de API. Tudo está concentrado aqui de propósito: apagar este arquivo
 * é o que vai sobrar de trabalho de limpeza.
 */

export type Macro = { nome: string; atual: number; meta: number };

export type Refeicao = {
  nome: string;
  horario: string;
  descricao: string;
  calorias: number;
};

export type DiaDaSemana = {
  dia: string;
  consumidas: number;
  gastas: number;
};

export type Paciente = {
  id: string;
  nome: string;
  idade: number;
  objetivo: string;
  pesoKg: number;
  pesoInicialKg: number;
  adesao: number;          // % de dias com registro completo na semana
  ultimoRegistro: string;
  metaCalorias: number;
  consumidasHoje: number;
  gastasHoje: number;
  macros: Macro[];
  semana: DiaDaSemana[];
  refeicoesHoje: Refeicao[];
  cardapiosRecentes: { titulo: string; quando: string; calorias: number }[];
  smartwatch: {
    sincronizadoEm: string;
    passos: number;
    batimentoMedio: number;
    minutosAtivos: number;
    sonoHoras: number;
    metaPassos: number;
    /** Mesma ordem dos dias de `semana`. */
    passosSemana: number[];
    mediaBatimento: number;
    totalMinutosAtivos: number;
    mediaSonoHoras: number;
  };
};

export const NUTRICIONISTA = {
  nome: "Dra. Carla Menezes",
  crn: "CRN-3 12345",
  plano: "Profissional",
  vagas: 5,
  renovaEm: "18/11/2026",
};

export const PACIENTES: Paciente[] = [
  {
    id: "1",
    nome: "Bernardo Sá",
    idade: 36,
    objetivo: "Ganhar massa",
    pesoKg: 77.5,
    pesoInicialKg: 74.2,
    adesao: 86,
    ultimoRegistro: "hoje, 12:40",
    metaCalorias: 2680,
    consumidasHoje: 1840,
    gastasHoje: 2310,
    macros: [
      { nome: "Proteína", atual: 118, meta: 155 },
      { nome: "Carboidrato", atual: 210, meta: 300 },
      { nome: "Gordura", atual: 52, meta: 74 },
    ],
    semana: [
      { dia: "S", consumidas: 2540, gastas: 2280 },
      { dia: "T", consumidas: 2710, gastas: 2460 },
      { dia: "Q", consumidas: 2380, gastas: 2190 },
      { dia: "Q", consumidas: 2650, gastas: 2520 },
      { dia: "S", consumidas: 2820, gastas: 2400 },
      { dia: "S", consumidas: 2190, gastas: 1980 },
      { dia: "D", consumidas: 1840, gastas: 2310 },
    ],
    refeicoesHoje: [
      { nome: "Café da manhã", horario: "07:20", descricao: "Ovos mexidos, pão integral, café", calorias: 430 },
      { nome: "Lanche", horario: "10:00", descricao: "Iogurte natural com banana", calorias: 210 },
      { nome: "Almoço", horario: "12:40", descricao: "Frango grelhado, arroz, feijão, salada", calorias: 1200 },
    ],
    cardapiosRecentes: [
      { titulo: "Frango grelhado com legumes", quando: "ontem", calorias: 520 },
      { titulo: "Omelete de espinafre", quando: "2 dias atrás", calorias: 340 },
    ],
    smartwatch: {
      sincronizadoEm: "há 12 min",
      passos: 8430, batimentoMedio: 72, minutosAtivos: 54, sonoHoras: 7.2,
      metaPassos: 10000,
      passosSemana: [9120, 11430, 7840, 10260, 12050, 6380, 8430],
      mediaBatimento: 71, totalMinutosAtivos: 326, mediaSonoHoras: 7.0,
    },
  },
  {
    id: "2",
    nome: "Mariana Alves",
    idade: 29,
    objetivo: "Emagrecer",
    pesoKg: 68.1,
    pesoInicialKg: 72.0,
    adesao: 94,
    ultimoRegistro: "hoje, 13:05",
    metaCalorias: 1650,
    consumidasHoje: 1120,
    gastasHoje: 1890,
    macros: [
      { nome: "Proteína", atual: 78, meta: 102 },
      { nome: "Carboidrato", atual: 96, meta: 155 },
      { nome: "Gordura", atual: 38, meta: 46 },
    ],
    semana: [
      { dia: "S", consumidas: 1580, gastas: 1920 },
      { dia: "T", consumidas: 1610, gastas: 2040 },
      { dia: "Q", consumidas: 1490, gastas: 1870 },
      { dia: "Q", consumidas: 1720, gastas: 1950 },
      { dia: "S", consumidas: 1530, gastas: 2110 },
      { dia: "S", consumidas: 1880, gastas: 1760 },
      { dia: "D", consumidas: 1120, gastas: 1890 },
    ],
    refeicoesHoje: [
      { nome: "Café da manhã", horario: "07:00", descricao: "Tapioca com queijo branco", calorias: 320 },
      { nome: "Almoço", horario: "13:05", descricao: "Salada completa com atum", calorias: 800 },
    ],
    cardapiosRecentes: [{ titulo: "Salada de grão-de-bico", quando: "hoje", calorias: 410 }],
    smartwatch: {
      sincronizadoEm: "há 3 min",
      passos: 11250, batimentoMedio: 68, minutosAtivos: 72, sonoHoras: 6.8,
      metaPassos: 10000,
      passosSemana: [10800, 12340, 9980, 13100, 11520, 8640, 11250],
      mediaBatimento: 67, totalMinutosAtivos: 438, mediaSonoHoras: 6.9,
    },
  },
  {
    id: "3",
    nome: "Rafael Lima",
    idade: 41,
    objetivo: "Manter o peso",
    pesoKg: 82.0,
    pesoInicialKg: 82.4,
    adesao: 57,
    ultimoRegistro: "ontem, 19:30",
    metaCalorias: 2400,
    consumidasHoje: 0,
    gastasHoje: 1640,
    macros: [
      { nome: "Proteína", atual: 0, meta: 115 },
      { nome: "Carboidrato", atual: 0, meta: 270 },
      { nome: "Gordura", atual: 0, meta: 67 },
    ],
    semana: [
      { dia: "S", consumidas: 2380, gastas: 2250 },
      { dia: "T", consumidas: 2410, gastas: 2180 },
      { dia: "Q", consumidas: 0, gastas: 2050 },
      { dia: "Q", consumidas: 2290, gastas: 2310 },
      { dia: "S", consumidas: 0, gastas: 1980 },
      { dia: "S", consumidas: 2650, gastas: 2120 },
      { dia: "D", consumidas: 0, gastas: 1640 },
    ],
    refeicoesHoje: [],
    cardapiosRecentes: [],
    smartwatch: {
      sincronizadoEm: "ontem, 22:10",
      passos: 4210, batimentoMedio: 76, minutosAtivos: 18, sonoHoras: 5.9,
      metaPassos: 10000,
      passosSemana: [6540, 5890, 3120, 7210, 4480, 5960, 4210],
      mediaBatimento: 77, totalMinutosAtivos: 152, mediaSonoHoras: 6.1,
    },
  },
  {
    id: "4",
    nome: "Juliana Castro",
    idade: 33,
    objetivo: "Comer mais saudável",
    pesoKg: 61.3,
    pesoInicialKg: 61.9,
    adesao: 78,
    ultimoRegistro: "hoje, 09:15",
    metaCalorias: 1900,
    consumidasHoje: 640,
    gastasHoje: 1420,
    macros: [
      { nome: "Proteína", atual: 32, meta: 86 },
      { nome: "Carboidrato", atual: 74, meta: 214 },
      { nome: "Gordura", atual: 19, meta: 53 },
    ],
    semana: [
      { dia: "S", consumidas: 1820, gastas: 1740 },
      { dia: "T", consumidas: 1960, gastas: 1810 },
      { dia: "Q", consumidas: 1750, gastas: 1690 },
      { dia: "Q", consumidas: 1880, gastas: 1920 },
      { dia: "S", consumidas: 2040, gastas: 1780 },
      { dia: "S", consumidas: 1690, gastas: 1550 },
      { dia: "D", consumidas: 640, gastas: 1420 },
    ],
    refeicoesHoje: [
      { nome: "Café da manhã", horario: "09:15", descricao: "Mamão, aveia e mel", calorias: 640 },
    ],
    cardapiosRecentes: [{ titulo: "Wrap de frango com salada", quando: "anteontem", calorias: 480 }],
    smartwatch: {
      sincronizadoEm: "há 41 min",
      passos: 6180, batimentoMedio: 70, minutosAtivos: 31, sonoHoras: 7.9,
      metaPassos: 8000,
      passosSemana: [7420, 8150, 6890, 9030, 7640, 5210, 6180],
      mediaBatimento: 70, totalMinutosAtivos: 214, mediaSonoHoras: 7.6,
    },
  },
];
