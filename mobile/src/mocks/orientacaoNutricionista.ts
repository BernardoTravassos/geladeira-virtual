/**
 * ⚠️ DADOS DE DEMONSTRAÇÃO — nada aqui vem do backend.
 *
 * Representa a orientação que o nutricionista deixa para o paciente. Quando o
 * vínculo nutricionista↔paciente existir, o card da Home troca este arquivo por
 * uma chamada de API. Apagar este arquivo é o único trabalho de limpeza.
 */

/**
 * A pessoa tem nutricionista vinculada? Enquanto o vínculo real não existe, é uma chave fixa:
 * true mostra o plano e o card da nutricionista; false deixa o app como quem acompanha sozinho.
 */
export const TEM_NUTRICIONISTA = true;

export type OrientacaoRefeicao = {
  chave: string;
  nome: string;
  horario: string;
  sugestao: string;
  /** Alimentos do catálogo (data/alimentos.ts) com a quantidade em gramas. */
  itens: { alimentoId: string; gramas: number; medida?: string }[];
  dica: string;
  trocas: string[];
};

export type OrientacaoNutricionista = {
  nutricionista: { nome: string; crn: string; iniciais: string };
  atualizadoEm: string;
  recado: string;
  metas: { calorias: number; proteina: number; carboidrato: number; gordura: number; aguaMl: number };
  refeicoes: OrientacaoRefeicao[];
  fazer: string[];
  evitar: string[];
  suplementos: { nome: string; dose: string; quando: string }[];
  semana: { titulo: string; feito: number; total: number }[];
  proximaConsulta: { data: string; hora: string; local: string };
};

export const ORIENTACAO_NUTRICIONISTA: OrientacaoNutricionista = {
  nutricionista: { nome: "Dra. Carla Menezes", crn: "CRN-3 12345", iniciais: "CM" },
  atualizadoEm: "há 3 dias",
  recado:
    "Bernardo, seu último mês foi muito bom! A adesão subiu para 86%. Agora o foco é a proteína no café da manhã e manter a água em dia. Qualquer dúvida, me chame na consulta.",
  metas: { calorias: 2650, proteina: 160, carboidrato: 330, gordura: 75, aguaMl: 3000 },
  refeicoes: [
    {
      chave: "cafe", nome: "Café da manhã", horario: "07:30",
      sugestao: "2 ovos mexidos, 2 fatias de pão integral, 1 fruta e café sem açúcar",
      itens: [
        { alimentoId: "ovo-mexido", gramas: 100, medida: "2 ovos" },
        { alimentoId: "pao-integral", gramas: 50, medida: "2 fatias" },
        { alimentoId: "mamao", gramas: 150, medida: "1 fatia grande" },
        { alimentoId: "cafe-preto", gramas: 100, medida: "2 xícaras pequenas" },
      ],
      dica: "A proteína logo cedo segura a fome até o lanche. Se treinar de manhã, coma 1 h antes.",
      trocas: ["Ovo → 2 fatias de queijo minas + peito de peru", "Mamão → 1 banana ou 1 maçã", "Pão integral → 3 col. de sopa de aveia ou 1 tapioca"],
    },
    {
      chave: "lanche-manha", nome: "Lanche da manhã", horario: "10:00",
      sugestao: "Iogurte natural com aveia, banana e 1 colher de pasta de amendoim",
      itens: [
        { alimentoId: "iogurte", gramas: 170, medida: "1 pote" },
        { alimentoId: "aveia", gramas: 30, medida: "3 col. de sopa" },
        { alimentoId: "banana", gramas: 100, medida: "1 média" },
        { alimentoId: "pasta-amendoim", gramas: 15, medida: "1 col. de sopa" },
      ],
      dica: "Prefira o iogurte natural, sem açúcar. A pasta de amendoim deve ter só amendoim (sem açúcar).",
      trocas: ["Iogurte → 1 copo de leite", "Pasta de amendoim → 1 punhado de castanhas", "Banana → 1 maçã"],
    },
    {
      chave: "almoco", nome: "Almoço", horario: "12:30",
      sugestao: "150 g de frango, arroz, feijão e salada à vontade com azeite",
      itens: [
        { alimentoId: "frango", gramas: 150, medida: "1 filé grande" },
        { alimentoId: "arroz", gramas: 200, medida: "3 col. de servir" },
        { alimentoId: "feijao", gramas: 100, medida: "1 concha" },
        { alimentoId: "alface", gramas: 40, medida: "1 prato de sobremesa" },
        { alimentoId: "tomate", gramas: 80, medida: "1 médio" },
        { alimentoId: "cenoura", gramas: 60, medida: "1/2 média" },
        { alimentoId: "azeite", gramas: 10, medida: "1 col. de sopa" },
      ],
      dica: "Monte o prato começando pela salada. Metade de legumes e verduras, um quarto de proteína e um quarto de carboidrato.",
      trocas: ["Frango → peixe grelhado ou carne magra", "Arroz → batata-doce ou macarrão integral", "Feijão → lentilha ou grão-de-bico"],
    },
    {
      chave: "lanche-tarde", nome: "Lanche da tarde", horario: "16:00",
      sugestao: "Sanduíche de frango desfiado com queijo branco e 1 fruta",
      itens: [
        { alimentoId: "pao-forma", gramas: 50, medida: "2 fatias" },
        { alimentoId: "frango-desfiado", gramas: 80, medida: "4 col. de sopa" },
        { alimentoId: "queijo-minas", gramas: 40, medida: "2 fatias" },
        { alimentoId: "maca", gramas: 130, medida: "1 média" },
      ],
      dica: "É o lanche que antecede o treino ou o jantar: não pule, para não chegar com fome demais à noite.",
      trocas: ["Frango → atum ou ovo cozido", "Pão de forma → tapioca", "Maçã → 1 pera ou 10 morangos"],
    },
    {
      chave: "jantar", nome: "Jantar", horario: "19:30",
      sugestao: "150 g de carne, batata-doce e brócolis com azeite",
      itens: [
        { alimentoId: "alcatra", gramas: 150, medida: "1 bife médio" },
        { alimentoId: "batata-doce", gramas: 150, medida: "1 média" },
        { alimentoId: "brocolis", gramas: 120, medida: "1 xícara" },
        { alimentoId: "azeite", gramas: 10, medida: "1 col. de sopa" },
      ],
      dica: "Termine o jantar pelo menos 2 h antes de dormir. Mastigue devagar.",
      trocas: ["Alcatra → filé de tilápia ou salmão", "Batata-doce → mandioca ou inhame", "Brócolis → couve-flor ou abobrinha"],
    },
    {
      chave: "ceia", nome: "Ceia", horario: "21:30",
      sugestao: "1 copo de leite com 1 banana",
      itens: [
        { alimentoId: "leite", gramas: 200, medida: "1 copo" },
        { alimentoId: "banana", gramas: 100, medida: "1 média" },
      ],
      dica: "Leve e com proteína, ajuda a manter a massa durante o sono. Sem telas na hora de comer.",
      trocas: ["Leite → iogurte natural", "Banana → 1 fatia de mamão"],
    },
  ],
  fazer: [
    "Incluir uma fonte de proteína em todas as refeições",
    "Beber 1 copo de água ao acordar e antes de cada refeição",
    "Mastigar devagar e comer sem a tela ligada",
    "Preparar as marmitas no domingo para a semana",
    "Dormir pelo menos 7 horas por noite",
  ],
  evitar: [
    "Pular o café da manhã",
    "Refrigerante e sucos de caixinha",
    "Frituras mais de 1 vez por semana",
    "Ficar mais de 4 horas sem comer",
  ],
  suplementos: [
    { nome: "Whey protein", dose: "1 scoop (30 g)", quando: "Pós-treino" },
    { nome: "Creatina", dose: "3 g", quando: "Todos os dias, qualquer horário" },
    { nome: "Vitamina D", dose: "2.000 UI", quando: "Almoço" },
  ],
  semana: [
    { titulo: "Dias dentro da meta de calorias", feito: 5, total: 7 },
    { titulo: "Dias com a meta de proteína", feito: 4, total: 7 },
    { titulo: "Dias com a meta de água", feito: 6, total: 7 },
    { titulo: "Treinos realizados", feito: 3, total: 4 },
  ],
  proximaConsulta: { data: "28/11/2026", hora: "15:00", local: "Consultório · Salvador" },
};
