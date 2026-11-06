// DADOS DE EXEMPLO. Quando a IA gerar cardápios de verdade (Fase 4), cada
// consulta passará a trazer uma receita neste mesmo formato.
export type Receita = {
  id: string;
  titulo: string;
  quando: string; // "Ontem", "Anteontem"...
  tempoMin: number;
  porcoes: number;
  dificuldade: "Fácil" | "Média";
  calorias: number; // por porção
  proteina: number;
  carbo: number;
  gordura: number;
  icone: "sun" | "moon" | "coffee" | "zap";
  ingredientes: string[];
  passos: string[];
  dica?: string;
  geladeira: string; // o que foi identificado na geladeira
};

export const RECEITAS: Receita[] = [
  {
    id: "1",
    titulo: "Frango grelhado com legumes",
    quando: "Ontem",
    tempoMin: 30,
    porcoes: 2,
    dificuldade: "Fácil",
    calorias: 520,
    proteina: 46,
    carbo: 28,
    gordura: 24,
    icone: "sun",
    geladeira: "peito de frango, abobrinha, cenoura, brócolis, limão",
    ingredientes: [
      "300 g de peito de frango em filés",
      "1 abobrinha em rodelas",
      "1 cenoura em tiras",
      "1 xícara de brócolis em floretes",
      "2 dentes de alho picados",
      "1 colher (sopa) de azeite",
      "Suco de ½ limão",
      "Sal e pimenta a gosto",
    ],
    passos: [
      "Tempere o frango com sal, pimenta, alho e o suco de limão. Deixe descansar por 10 minutos.",
      "Aqueça uma frigideira antiaderente em fogo médio-alto com metade do azeite.",
      "Grelhe os filés por 5 a 6 minutos de cada lado, até dourar. Reserve.",
      "Na mesma frigideira, coloque o restante do azeite e refogue a cenoura por 3 minutos.",
      "Junte a abobrinha e o brócolis, tampe e cozinhe por mais 5 minutos, mexendo de vez em quando.",
      "Sirva o frango por cima dos legumes.",
    ],
    dica: "Para ficar ainda mais suculento, não aperte o frango na frigideira enquanto grelha.",
  },
  {
    id: "2",
    titulo: "Omelete de espinafre",
    quando: "Anteontem",
    tempoMin: 15,
    porcoes: 1,
    dificuldade: "Fácil",
    calorias: 340,
    proteina: 24,
    carbo: 6,
    gordura: 25,
    icone: "coffee",
    geladeira: "ovos, espinafre, queijo, tomate",
    ingredientes: [
      "3 ovos",
      "1 punhado de espinafre picado",
      "2 colheres (sopa) de queijo ralado",
      "½ tomate em cubinhos",
      "1 colher (chá) de azeite",
      "Sal e pimenta a gosto",
    ],
    passos: [
      "Bata os ovos com sal e pimenta em uma tigela.",
      "Aqueça o azeite em uma frigideira pequena em fogo médio.",
      "Despeje os ovos e deixe firmar por 1 minuto sem mexer.",
      "Espalhe o espinafre, o tomate e o queijo sobre metade da omelete.",
      "Dobre ao meio, tampe e cozinhe por mais 2 minutos. Sirva em seguida.",
    ],
    dica: "Escorra bem o tomate antes de usar, para a omelete não soltar água.",
  },
  {
    id: "3",
    titulo: "Tapioca com ovo e queijo",
    quando: "3 dias atrás",
    tempoMin: 10,
    porcoes: 1,
    dificuldade: "Fácil",
    calorias: 380,
    proteina: 18,
    carbo: 48,
    gordura: 12,
    icone: "coffee",
    geladeira: "goma de tapioca, ovo, queijo minas",
    ingredientes: ["4 colheres (sopa) de goma de tapioca", "1 ovo", "2 fatias de queijo minas", "Sal a gosto"],
    passos: [
      "Espalhe a goma em uma frigideira antiaderente aquecida, formando um disco.",
      "Quando a goma firmar (cerca de 1 minuto), vire.",
      "Faça um ovo mexido rapidamente e coloque sobre a tapioca, com o queijo.",
      "Dobre ao meio e sirva quente.",
    ],
  },
  {
    id: "4",
    titulo: "Salada de atum com grão-de-bico",
    quando: "4 dias atrás",
    tempoMin: 10,
    porcoes: 2,
    dificuldade: "Fácil",
    calorias: 410,
    proteina: 32,
    carbo: 34,
    gordura: 15,
    icone: "zap",
    geladeira: "atum em lata, grão-de-bico, tomate, pepino",
    ingredientes: [
      "1 lata de atum em água",
      "1 xícara de grão-de-bico cozido",
      "1 tomate em cubos",
      "½ pepino em cubos",
      "Suco de 1 limão",
      "1 colher (sopa) de azeite",
      "Salsinha, sal e pimenta",
    ],
    passos: [
      "Escorra o atum e o grão-de-bico.",
      "Misture todos os ingredientes em uma tigela.",
      "Tempere com limão, azeite, sal, pimenta e salsinha.",
      "Sirva gelada.",
    ],
    dica: "Fica ainda melhor se descansar 15 minutos na geladeira antes de servir.",
  },
  {
    id: "5",
    titulo: "Peixe assado com batata-doce",
    quando: "5 dias atrás",
    tempoMin: 40,
    porcoes: 2,
    dificuldade: "Média",
    calorias: 490,
    proteina: 38,
    carbo: 42,
    gordura: 18,
    icone: "moon",
    geladeira: "filé de peixe, batata-doce, limão",
    ingredientes: [
      "2 filés de peixe branco (cerca de 300 g)",
      "2 batatas-doces médias em rodelas",
      "Suco de 1 limão",
      "2 colheres (sopa) de azeite",
      "Alho, ervas e sal a gosto",
    ],
    passos: [
      "Aqueça o forno a 200 °C.",
      "Distribua a batata-doce em uma assadeira com metade do azeite e leve ao forno por 15 minutos.",
      "Tempere o peixe com limão, alho, ervas e sal.",
      "Coloque o peixe na assadeira e asse por mais 15 a 18 minutos.",
      "Sirva com um fio do azeite restante.",
    ],
  },
  {
    id: "6",
    titulo: "Iogurte com aveia e frutas",
    quando: "6 dias atrás",
    tempoMin: 5,
    porcoes: 1,
    dificuldade: "Fácil",
    calorias: 290,
    proteina: 15,
    carbo: 40,
    gordura: 8,
    icone: "coffee",
    geladeira: "iogurte natural, aveia, banana, morango",
    ingredientes: ["1 pote de iogurte natural", "3 colheres (sopa) de aveia", "1 banana em rodelas", "5 morangos fatiados", "1 fio de mel (opcional)"],
    passos: ["Coloque o iogurte em uma tigela.", "Cubra com a aveia e as frutas.", "Finalize com o mel, se quiser."],
  },
];

export const receitaPorId = (id: string) => RECEITAS.find((r) => r.id === id);
