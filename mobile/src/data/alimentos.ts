// Catálogo de alimentos comuns. Valores APROXIMADOS por 100 g (base: tabelas
// brasileiras como a TACO, arredondados). Servem de estimativa, não de laudo.
export type Categoria = "carboidratos" | "proteinas" | "vegetais" | "frutas" | "laticinios" | "outros";

export type Alimento = {
  id: string;
  nome: string;
  categoria: Categoria;
  porcaoPadrao: number; // gramas sugeridas ao selecionar
  kcal: number; // por 100 g
  proteina: number;
  carbo: number;
  gordura: number;
};

export const CATEGORIAS: { chave: Categoria; nome: string }[] = [
  { chave: "carboidratos", nome: "Carboidratos" },
  { chave: "proteinas", nome: "Proteínas" },
  { chave: "vegetais", nome: "Vegetais" },
  { chave: "frutas", nome: "Frutas" },
  { chave: "laticinios", nome: "Laticínios" },
  { chave: "outros", nome: "Outros" },
];

const a = (
  id: string, nome: string, categoria: Categoria, porcaoPadrao: number,
  kcal: number, proteina: number, carbo: number, gordura: number,
): Alimento => ({ id, nome, categoria, porcaoPadrao, kcal, proteina, carbo, gordura });

export const ALIMENTOS: Alimento[] = [
  a("arroz", "Arroz branco", "carboidratos", 120, 128, 2.5, 28, 0.2),
  a("arroz-int", "Arroz integral", "carboidratos", 120, 124, 2.6, 26, 1),
  a("feijao", "Feijão", "carboidratos", 100, 76, 4.8, 14, 0.5),
  a("macarrao", "Macarrão", "carboidratos", 120, 150, 5, 31, 1),
  a("pao-frances", "Pão francês", "carboidratos", 50, 300, 8, 58, 3),
  a("pao-forma", "Pão de forma", "carboidratos", 50, 253, 8, 49, 3),
  a("tapioca", "Tapioca", "carboidratos", 60, 240, 0.2, 59, 0),
  a("batata-doce", "Batata-doce", "carboidratos", 100, 77, 0.6, 18, 0.1),
  a("batata", "Batata cozida", "carboidratos", 100, 52, 1.2, 12, 0),
  a("aveia", "Aveia", "carboidratos", 30, 394, 14, 67, 8.5),
  a("cuscuz", "Cuscuz", "carboidratos", 100, 113, 2.2, 25, 0.7),
  a("frango", "Frango grelhado", "proteinas", 100, 159, 32, 0, 2.5),
  a("carne", "Carne bovina", "proteinas", 100, 219, 32, 0, 9),
  a("peixe", "Peixe grelhado", "proteinas", 100, 140, 26, 0, 3.5),
  a("ovo", "Ovo cozido", "proteinas", 50, 146, 13, 0.6, 9.5),
  a("atum", "Atum em lata", "proteinas", 80, 116, 26, 0, 1),
  a("linguica", "Linguiça", "proteinas", 80, 296, 15, 1, 26),
  a("alface", "Alface", "vegetais", 40, 15, 1.4, 3, 0.2),
  a("tomate", "Tomate", "vegetais", 80, 18, 0.9, 3.9, 0.2),
  a("cenoura", "Cenoura", "vegetais", 60, 34, 1.3, 7.7, 0.2),
  a("brocolis", "Brócolis", "vegetais", 80, 25, 2.1, 4.4, 0.5),
  a("abobrinha", "Abobrinha", "vegetais", 80, 19, 1.1, 4.3, 0.1),
  a("banana", "Banana", "frutas", 100, 89, 1.3, 23, 0.1),
  a("maca", "Maçã", "frutas", 130, 56, 0.3, 15, 0),
  a("mamao", "Mamão", "frutas", 150, 40, 0.5, 10, 0.1),
  a("laranja", "Laranja", "frutas", 130, 46, 1, 11, 0.1),
  a("morango", "Morango", "frutas", 100, 30, 0.9, 7, 0.3),
  a("leite", "Leite", "laticinios", 200, 61, 3.2, 4.7, 3.3),
  a("iogurte", "Iogurte natural", "laticinios", 170, 51, 4.1, 2.3, 3),
  a("queijo", "Queijo", "laticinios", 30, 330, 25, 3, 25),
  a("requeijao", "Requeijão", "laticinios", 20, 257, 9, 3, 24),
  a("cafe-acucar", "Café com açúcar", "outros", 100, 20, 0, 5, 0),
  a("azeite", "Azeite", "outros", 10, 884, 0, 0, 100),
  a("manteiga", "Manteiga", "outros", 10, 717, 0.5, 0, 81),
  a("castanhas", "Castanhas", "outros", 30, 600, 18, 12, 54),
];

export const alimentoPorId = (id: string) => ALIMENTOS.find((x) => x.id === id);

export const nutrientes = (al: Alimento, gramas: number) => {
  const f = gramas / 100;
  return {
    kcal: Math.round(al.kcal * f),
    proteina: +(al.proteina * f).toFixed(1),
    carbo: +(al.carbo * f).toFixed(1),
    gordura: +(al.gordura * f).toFixed(1),
  };
};
