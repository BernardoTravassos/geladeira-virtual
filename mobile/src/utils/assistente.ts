import { normalizar } from "../data/alimentos";

/**
 * ⚠️ ASSISTENTE DE DEMONSTRAÇÃO: responde por regras de palavras-chave, no
 * aparelho, sem IA de verdade. Serve para ver e ajustar a conversa.
 *
 * Quando houver um endpoint de chat no backend (Anthropic), só esta função
 * muda: `responderAssistente` passa a fazer um POST e o resto do app continua igual.
 */
export type ContextoAssistente = { calorias: number; proteina: number; aguaMl: number };

export const SUGESTOES_ASSISTENTE = [
  "Quanta proteína preciso?",
  "Ideia de lanche rápido",
  "Quanta água beber?",
  "Posso comer à noite?",
  "O que comer antes do treino?",
];

const tem = (t: string, ...palavras: string[]) => palavras.some((p) => t.includes(p));

export async function responderAssistente(pergunta: string, ctx: ContextoAssistente): Promise<string> {
  const t = normalizar(pergunta);
  const litros = (ctx.aguaMl / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  // Assuntos de saúde sérios: não é papel do assistente.
  if (tem(t, "dor ", "doenca", "remedio", "medicamento", "alergia", "gravida", "diabetes", "pressao", "jejum prolongado")) {
    return "Isso depende do seu caso clínico, e aí o melhor é falar direto com a sua nutricionista (aba “Nutricionista”) ou com o seu médico. Eu ajudo com dúvidas gerais do dia a dia.";
  }
  if (tem(t, "proteina")) {
    return `Pela sua meta, são cerca de ${ctx.proteina} g de proteína por dia. Dica: distribua em todas as refeições, com 25 a 40 g em cada. Boas fontes: ovos, frango, peixe, carne magra, iogurte, queijo branco e feijão com arroz.`;
  }
  if (tem(t, "agua", "hidrat", "beber")) {
    return `Sua meta de água é de cerca de ${litros} L por dia. Um truque: tome 1 copo ao acordar e outro antes de cada refeição. O card de hidratação da Home registra cada copo.`;
  }
  if (tem(t, "caloria", "kcal", "meta")) {
    return `Sua meta hoje é de ${ctx.calorias.toLocaleString("pt-BR")} kcal. Acompanhe pelo anel na Home: ele mostra o quanto ainda resta para o dia.`;
  }
  if (tem(t, "treino", "academia", "pre-treino", "pos-treino", "exercicio")) {
    return "Antes do treino (1 a 2 h): carboidrato de fácil digestão com um pouco de proteína, como banana com aveia ou pão com ovo. Depois: proteína e carboidrato, como frango com arroz ou iogurte com fruta e whey.";
  }
  if (tem(t, "lanche", "petisco", "beliscar", "fome")) {
    return "Lanches rápidos e equilibrados: iogurte natural com aveia e fruta; pão integral com queijo branco e peito de peru; 1 fruta com um punhado de castanhas; ovo cozido com tomate. Todos ficam entre 150 e 300 kcal.";
  }
  if (tem(t, "noite", "ceia", "jantar", "madrugada", "dormir")) {
    return "Comer à noite não engorda por si só: o que pesa é o total do dia. À noite, prefira refeições leves e com proteína, como ovos, iogurte, leite com banana ou uma sopa. Evite muita fritura e açúcar perto de dormir.";
  }
  if (tem(t, "cafe da manha", "manha", "acordar")) {
    return "Um bom café da manhã combina proteína, carboidrato e fruta: 2 ovos mexidos, pão integral e 1 fruta, ou iogurte com aveia e banana. Café sem açúcar entra à vontade.";
  }
  if (tem(t, "emagrec", "perder peso", "secar", "barriga")) {
    return "Para perder gordura, o caminho é um déficit calórico moderado, proteína alta, sono em dia e treino de força. Cortes radicais costumam falhar. A sua meta já considera o seu objetivo: siga o anel da Home.";
  }
  if (tem(t, "massa", "ganhar peso", "hipertrofia", "musculo")) {
    return "Para ganhar massa: leve superávit calórico, proteína de 1,6 a 2,2 g por kg, treino de força progressivo e 7 a 9 h de sono. Se a balança não sobe em 2 semanas, aumente cerca de 150 a 200 kcal por dia.";
  }
  if (tem(t, "doce", "chocolate", "sobremesa", "acucar")) {
    return "Pode sim, com moderação. Uma boa regra é reservar uns 10% das calorias do dia para o que você gosta. Registre o doce na refeição para o anel contar certinho.";
  }
  if (tem(t, "oi", "ola", "bom dia", "boa tarde", "boa noite", "tudo bem")) {
    return "Oi! 😊 Posso ajudar com dúvidas rápidas: proteína, água, lanches, treino, horários das refeições… O que você quer saber?";
  }
  if (tem(t, "obrigad", "valeu")) {
    return "Por nada! Qualquer dúvida, é só chamar. 🙂";
  }
  return "Ainda não sei responder isso com segurança. Tente perguntar sobre proteína, água, calorias, lanches, treino ou horários das refeições, ou mande a dúvida na aba “Nutricionista”.";
}
