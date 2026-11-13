import AsyncStorage from "@react-native-async-storage/async-storage";
import { semente } from "./aleatorio";
import { DEV } from "../config/dev";
import { alimentoDoItem } from "../data/alimentos";
import { lerSaudeDeDatas, Treino } from "./saude";
import { RegistroDoDia, RegistroRefeicao, totaisDoRegistro } from "./refeicoes";

export type PeriodoHistorico = "dia" | "semana" | "mes" | "semestre";

export const PERIODOS: { chave: PeriodoHistorico; nome: string; icone: "sun" | "calendar" | "bar-chart-2" | "trending-up" }[] = [
  { chave: "dia", nome: "1 dia", icone: "sun" },
  { chave: "semana", nome: "1 semana", icone: "calendar" },
  { chave: "mes", nome: "1 mês", icone: "bar-chart-2" },
  { chave: "semestre", nome: "6 meses", icone: "trending-up" },
];

export type DiaResumo = {
  data: Date;
  registrado: boolean; // houve ao menos uma refeição registrada
  exemplo: boolean; // dado de exemplo (DEV.HISTORICO_DE_EXEMPLO), não registrado pela pessoa
  kcal: number;
  proteina: number;
  carbo: number;
  gordura: number;
  porRefeicao: Record<string, number>; // kcal por refeição
  aguaMl: number; // água bebida no dia
  treinos: Treino[];
  treinou: boolean;
  gastasKcal: number; // calorias gastas em atividade (smartwatch + treinos)
  passos?: number;
  alimentos: { nome: string; gramas: number }[];
};

const PREFIXO = "@geladeira:refeicoes:";
// Mesma chave que utils/refeicoes.ts usa para salvar o dia.
const chaveDe = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${PREFIXO}${d.getFullYear()}-${mm}-${dd}`;
};

// Mesma chave que components/CardAgua.tsx usa para salvar a água do dia.
const chaveAguaDe = (d: Date) => chaveDe(d).replace("refeicoes", "agua");

type SaudeResumo = Pick<import("./saude").SaudeDoDia, "treinos" | "treinou" | "caloriasGastas" | "passos">;

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Primeiro dia coberto pelo período (inclusive), terminando hoje. */
export function inicioDoPeriodo(periodo: PeriodoHistorico, hoje = new Date()): Date {
  const h = inicioDoDia(hoje);
  if (periodo === "dia") return h;
  if (periodo === "semana") return new Date(h.getFullYear(), h.getMonth(), h.getDate() - 6);
  if (periodo === "mes") return new Date(h.getFullYear(), h.getMonth(), h.getDate() - 29);
  return new Date(h.getFullYear(), h.getMonth() - 5, 1); // 6 meses: do dia 1 de 5 meses atrás até hoje
}

function resumir(data: Date, dia: RegistroDoDia, exemplo: boolean, aguaMl: number, saude: SaudeResumo): DiaResumo {
  const porRefeicao: Record<string, number> = {};
  const alimentos = new Map<string, number>();
  let kcal = 0, proteina = 0, carbo = 0, gordura = 0;

  for (const [chave, reg] of Object.entries(dia)) {
    const t = totaisDoRegistro(reg);
    const k = chave === "lanche" ? "lanche-tarde" : chave; // chave antiga
    porRefeicao[k] = (porRefeicao[k] ?? 0) + Math.round(t.kcal);
    kcal += t.kcal; proteina += t.proteina; carbo += t.carbo; gordura += t.gordura;

    if (reg.itens.length > 0) {
      for (const it of reg.itens) {
        const nome = alimentoDoItem(it)?.nome;
        if (nome) alimentos.set(nome, (alimentos.get(nome) ?? 0) + it.gramas);
      }
    } else if (reg.estimativa) {
      for (const a of reg.estimativa.alimentos) alimentos.set(a.nome, (alimentos.get(a.nome) ?? 0) + a.gramas);
    }
  }

  return {
    data,
    registrado: Object.keys(dia).length > 0,
    exemplo,
    kcal: Math.round(kcal),
    proteina: Math.round(proteina),
    carbo: Math.round(carbo),
    gordura: Math.round(gordura),
    porRefeicao,
    aguaMl,
    treinos: saude.treinos,
    treinou: saude.treinou,
    gastasKcal: saude.caloriasGastas,
    passos: saude.passos,
    alimentos: [...alimentos].map(([nome, gramas]) => ({ nome, gramas })),
  };
}

/** Todos os dias do período, do mais antigo ao mais recente (hoje por último). */
export async function carregarHistorico(periodo: PeriodoHistorico, metaKcal: number, metaAguaMl: number, pesoKg = 70): Promise<DiaResumo[]> {
  const hoje = inicioDoDia(new Date());
  const datas: Date[] = [];
  for (let d = inicioDoPeriodo(periodo); d <= hoje; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    datas.push(d);
  }

  const saudeDias = await lerSaudeDeDatas(datas, pesoKg);
  let salvos: [string, string | null][] = [];
  let salvosAgua: [string, string | null][] = [];
  try {
    [salvos, salvosAgua] = (await Promise.all([
      AsyncStorage.multiGet(datas.map(chaveDe)),
      AsyncStorage.multiGet(datas.map(chaveAguaDe)),
    ])).map((r) => [...r]) as [[string, string | null][], [string, string | null][]];
  } catch {
    // sem acesso ao armazenamento: segue com dias vazios
  }

  return datas.map((data, i) => {
    let dia: RegistroDoDia = {};
    try {
      dia = salvos[i]?.[1] ? JSON.parse(salvos[i][1] as string) : {};
    } catch {
      dia = {};
    }
    let aguaMl = 0;
    try {
      const lista = salvosAgua[i]?.[1] ? JSON.parse(salvosAgua[i][1] as string) : [];
      if (Array.isArray(lista)) aguaMl = lista.filter((n: unknown) => typeof n === "number").reduce((a: number, b: number) => a + b, 0);
    } catch {
      aguaMl = 0;
    }

    const temReal = Object.keys(dia).length > 0;
    const ehHoje = data.getTime() === hoje.getTime();
    if (!temReal && !ehHoje && DEV.HISTORICO_DE_EXEMPLO) {
      const exemplo = diaDeExemplo(data, metaKcal);
      const rnd = semente(data.getFullYear() * 10000 + (data.getMonth() + 1) * 100 + data.getDate() + 7);
      // Dias de exemplo SEM refeição também ficam sem água (a pessoa não usou o app); nos demais, 65–110% da meta.
      const aguaExemplo = aguaMl > 0 ? aguaMl : Object.keys(exemplo).length ? Math.round((metaAguaMl * (0.65 + rnd() * 0.45)) / 50) * 50 : 0;
      return resumir(data, exemplo, true, aguaExemplo, saudeDias[i]);
    }
    return resumir(data, dia, false, aguaMl, saudeDias[i]);
  });
}

// ───────────────────────── dados de exemplo (só DEV) ─────────────────────────

// Gerador pseudoaleatório determinístico: o mesmo dia sempre gera o mesmo exemplo,
// senão os gráficos mudariam a cada abertura.

const REFEICOES_EXEMPLO: { chave: string; fracao: number; chance: number; pratos: string[][] }[] = [
  { chave: "cafe", fracao: 0.25, chance: 0.92, pratos: [["Pão francês", "Ovo cozido", "Café com açúcar"], ["Tapioca", "Queijo", "Mamão"], ["Aveia", "Banana", "Leite"]] },
  { chave: "almoco", fracao: 0.3, chance: 0.97, pratos: [["Arroz branco", "Feijão", "Frango grelhado", "Alface"], ["Arroz branco", "Feijão", "Carne bovina", "Tomate"], ["Macarrão", "Carne bovina", "Cenoura"], ["Arroz integral", "Peixe grelhado", "Brócolis"]] },
  { chave: "lanche", fracao: 0.1, chance: 0.75, pratos: [["Iogurte natural", "Maçã"], ["Castanhas", "Banana"], ["Pão de forma", "Requeijão"]] },
  { chave: "jantar", fracao: 0.25, chance: 0.9, pratos: [["Frango grelhado", "Batata-doce", "Abobrinha"], ["Omelete", "Salada"], ["Arroz branco", "Feijão", "Ovo cozido"]] },
  { chave: "ceia", fracao: 0.1, chance: 0.4, pratos: [["Leite", "Aveia"], ["Iogurte natural"]] },
];

function diaDeExemplo(data: Date, metaKcal: number): RegistroDoDia {
  const rnd = semente(data.getFullYear() * 10000 + (data.getMonth() + 1) * 100 + data.getDate());
  // ~12% dos dias a pessoa não registra nada — o painel precisa mostrar essa realidade.
  if (rnd() < 0.12) return {};

  const dia: RegistroDoDia = {};
  const humor = 0.85 + rnd() * 0.4; // dias de exagero e dias de contenção
  for (const r of REFEICOES_EXEMPLO) {
    if (rnd() > r.chance) continue;
    const kcal = Math.round(metaKcal * r.fracao * humor * (0.8 + rnd() * 0.4));
    const prato = r.pratos[Math.floor(rnd() * r.pratos.length)];
    const porItem = Math.round(120 + rnd() * 60);
    const reg: RegistroRefeicao = {
      itens: [],
      estimativa: {
        kcal,
        proteina: Math.round((kcal * (0.18 + rnd() * 0.08)) / 4),
        carbo: Math.round((kcal * (0.45 + rnd() * 0.1)) / 4),
        gordura: Math.round((kcal * (0.25 + rnd() * 0.06)) / 9),
        alimentos: prato.map((nome) => ({ nome, gramas: porItem })),
        confianca: "media",
      },
      registradoEm: data.toISOString(),
    };
    dia[r.chave] = reg;
  }
  return dia;
}
