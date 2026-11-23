import type { RegraNumero } from "./numeros";

// Faixas e opções do perfil num só lugar: o wizard e a tela de perfil têm que
// aceitar exatamente os mesmos valores (e os mesmos que o backend, PerfilRequest.cs).
export const REGRAS: Record<"idade" | "alturaCm" | "pesoKg" | "pesoMetaKg" | "gorduraPct", RegraNumero> = {
  idade: { artigoRotulo: "A idade", min: 13, max: 120, inteiro: "baixo" },
  alturaCm: {
    artigoRotulo: "A altura",
    min: 50,
    max: 250,
    unidade: "cm",
    inteiro: "proximo",
    outraUnidade: {
      menorQue: 3,
      mensagem:
        "Formato incorreto: a altura deve ser informada em centímetros, " +
        "como 175 — e não em metros (1,75).",
    },
  },
  pesoKg: { artigoRotulo: "O peso", min: 20, max: 400, unidade: "kg", casas: 1 },
  pesoMetaKg: { artigoRotulo: "O peso desejado", min: 20, max: 400, unidade: "kg", casas: 1 },
  gorduraPct: { artigoRotulo: "O percentual de gordura", min: 3, max: 60, unidade: "%", casas: 1 },
};

/** Opção do questionário: `chave` é o que vai para o banco, `rotulo` o que a pessoa lê. */
export type OpcaoPerfil<T extends string | number = string> = { chave: T; rotulo: string; curto?: string };

export const OPCOES_GESTACAO: OpcaoPerfil[] = [
  { chave: "nao", rotulo: "Não", curto: "Não" },
  { chave: "1tri", rotulo: "Grávida: 1º trimestre", curto: "Grávida (1º tri)" },
  { chave: "2tri", rotulo: "Grávida: 2º trimestre", curto: "Grávida (2º tri)" },
  { chave: "3tri", rotulo: "Grávida: 3º trimestre", curto: "Grávida (3º tri)" },
  { chave: "lactante", rotulo: "Amamentando", curto: "Amamentando" },
];

export const OPCOES_RITMO: OpcaoPerfil[] = [
  { chave: "leve", rotulo: "Leve e tranquilo", curto: "Leve" },
  { chave: "moderado", rotulo: "Moderado (recomendado)", curto: "Moderado" },
  { chave: "acelerado", rotulo: "Acelerado, mais puxado", curto: "Acelerado" },
];

export const OPCOES_ROTINA: OpcaoPerfil[] = [
  { chave: "sentado", rotulo: "Mais sentado(a): escritório, estudo, home office", curto: "Mais sentado(a)" },
  { chave: "em_pe", rotulo: "Em pé ou andando: comércio, aulas, saúde", curto: "Em pé / andando" },
  { chave: "fisico", rotulo: "Trabalho físico pesado: obra, carga, campo", curto: "Trabalho físico" },
];

export const OPCOES_DIAS_TREINO: OpcaoPerfil<number>[] = [
  { chave: 0, rotulo: "Nenhum, não treino", curto: "Não treina" },
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({
    chave: n,
    rotulo: n === 1 ? "1 dia por semana" : `${n} dias por semana`,
    curto: n === 1 ? "1 dia/sem" : `${n} dias/sem`,
  })),
];

export const OPCOES_DURACAO_TREINO: OpcaoPerfil<number>[] = [
  { chave: 30, rotulo: "Cerca de 30 minutos", curto: "30 min" },
  { chave: 45, rotulo: "Cerca de 45 minutos", curto: "45 min" },
  { chave: 60, rotulo: "Cerca de 1 hora", curto: "1 h" },
  { chave: 90, rotulo: "1h30 ou mais", curto: "1h30+" },
];

export const OPCOES_INTENSIDADE: OpcaoPerfil[] = [
  { chave: "leve", rotulo: "Leve: caminhada, alongamento, dá para conversar", curto: "Leve" },
  { chave: "moderada", rotulo: "Moderada: musculação, bike, dança, ritmo firme", curto: "Moderada" },
  { chave: "intensa", rotulo: "Intensa: corrida, HIIT, crossfit, esporte competitivo", curto: "Intensa" },
];

/** Têm que bater com PerfilRequest.CondicoesPermitidas no backend. */
export const OPCOES_CONDICOES = [
  "Diabetes",
  "Hipertensão",
  "Colesterol alto",
  "Doença renal",
  "Problema de tireoide",
];

export const rotuloDe = <T extends string | number>(lista: OpcaoPerfil<T>[], chave: unknown) =>
  lista.find((o) => o.chave === chave)?.rotulo;
export const curtoDe = <T extends string | number>(lista: OpcaoPerfil<T>[], chave: unknown) => {
  const o = lista.find((x) => x.chave === chave);
  return o ? o.curto ?? o.rotulo : undefined;
};
export const chaveDe = <T extends string | number>(lista: OpcaoPerfil<T>[], rotulo: string) =>
  lista.find((o) => o.rotulo === rotulo)?.chave;

export const OPCOES_INTOLERANCIA = [
  "Lactose",
  "Glúten",
  "Frutose",
  "Ovo",
  "Soja",
  "Amendoim",
  "Castanhas e nozes",
  "Frutos do mar",
  "Outra",
];
