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

/** Perfis antigos só têm "pratica exercício sim/não": o nível é estimado a partir dele. */
export function nivelDoPerfil(perfil: PerfilApi | null): NivelAtividade {
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
    avisos: string[];
  };
};

const arredondar = (v: number, passo: number) => Math.round(v / passo) * passo;
const limitar = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/**
 * Metas diárias. Cada decisão abaixo usa o dado que a pessoa informou:
 *
 * 1. Metabolismo basal por Mifflin-St Jeor — a equação com melhor concordância
 *    com medição em adultos (ADA). "Outro" usa a média das duas constantes.
 * 2. Gasto diário = basal × fator do nível de atividade (1,2 a 1,9). É o ponto
 *    que mais pesa: errar o nível muda a meta em até 30%.
 * 3. Ajuste pelo objetivo PROPORCIONAL ao gasto (déficit de 20%, superávit de
 *    10%), e não um número fixo — 400 kcal tira 25% de quem gasta 1.600 e só
 *    13% de quem gasta 3.000. Com travas de segurança:
 *      · nunca abaixo do metabolismo basal nem do piso (1.200 mulher / 1.500
 *        homem);
 *      · sem déficit para menores de 18 anos nem para IMC abaixo de 18,5;
 *      · déficit máximo de 750 kcal/dia (~0,7 kg por semana).
 * 4. Proteína por kg conforme objetivo e treino (1,0 a 2,0 g/kg), +10% para
 *    vegano (digestibilidade menor), mínimo de 1,2 g/kg a partir dos 60 anos.
 *    Para IMC ≥ 30 usa o peso ajustado, senão a proteína fica exagerada.
 * 5. Gordura 25–28% das calorias (mínimo 0,6 g/kg); carboidrato é o que sobra.
 *
 * É uma estimativa de referência, não uma prescrição nutricional.
 */
export function calcularMetas(perfil: PerfilApi | null): Metas {
  const peso = Number(perfil?.peso_kg) || 70;
  const altura = perfil?.altura_cm || 170;
  const idade = perfil?.idade || 30;
  const avisos: string[] = [];

  const ajusteSexo = perfil?.sexo === "Masculino" ? 5 : perfil?.sexo === "Feminino" ? -161 : -78;
  const tmb = 10 * peso + 6.25 * altura - 5 * idade + ajusteSexo;

  const nivel = NIVEIS_ATIVIDADE.find((n) => n.chave === nivelDoPerfil(perfil))!;
  const gastoTotal = tmb * nivel.fator;

  const m = altura / 100;
  const imc = peso / (m * m);
  const menor = idade < 18;
  const abaixoDoPeso = imc < 18.5;

  // Peso de referência para proteína/gordura: em obesidade, o peso ajustado
  // (ideal + 25% do excesso) evita metas de proteína desproporcionais.
  const pesoIdeal = 25 * m * m;
  const pesoBase = imc >= 30 ? pesoIdeal + 0.25 * (peso - pesoIdeal) : peso;

  let ajusteKcal = 0;
  if (perfil?.objetivo === "Emagrecer") {
    if (menor) avisos.push("Menores de 18 anos não devem fazer dieta de déficit sem acompanhamento profissional.");
    else if (abaixoDoPeso) avisos.push("Seu IMC já está abaixo do ideal: a meta não inclui déficit calórico.");
    else ajusteKcal = -limitar(gastoTotal * 0.2, 300, 750);
  } else if (perfil?.objetivo === "Ganhar massa") {
    if (!menor) ajusteKcal = limitar(gastoTotal * 0.1, 200, 500);
    else avisos.push("Na adolescência, o ideal é acompanhamento profissional para ganhar massa.");
  }

  const piso = perfil?.sexo === "Masculino" ? 1500 : perfil?.sexo === "Feminino" ? 1200 : 1350;
  let calorias = gastoTotal + ajusteKcal;
  if (ajusteKcal < 0 && calorias < Math.max(piso, tmb)) {
    calorias = Math.max(piso, tmb);
    ajusteKcal = calorias - gastoTotal;
    avisos.push("A meta foi limitada para não ficar abaixo do mínimo seguro.");
  }
  calorias = arredondar(calorias, 10);
  ajusteKcal = Math.round(calorias - gastoTotal);

  // Proteína (g por kg do peso de referência)
  const treina = nivel.chave !== "sedentario";
  let porKg: number;
  if (perfil?.objetivo === "Emagrecer") porKg = nivel.chave === "sedentario" ? 1.6 : nivel.chave === "intenso" || nivel.chave === "muito_intenso" ? 2.0 : 1.8;
  else if (perfil?.objetivo === "Ganhar massa") porKg = treina && nivel.chave !== "leve" ? 2.0 : 1.8;
  else porKg = ({ sedentario: 1.0, leve: 1.2, moderado: 1.4, intenso: 1.6, muito_intenso: 1.6 } as const)[nivel.chave];
  if (perfil?.vegano) porKg *= 1.1;
  if (idade >= 60) porKg = Math.max(porKg, 1.2);
  porKg = Math.min(porKg, 2.5);

  let proteina = Math.round(pesoBase * porKg);
  proteina = Math.min(proteina, Math.round((calorias * 0.35) / 4)); // nunca passa de 35% das calorias

  const fracaoGordura = perfil?.objetivo === "Emagrecer" || perfil?.objetivo === "Ganhar massa" ? 0.25 : 0.28;
  const gordura = Math.round(Math.max((calorias * fracaoGordura) / 9, 0.6 * pesoBase));
  const carboidrato = Math.max(0, Math.round((calorias - proteina * 4 - gordura * 9) / 4));

  return {
    calorias,
    proteina,
    carboidrato,
    gordura,
    detalhes: {
      tmb: Math.round(tmb),
      fator: nivel.fator,
      nivel: nivel.curto,
      gastoTotal: Math.round(gastoTotal),
      ajusteKcal,
      imc: Math.round(imc * 10) / 10,
      pesoBase: Math.round(pesoBase),
      proteinaPorKg: Math.round(porKg * 100) / 100,
      avisos,
    },
  };
}

/**
 * Meta de água: ~35 ml por kg (peso ajustado em obesidade) mais um extra pelo
 * nível de atividade, que repõe o suor. Limitada entre 1,5 e 4,5 L.
 */
export function calcularMetaAguaMl(perfil: PerfilApi | null): number {
  const peso = Number(perfil?.peso_kg);
  if (!peso) return 2000;
  const m = (perfil?.altura_cm || 170) / 100;
  const imc = peso / (m * m);
  const ideal = 25 * m * m;
  const base = imc >= 30 ? ideal + 0.25 * (peso - ideal) : peso;
  const extra = NIVEIS_ATIVIDADE.find((n) => n.chave === nivelDoPerfil(perfil))?.aguaExtraMl ?? 0;
  return limitar(arredondar(base * 35 + extra, 50), 1500, 4500);
}

export function saudacao(data = new Date()) {
  const hora = data.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}
