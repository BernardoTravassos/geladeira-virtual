import { curtoDe, OPCOES_ROTINA } from "./camposPerfil";

export type PerfilApi = {
  nome?: string;
  idade?: number;
  sexo?: string;
  altura_cm?: number;
  peso_kg?: string | number | null; // NUMERIC do Postgres chega como string
  objetivo?: string;
  pratica_exercicio?: boolean;
  tempo_disponivel?: string;
  nivel_atividade?: string | null;
  vegano?: boolean;
  intolerancias?: string | null;
  preferencia_preparo?: string;
  // Perguntas que refinam o cálculo (todas opcionais; perfis antigos não têm).
  gestacao?: string | null; // nao | 1tri | 2tri | 3tri | lactante
  gordura_pct?: string | number | null;
  peso_meta_kg?: string | number | null;
  ritmo?: string | null; // leve | moderado | acelerado
  rotina_diaria?: string | null; // sentado | em_pe | fisico
  dias_treino?: number | null;
  minutos_treino?: number | null;
  intensidade_treino?: string | null; // leve | moderada | intensa
  condicoes_saude?: string | null; // "Diabetes, Hipertensão"
};

export type NivelAtividade = "sedentario" | "leve" | "moderado" | "intenso" | "muito_intenso";

/**
 * Fatores de atividade (PAL) usados em referências de nutrição (FAO/OMS e
 * Harris-Benedict revisado). O texto é o que a pessoa vê no questionário.
 */
export const NIVEIS_ATIVIDADE: { chave: NivelAtividade; rotulo: string; curto: string; fator: number; aguaExtraMl: number }[] = [
  { chave: "sedentario", rotulo: "Sedentário: quase não me exercito", curto: "Sedentário", fator: 1.2, aguaExtraMl: 0 },
  { chave: "leve", rotulo: "Leve: treino 1 a 2 vezes por semana", curto: "Leve", fator: 1.375, aguaExtraMl: 250 },
  { chave: "moderado", rotulo: "Moderado: treino 3 a 4 vezes por semana", curto: "Moderado", fator: 1.55, aguaExtraMl: 500 },
  { chave: "intenso", rotulo: "Intenso: treino 5 a 6 vezes por semana", curto: "Intenso", fator: 1.725, aguaExtraMl: 750 },
  { chave: "muito_intenso", rotulo: "Muito intenso: treino todo dia ou trabalho físico pesado", curto: "Muito intenso", fator: 1.9, aguaExtraMl: 1000 },
];

export const nivelPorChave = (c?: string | null) => NIVEIS_ATIVIDADE.find((n) => n.chave === c);
export const nivelPorRotulo = (r?: string | null) => NIVEIS_ATIVIDADE.find((n) => n.rotulo === r);

/**
 * Nível resumido de atividade. Com a rotina e os treinos informados, sai dos dias
 * de treino por semana; perfis antigos usam o nível guardado (ou sim/não).
 */
export function nivelDoPerfil(perfil: PerfilApi | null): NivelAtividade {
  const dias = perfil?.dias_treino;
  if (dias !== null && dias !== undefined) {
    if (dias <= 0) return "sedentario";
    if (dias <= 2) return "leve";
    if (dias <= 4) return "moderado";
    if (dias <= 6) return "intenso";
    return "muito_intenso";
  }
  const guardado = nivelPorChave(perfil?.nivel_atividade);
  if (guardado) return guardado.chave;
  return perfil?.pratica_exercicio ? "moderado" : "sedentario";
}

export type Metas = {
  calorias: number;
  proteina: number;
  carboidrato: number;
  gordura: number;
  /** A conta aberta, para a tela de perfil explicar como chegou nos números. */
  detalhes: {
    tmb: number;
    fator: number;
    nivel: string;
    gastoTotal: number;
    ajusteKcal: number; // negativo = déficit
    imc: number;
    pesoBase: number; // peso usado para proteína/gordura
    proteinaPorKg: number;
    /** Equação usada no metabolismo basal. */
    metodoTmb: string;
    /** Gasto médio por dia com os treinos (0 quando o perfil não detalha o treino). */
    gastoExercicio: number;
    /** Texto curto explicando o ajuste das calorias. */
    notaAjuste: string;
    /** Estimativa até o peso desejado, se a pessoa informou. */
    semanasParaMeta: number | null;
    kgPorSemana: number;
    avisos: string[];
  };
};

const arredondar = (v: number, passo: number) => Math.round(v / passo) * passo;
const limitar = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Parte do dia a dia fora do treino (fator sobre o basal, incluindo digestão e movimentos leves). */
const BASE_ROTINA: Record<string, number> = { sentado: 1.2, em_pe: 1.35, fisico: 1.5 };
/** MET típico por intensidade; o gasto do treino usa (MET − 1), pois o basal já cobre 1 MET. */
const MET_TREINO: Record<string, number> = { leve: 3.5, moderada: 5.5, intensa: 8 };
/** Calorias extras por dia (DRI/IOM): 2º e 3º trimestres e amamentação. */
const EXTRA_GESTACAO: Record<string, number> = { "1tri": 0, "2tri": 340, "3tri": 452, lactante: 330 };
const PCT_DEFICIT: Record<string, number> = { leve: 0.1, moderado: 0.2, acelerado: 0.25 };
const PCT_SUPERAVIT: Record<string, number> = { leve: 0.05, moderado: 0.1, acelerado: 0.15 };

/**
 * Metas diárias. Cada decisão abaixo usa o dado que a pessoa informou:
 *
 * 1. Metabolismo basal: Katch-McArdle quando a pessoa informa o percentual de
 *    gordura (usa a massa magra, mais fiel); senão Mifflin-St Jeor, a equação
 *    com melhor concordância com medição em adultos (ADA). "Outro" usa a média
 *    das duas constantes.
 * 2. Gasto diário. Com rotina e treino informados: basal × fator da rotina
 *    (1,2 sentado, 1,35 em pé, 1,5 físico) + gasto do treino (dias × duração ×
 *    (MET − 1) × peso). Sem isso (perfis antigos): basal × fator do nível.
 * 3. Gestação e amamentação somam as calorias extras das DRI e nunca têm déficit.
 * 4. Ajuste pelo objetivo PROPORCIONAL ao gasto e ao ritmo escolhido (déficit de
 *    10/20/25%, superávit de 5/10/15%), com travas de segurança:
 *      · nunca abaixo do metabolismo basal nem do piso (1.200 mulher / 1.500
 *        homem);
 *      · sem déficit para menores de 18 anos nem para IMC abaixo de 18,5;
 *      · déficit máximo de 750 kcal/dia (~0,7 kg por semana).
 * 5. Proteína por kg conforme objetivo e treino (1,0 a 2,0 g/kg), +10% para
 *    vegano, mínimo de 1,2 g/kg a partir dos 60 anos, 1,1 (gestante) ou 1,3
 *    (amamentando), e teto de 0,8 g/kg com doença renal. Em IMC ≥ 30 usa o peso
 *    ajustado.
 * 6. Gordura 25–28% das calorias (mínimo 0,6 g/kg); carboidrato é o que sobra.
 *
 * É uma estimativa de referência, não uma prescrição nutricional.
 */
export function calcularMetas(perfil: PerfilApi | null): Metas {
  const peso = Number(perfil?.peso_kg) || 70;
  const altura = perfil?.altura_cm || 170;
  const idade = perfil?.idade || 30;
  const avisos: string[] = [];

  const gorduraPct = Number(perfil?.gordura_pct) || 0;
  const usaKatch = Number(perfil?.peso_kg) > 0 && gorduraPct >= 3 && gorduraPct <= 60;
  const ajusteSexo = perfil?.sexo === "Masculino" ? 5 : perfil?.sexo === "Feminino" ? -161 : -78;
  const tmb = usaKatch
    ? 370 + 21.6 * peso * (1 - gorduraPct / 100)
    : 10 * peso + 6.25 * altura - 5 * idade + ajusteSexo;

  const nivel = NIVEIS_ATIVIDADE.find((n) => n.chave === nivelDoPerfil(perfil))!;
  const detalhado = !!perfil?.rotina_diaria && perfil?.dias_treino !== null && perfil?.dias_treino !== undefined;
  let gastoTotal: number;
  let gastoExercicio = 0;
  let fator: number;
  let nivelTexto: string;
  if (detalhado) {
    const dias = perfil!.dias_treino ?? 0;
    const minutos = perfil!.minutos_treino ?? 0;
    const met = MET_TREINO[perfil!.intensidade_treino ?? "moderada"] ?? MET_TREINO.moderada;
    gastoExercicio = dias > 0 ? (dias / 7) * (minutos / 60) * (met - 1) * peso : 0;
    gastoTotal = tmb * (BASE_ROTINA[perfil!.rotina_diaria!] ?? 1.2) + gastoExercicio;
    fator = gastoTotal / tmb;
    const rotina = curtoDe(OPCOES_ROTINA, perfil!.rotina_diaria) ?? "Rotina";
    nivelTexto = `${rotina}${dias > 0 ? `, treino ${dias}x/sem` : ", sem treino"}`;
  } else {
    fator = nivel.fator;
    gastoTotal = tmb * fator;
    nivelTexto = nivel.curto;
  }

  const m = altura / 100;
  const imc = peso / (m * m);
  const menor = idade < 18;
  const abaixoDoPeso = imc < 18.5;

  // Peso de referência para proteína/gordura: em obesidade, o peso ajustado
  // (ideal + 25% do excesso) evita metas de proteína desproporcionais.
  const pesoIdeal = 25 * m * m;
  const pesoBase = imc >= 30 ? pesoIdeal + 0.25 * (peso - pesoIdeal) : peso;

  const gest = perfil?.sexo === "Feminino" && perfil?.gestacao && perfil.gestacao !== "nao" ? perfil.gestacao : null;
  const extraGestacao = gest ? EXTRA_GESTACAO[gest] ?? 0 : 0;
  const condicoes = (perfil?.condicoes_saude ?? "").split(",").map((c) => c.trim()).filter(Boolean);
  const temCondicao = (c: string) => condicoes.includes(c);
  const ritmo = perfil?.ritmo && PCT_DEFICIT[perfil.ritmo] ? perfil.ritmo : "moderado";

  let ajusteKcal = 0;
  if (gest) {
    avisos.push(
      gest === "lactante"
        ? "Amamentando: a meta inclui calorias extras e não tem déficit. Emagrecer nessa fase deve ser acompanhado por profissional."
        : "Gestação: a meta não tem déficit nem superávit de objetivo. Siga o acompanhamento do pré-natal.",
    );
  } else if (perfil?.objetivo === "Emagrecer") {
    if (menor) avisos.push("Menores de 18 anos não devem fazer dieta de déficit sem acompanhamento profissional.");
    else if (abaixoDoPeso) avisos.push("Seu IMC já está abaixo do ideal: a meta não inclui déficit calórico.");
    else ajusteKcal = -limitar(gastoTotal * PCT_DEFICIT[ritmo], 150, 750);
  } else if (perfil?.objetivo === "Ganhar massa") {
    if (!menor) ajusteKcal = limitar(gastoTotal * PCT_SUPERAVIT[ritmo], 100, 500);
    else avisos.push("Na adolescência, o ideal é acompanhamento profissional para ganhar massa.");
  }

  const piso = perfil?.sexo === "Masculino" ? 1500 : perfil?.sexo === "Feminino" ? 1200 : 1350;
  let calorias = gastoTotal + ajusteKcal + extraGestacao;
  if (ajusteKcal < 0 && calorias < Math.max(piso, tmb)) {
    calorias = Math.max(piso, tmb);
    avisos.push("A meta foi limitada para não ficar abaixo do mínimo seguro.");
  }
  calorias = arredondar(calorias, 10);
  const ajusteTotal = Math.round(calorias - gastoTotal);
  // O arredondamento das calorias (de 10 em 10) não conta como ajuste de objetivo.
  const resto = ajusteTotal - extraGestacao;
  const ajusteObjetivo = Math.abs(resto) < 10 ? 0 : resto;

  // Proteína (g por kg do peso de referência)
  const treina = nivel.chave !== "sedentario";
  let porKg: number;
  if (perfil?.objetivo === "Emagrecer") porKg = nivel.chave === "sedentario" ? 1.6 : nivel.chave === "intenso" || nivel.chave === "muito_intenso" ? 2.0 : 1.8;
  else if (perfil?.objetivo === "Ganhar massa") porKg = treina && nivel.chave !== "leve" ? 2.0 : 1.8;
  else porKg = ({ sedentario: 1.0, leve: 1.2, moderado: 1.4, intenso: 1.6, muito_intenso: 1.6 } as const)[nivel.chave];
  if (perfil?.vegano) porKg *= 1.1;
  if (idade >= 60) porKg = Math.max(porKg, 1.2);
  if (gest === "lactante") porKg = Math.max(porKg, 1.3);
  else if (gest) porKg = Math.max(porKg, 1.1);
  porKg = Math.min(porKg, 2.5);
  if (temCondicao("Doença renal")) {
    porKg = Math.min(porKg, 0.8);
    avisos.push("Doença renal: a proteína foi limitada a 0,8 g/kg. O limite certo depende do seu estágio, combine com seu médico ou nutricionista.");
  }

  let proteina = Math.round(pesoBase * porKg);
  proteina = Math.min(proteina, Math.round((calorias * 0.35) / 4)); // nunca passa de 35% das calorias

  const fracaoGordura = perfil?.objetivo === "Emagrecer" || perfil?.objetivo === "Ganhar massa" ? 0.25 : 0.28;
  const gordura = Math.round(Math.max((calorias * fracaoGordura) / 9, 0.6 * pesoBase));
  const carboidrato = Math.max(0, Math.round((calorias - proteina * 4 - gordura * 9) / 4));

  // Peso desejado: confere a coerência e estima o prazo.
  let semanasParaMeta: number | null = null;
  const kgPorSemana = Math.round(((Math.abs(ajusteObjetivo) * 7) / 7700) * 100) / 100;
  const pesoMeta = Number(perfil?.peso_meta_kg) || 0;
  if (pesoMeta && (perfil?.objetivo === "Emagrecer" || perfil?.objetivo === "Ganhar massa")) {
    if (pesoMeta / (m * m) < 18.5) avisos.push("O peso desejado dá IMC abaixo de 18,5 (abaixo do saudável). Converse com um profissional antes de buscar esse peso.");
    if (perfil?.objetivo === "Emagrecer" && pesoMeta >= peso) avisos.push("Seu peso desejado é igual ou maior que o atual. Ajuste o objetivo ou o peso desejado.");
    else if (perfil?.objetivo === "Ganhar massa" && pesoMeta <= peso) avisos.push("Seu peso desejado é igual ou menor que o atual. Ajuste o objetivo ou o peso desejado.");
    else if (ajusteObjetivo !== 0 && (ajusteObjetivo < 0) === (pesoMeta < peso)) {
      semanasParaMeta = Math.ceil((Math.abs(peso - pesoMeta) * 7700) / (Math.abs(ajusteObjetivo) * 7));
    }
  }

  if (condicoes.length) {
    const dicas: Record<string, string> = {
      Diabetes: "Diabetes: carboidrato e horários das refeições devem seguir a orientação do seu médico.",
      "Hipertensão": "Hipertensão: atenção ao sódio (sal, embutidos, industrializados); a meta de calorias não o considera.",
      "Colesterol alto": "Colesterol alto: priorize gorduras boas e reduza gordura saturada e ultraprocessados.",
      "Problema de tireoide": "Tireoide: o metabolismo pode fugir da estimativa. Acompanhe o peso e ajuste com seu médico.",
    };
    condicoes.forEach((c) => dicas[c] && avisos.push(dicas[c]));
    avisos.push("Como você informou condição de saúde, valide estas metas com seu médico ou nutricionista.");
  }

  const pct = gastoTotal > 0 ? Math.round((Math.abs(ajusteObjetivo) / gastoTotal) * 100) : 0;
  const partes: string[] = [];
  if (ajusteObjetivo < 0) partes.push(`Déficit de ~${pct}% do gasto (ritmo ${ritmo}, máx. 750 kcal)`);
  else if (ajusteObjetivo > 0) partes.push(`Superávit de ~${pct}% do gasto (ritmo ${ritmo})`);
  if (extraGestacao > 0) partes.push(`+${extraGestacao} kcal da ${gest === "lactante" ? "amamentação" : "gestação"}`);
  const notaAjuste = partes.length ? partes.join(" · ") : "Sem ajuste";

  return {
    calorias,
    proteina,
    carboidrato,
    gordura,
    detalhes: {
      tmb: Math.round(tmb),
      fator: Math.round(fator * 100) / 100,
      nivel: nivelTexto,
      gastoTotal: Math.round(gastoTotal),
      ajusteKcal: ajusteTotal,
      imc: Math.round(imc * 10) / 10,
      pesoBase: Math.round(pesoBase),
      proteinaPorKg: Math.round(porKg * 100) / 100,
      metodoTmb: usaKatch ? "Katch-McArdle (massa magra)" : "Mifflin-St Jeor",
      gastoExercicio: Math.round(gastoExercicio),
      notaAjuste,
      semanasParaMeta,
      kgPorSemana,
      avisos,
    },
  };
}

/**
 * Meta de água: ~35 ml por kg (peso ajustado em obesidade) mais um extra pelo
 * nível de atividade, que repõe o suor (+300 ml na gestação, +700 ml amamentando). Limitada entre 1,5 e 4,5 L.
 */
export function calcularMetaAguaMl(perfil: PerfilApi | null): number {
  const peso = Number(perfil?.peso_kg);
  if (!peso) return 2000;
  const m = (perfil?.altura_cm || 170) / 100;
  const imc = peso / (m * m);
  const ideal = 25 * m * m;
  const base = imc >= 30 ? ideal + 0.25 * (peso - ideal) : peso;
  const extra = NIVEIS_ATIVIDADE.find((n) => n.chave === nivelDoPerfil(perfil))?.aguaExtraMl ?? 0;
  const gest = perfil?.sexo === "Feminino" ? perfil?.gestacao : null;
  const extraGestacao = gest === "lactante" ? 700 : gest && gest !== "nao" ? 300 : 0;
  return limitar(arredondar(base * 35 + extra + extraGestacao, 50), 1500, 4500);
}

export function saudacao(data = new Date()) {
  const hora = data.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}
