// Catálogo de alimentos comuns, valores por 100 g. Os que têm fonte "taco" (TACO 4ª ed., NEPA/Unicamp)
// ou "usda" (USDA FoodData Central, SR Legacy) foram conferidos nessas tabelas; os "estimado" são
// pratos de receita variável sem tabela de referência. Marca, receita e preparo mudam os números.
//
// Os `id` são gravados nas refeições já registradas — nunca renomeie um id
// existente; para corrigir um valor, edite só os números.
import taco from "./taco.json";
import tipicos from "./tipicos.json";
import verificado from "./catalogoVerificado.json";
import { registrarInfoDoServidor, substituirMicros } from "./micronutrientes";

export type Categoria =
  | "carboidratos" | "paes" | "proteinas" | "vegetais" | "frutas"
  | "laticinios" | "doces" | "bebidas" | "gorduras" | "pratos";

export type Alimento = {
  id: string;
  nome: string;
  categoria: Categoria;
  porcaoPadrao: number; // gramas sugeridas ao selecionar
  kcal: number; // por 100 g
  proteina: number;
  carbo: number;
  gordura: number;
  /** Ajuda a converter "unidade" em gramas, ex.: "1 pão ≈ 50 g". */
  medida?: string;
  /** De onde vêm os números: tabela oficial ou estimativa (ver catalogoVerificado.json). */
  fonte?: "taco" | "usda" | "estimado";
  /** Criado pela própria pessoa (não vem do catálogo). */
  personalizado?: boolean;
  /** Personalizado que a pessoa removeu da lista (continua valendo nas refeições antigas). */
  oculto?: boolean;
};

export const CATEGORIAS: { chave: Categoria; nome: string }[] = [
  { chave: "carboidratos", nome: "Carboidratos" },
  { chave: "paes", nome: "Pães" },
  { chave: "proteinas", nome: "Proteínas" },
  { chave: "vegetais", nome: "Vegetais" },
  { chave: "frutas", nome: "Frutas" },
  { chave: "laticinios", nome: "Laticínios" },
  { chave: "doces", nome: "Doces" },
  { chave: "bebidas", nome: "Bebidas" },
  { chave: "gorduras", nome: "Gorduras e molhos" },
  { chave: "pratos", nome: "Pratos e lanches" },
];

const a = (
  id: string, nome: string, categoria: Categoria, porcaoPadrao: number,
  kcal: number, proteina: number, carbo: number, gordura: number, medida?: string,
): Alimento => ({ id, nome, categoria, porcaoPadrao, kcal, proteina, carbo, gordura, medida });

export const ALIMENTOS: Alimento[] = [
  // ───────── Carboidratos ─────────
  a("arroz", "Arroz branco", "carboidratos", 120, 130.1, 2.57, 28.19, 0.36, "1 colher de servir ≈ 60 g"),
  a("arroz-int", "Arroz integral", "carboidratos", 120, 123.5, 2.59, 25.81, 1),
  a("feijao", "Feijão", "carboidratos", 100, 76.4, 4.78, 13.59, 0.54, "1 concha ≈ 100 g"),
  a("feijao-preto", "Feijão preto", "carboidratos", 100, 77, 4.48, 14.01, 0.54),
  a("lentilha", "Lentilha", "carboidratos", 100, 92.6, 6.31, 16.3, 0.52),
  a("grao-bico", "Grão-de-bico", "carboidratos", 80, 164, 8.86, 27.42, 2.59),
  a("ervilha", "Ervilha", "carboidratos", 80, 84, 5.36, 15.63, 0.22),
  a("milho", "Milho verde", "carboidratos", 80, 97.6, 3.23, 17.14, 2.35),
  a("macarrao", "Macarrão", "carboidratos", 120, 158, 5.8, 30.86, 0.93),
  a("macarrao-int", "Macarrão integral", "carboidratos", 120, 149, 5.99, 30.07, 1.71),
  a("nhoque", "Nhoque", "carboidratos", 120, 180.8, 5.86, 36.78, 1.94),
  a("tapioca", "Tapioca", "carboidratos", 60, 240, 0.2, 59, 0, "1 tapioca média ≈ 60 g"),
  a("cuscuz", "Cuscuz", "carboidratos", 100, 113.5, 2.16, 25.28, 0.68),
  a("batata-doce", "Batata-doce", "carboidratos", 100, 76.8, 0.64, 18.42, 0.09),
  a("batata", "Batata cozida", "carboidratos", 100, 51.6, 1.16, 11.94, 0),
  a("pure-batata", "Purê de batata", "carboidratos", 100, 113, 1.86, 16.81, 4.22),
  a("batata-frita", "Batata frita", "carboidratos", 100, 267.2, 4.97, 35.64, 13.11),
  a("mandioca", "Mandioca / aipim cozido", "carboidratos", 100, 125.4, 0.57, 30.09, 0.3),
  a("inhame", "Inhame cozido", "carboidratos", 100, 116, 1.49, 27.48, 0.14),
  a("polenta", "Polenta", "carboidratos", 100, 65, 1.23, 13.86, 0.39),
  a("farofa", "Farofa", "carboidratos", 40, 405.7, 2.06, 80.3, 9.12),
  a("quinoa", "Quinoa cozida", "carboidratos", 100, 120, 4.4, 21.3, 1.92),
  a("aveia", "Aveia", "carboidratos", 30, 393.8, 13.92, 66.64, 8.5, "1 colher de sopa ≈ 10 g"),
  a("granola", "Granola", "carboidratos", 40, 489, 13.67, 53.88, 24.31, "1 colher de sopa ≈ 10 g"),
  a("cereal-matinal", "Cereal matinal (flocos de milho)", "carboidratos", 40, 365.4, 7.16, 83.82, 0.96),

  // ───────── Pães e padaria ─────────
  a("pao-frances", "Pão francês", "paes", 50, 299.8, 7.95, 58.65, 3.1, "1 pão ≈ 50 g"),
  a("pao-chapa", "Pão francês na chapa (com manteiga)", "paes", 60, 337, 7.3, 53, 10, "1 pão ≈ 60 g"),
  a("pao-forma", "Pão de forma", "paes", 50, 266, 8.85, 49.42, 3.33, "1 fatia ≈ 25 g"),
  a("pao-integral", "Pão integral de forma", "paes", 50, 253.2, 9.43, 49.94, 3.65, "1 fatia ≈ 25 g"),
  a("pao-queijo", "Pão de queijo", "paes", 40, 363.1, 5.12, 34.24, 24.57, "1 unidade ≈ 25 g"),
  a("pao-hamburguer", "Pão de hambúrguer", "paes", 60, 279, 9.77, 50.12, 3.91),
  a("pao-arabe", "Pão árabe / sírio", "paes", 60, 275, 9.1, 55.7, 1.2),
  a("croissant", "Croissant", "paes", 60, 406, 8.2, 45.8, 21),
  a("torrada", "Torrada", "paes", 30, 377.4, 10.52, 74.56, 3.3, "1 torrada ≈ 8 g"),
  a("tortilha", "Wrap / tortilha", "paes", 50, 306, 8.2, 49.38, 7.99),
  a("biscoito-cream", "Biscoito cream cracker", "paes", 30, 431.7, 10.06, 68.73, 14.44, "1 biscoito ≈ 6 g"),
  a("biscoito-maisena", "Biscoito maisena", "paes", 30, 442.8, 8.07, 75.23, 11.97),
  a("biscoito-recheado", "Biscoito recheado", "paes", 30, 471.8, 6.4, 70.55, 19.58, "1 biscoito ≈ 12 g"),
  a("bolo-simples", "Bolo simples", "paes", 60, 313, 5.4, 51, 9.3, "1 fatia ≈ 60 g"),
  a("bolo-chocolate", "Bolo de chocolate", "paes", 60, 410, 6.22, 54.72, 18.47),
  a("rosquinha", "Rosquinha / donut", "paes", 60, 421, 6.14, 47.93, 22.7),

  // ───────── Proteínas ─────────
  a("frango", "Frango grelhado", "proteinas", 100, 159.2, 32.03, 0, 2.48, "1 filé médio ≈ 120 g"),
  a("frango-desfiado", "Frango cozido desfiado", "proteinas", 80, 162.9, 31.47, 0, 3.16),
  a("coxa-frango", "Coxa / sobrecoxa de frango assada", "proteinas", 120, 215.1, 28.49, 0.06, 10.36),
  a("frango-empanado", "Frango empanado frito", "proteinas", 100, 260, 24.84, 8.99, 13.2),
  a("carne", "Carne bovina", "proteinas", 100, 219, 32, 0, 9),
  a("alcatra", "Alcatra grelhada", "proteinas", 100, 241.4, 31.93, 0, 11.64),
  a("picanha", "Picanha grelhada", "proteinas", 100, 288.8, 26.42, 0, 19.51),
  a("carne-moida", "Carne moída refogada", "proteinas", 100, 212.4, 26.69, 0, 10.92),
  a("costela", "Costela assada", "proteinas", 100, 373, 28.81, 0, 27.72),
  a("figado", "Fígado bovino grelhado", "proteinas", 100, 225, 29.86, 4.2, 9.01),
  a("lombo-suino", "Lombo de porco assado", "proteinas", 100, 210.2, 35.73, 0, 6.4),
  a("bisteca-suina", "Bisteca suína grelhada", "proteinas", 100, 280.1, 28.89, 0, 17.38),
  a("bacon", "Bacon frito", "proteinas", 20, 541, 37.04, 1.43, 41.78, "1 fatia ≈ 8 g"),
  a("linguica", "Linguiça", "proteinas", 80, 296.5, 23.17, 0, 21.9),
  a("salsicha", "Salsicha cozida", "proteinas", 50, 250, 11, 3, 22, "1 salsicha ≈ 50 g"),
  a("presunto", "Presunto", "proteinas", 30, 127.8, 14.37, 1.4, 6.77, "1 fatia ≈ 15 g"),
  a("peito-peru", "Peito de peru (frios)", "proteinas", 30, 106, 14.81, 2.2, 3.77, "1 fatia ≈ 15 g"),
  a("mortadela", "Mortadela", "proteinas", 30, 268.8, 11.95, 5.82, 21.65, "1 fatia ≈ 20 g"),
  a("hamburguer-carne", "Hambúrguer de carne (só o bife)", "proteinas", 90, 270, 25.75, 0, 17.78),
  a("peixe", "Peixe grelhado", "proteinas", 100, 140, 26, 0, 3.5),
  a("tilapia", "Tilápia grelhada", "proteinas", 100, 128, 26.15, 0, 2.65),
  a("salmao", "Salmão grelhado", "proteinas", 100, 242.7, 26.14, 0, 14.53),
  a("sardinha", "Sardinha em lata", "proteinas", 80, 208, 24.62, 0, 11.45),
  a("atum", "Atum em lata", "proteinas", 80, 116, 25.51, 0, 0.82),
  a("camarao", "Camarão cozido", "proteinas", 100, 90, 18.97, 0, 1),
  a("bacalhau", "Bacalhau cozido", "proteinas", 100, 105, 22.83, 0, 0.86),
  a("ovo", "Ovo cozido", "proteinas", 50, 145.7, 13.29, 0.61, 9.48, "1 ovo ≈ 50 g"),
  a("ovo-mexido", "Ovo mexido", "proteinas", 100, 149, 9.99, 1.61, 10.98, "2 ovos ≈ 100 g"),
  a("ovo-frito", "Ovo frito", "proteinas", 50, 240.2, 15.62, 1.19, 18.59, "1 ovo ≈ 50 g"),
  a("omelete", "Omelete simples", "proteinas", 100, 154, 10.57, 0.64, 11.66, "2 ovos ≈ 110 g"),
  a("clara-ovo", "Clara de ovo cozida", "proteinas", 35, 59.4, 13.45, 0, 0.09, "1 clara ≈ 33 g"),
  a("tofu", "Tofu", "proteinas", 100, 64.5, 6.55, 2.13, 3.95),
  a("hamburguer-vegetal", "Hambúrguer vegetal", "proteinas", 90, 200, 16, 10, 10),
  a("whey", "Whey protein (pó)", "proteinas", 30, 400, 80, 8, 6, "1 scoop ≈ 30 g"),

  // ───────── Vegetais ─────────
  a("alface", "Alface", "vegetais", 40, 13.8, 1.69, 2.43, 0.12),
  a("tomate", "Tomate", "vegetais", 80, 20.5, 0.81, 5.12, 0),
  a("cenoura", "Cenoura", "vegetais", 60, 34.1, 1.32, 7.66, 0.17),
  a("brocolis", "Brócolis", "vegetais", 80, 24.6, 2.13, 4.37, 0.46),
  a("abobrinha", "Abobrinha", "vegetais", 80, 19.3, 1.14, 4.29, 0.14),
  a("pepino", "Pepino", "vegetais", 60, 9.5, 0.87, 2.04, 0),
  a("couve", "Couve refogada", "vegetais", 60, 90.3, 1.67, 8.71, 6.59),
  a("espinafre", "Espinafre cozido", "vegetais", 60, 23, 2.97, 3.75, 0.26),
  a("repolho", "Repolho", "vegetais", 60, 17.1, 0.88, 3.86, 0.14),
  a("couve-flor", "Couve-flor cozida", "vegetais", 80, 19.1, 1.24, 3.88, 0.27),
  a("beterraba", "Beterraba cozida", "vegetais", 60, 32.2, 1.29, 7.23, 0.09),
  a("chuchu", "Chuchu cozido", "vegetais", 80, 18.5, 0.41, 4.79, 0),
  a("abobora", "Abóbora cozida", "vegetais", 80, 48, 1.44, 10.76, 0.73),
  a("pimentao", "Pimentão", "vegetais", 50, 21.3, 1.05, 4.89, 0.15),
  a("cebola", "Cebola", "vegetais", 30, 39.4, 1.71, 8.85, 0.08),
  a("berinjela", "Berinjela cozida", "vegetais", 80, 18.8, 0.68, 4.47, 0.15),
  a("vagem", "Vagem cozida", "vegetais", 80, 35, 1.89, 7.88, 0.28),
  a("quiabo", "Quiabo cozido", "vegetais", 80, 22, 1.87, 4.51, 0.21),
  a("palmito", "Palmito", "vegetais", 50, 29.4, 2.46, 5.51, 0.45),
  a("rucula", "Rúcula", "vegetais", 30, 13.1, 1.77, 2.22, 0.11),
  a("agriao", "Agrião", "vegetais", 30, 16.6, 2.69, 2.25, 0.24),
  a("acelga", "Acelga", "vegetais", 60, 20.9, 1.44, 4.63, 0.11),
  a("cogumelo", "Cogumelo", "vegetais", 60, 28, 2.17, 5.29, 0.47),
  a("azeitona", "Azeitona", "vegetais", 20, 136.9, 0.95, 4.1, 14.22, "1 azeitona ≈ 4 g"),

  // ───────── Frutas ─────────
  a("banana", "Banana", "frutas", 100, 98.2, 1.27, 25.96, 0.07, "1 banana média ≈ 100 g (sem casca)"),
  a("maca", "Maçã", "frutas", 130, 55.5, 0.29, 15.15, 0, "1 maçã média ≈ 130 g"),
  a("mamao", "Mamão", "frutas", 150, 40.2, 0.46, 10.44, 0.12),
  a("laranja", "Laranja", "frutas", 130, 46.1, 0.77, 11.72, 0.16),
  a("morango", "Morango", "frutas", 100, 30.1, 0.89, 6.82, 0.31),
  a("abacaxi", "Abacaxi", "frutas", 100, 48.3, 0.86, 12.33, 0.12),
  a("melancia", "Melancia", "frutas", 200, 32.6, 0.88, 8.14, 0),
  a("melao", "Melão", "frutas", 150, 29.4, 0.68, 7.53, 0),
  a("manga", "Manga", "frutas", 130, 63.5, 0.41, 16.66, 0.26),
  a("uva", "Uva", "frutas", 100, 52.9, 0.75, 13.57, 0.2),
  a("pera", "Pera", "frutas", 130, 53.3, 0.57, 14.02, 0.11),
  a("kiwi", "Kiwi", "frutas", 80, 51.1, 1.34, 11.5, 0.63),
  a("goiaba", "Goiaba", "frutas", 120, 54.2, 1.09, 13.01, 0.44),
  a("maracuja", "Maracujá (polpa)", "frutas", 50, 68.4, 1.99, 12.26, 2.1),
  a("tangerina", "Tangerina / mexerica", "frutas", 100, 37.8, 0.85, 9.61, 0.07),
  a("ameixa", "Ameixa", "frutas", 60, 52.5, 0.77, 13.85, 0),
  a("pessego", "Pêssego", "frutas", 100, 36.3, 0.82, 9.32, 0),
  a("caqui", "Caqui", "frutas", 100, 71.4, 0.36, 19.33, 0.07),
  a("abacate", "Abacate", "frutas", 80, 96.2, 1.24, 6.03, 8.4),
  a("framboesa", "Framboesa", "frutas", 80, 52, 1.2, 11.94, 0.65),
  a("mirtilo", "Mirtilo", "frutas", 80, 57, 0.74, 14.49, 0.33),
  a("acai-polpa", "Açaí (polpa pura)", "frutas", 100, 58, 0.8, 6.21, 3.94),
  a("tamara", "Tâmara", "frutas", 30, 277, 1.81, 74.97, 0.15, "1 tâmara ≈ 8 g"),
  a("uva-passa", "Uva-passa", "frutas", 30, 299, 3.3, 79.32, 0.25),

  // ───────── Laticínios ─────────
  a("leite", "Leite", "laticinios", 200, 61, 3.15, 4.8, 3.25, "1 copo ≈ 200 ml"),
  a("leite-desnatado", "Leite desnatado", "laticinios", 200, 35, 3.37, 4.86, 0.18),
  a("leite-soja", "Leite de soja", "laticinios", 200, 54, 3.27, 6.28, 1.75),
  a("leite-amendoa", "Leite de amêndoa", "laticinios", 200, 15, 0.4, 1.31, 0.96),
  a("iogurte", "Iogurte natural", "laticinios", 170, 51.5, 4.06, 1.92, 3.04),
  a("iogurte-grego", "Iogurte grego natural", "laticinios", 170, 97, 9, 3.98, 5),
  a("iogurte-frutas", "Iogurte com frutas", "laticinios", 170, 90, 3, 15, 2),
  a("iogurte-desnatado", "Iogurte desnatado", "laticinios", 170, 41.5, 3.83, 5.77, 0.32),
  a("iogurte-proteico", "Iogurte proteico", "laticinios", 170, 63, 10, 4, 0.5),
  a("kefir", "Kefir", "laticinios", 150, 43, 3.79, 4.77, 1.02),
  a("queijo", "Queijo", "laticinios", 30, 330, 25, 3, 25, "1 fatia ≈ 20 g"),
  a("queijo-minas", "Queijo minas frescal", "laticinios", 40, 264.3, 17.41, 3.24, 20.18),
  a("mussarela", "Queijo mussarela", "laticinios", 30, 329.9, 22.65, 3.05, 25.18, "1 fatia ≈ 15 g"),
  a("queijo-prato", "Queijo prato", "laticinios", 30, 359.9, 22.66, 1.88, 29.11, "1 fatia ≈ 15 g"),
  a("queijo-coalho", "Queijo coalho", "laticinios", 50, 311, 22, 2, 24),
  a("parmesao", "Queijo parmesão ralado", "laticinios", 10, 453, 35.55, 1.66, 33.53, "1 colher de sopa ≈ 7 g"),
  a("cottage", "Queijo cottage", "laticinios", 50, 98, 11.12, 3.38, 4.3),
  a("ricota", "Ricota", "laticinios", 50, 139.7, 12.6, 3.79, 8.11),
  a("requeijao", "Requeijão", "laticinios", 20, 257, 9, 3, 24, "1 colher de sopa ≈ 20 g"),
  a("cream-cheese", "Cream cheese", "laticinios", 20, 350, 6.15, 5.52, 34.44),
  a("creme-leite", "Creme de leite", "laticinios", 30, 221.5, 1.51, 4.51, 22.48),
  a("leite-condensado", "Leite condensado", "laticinios", 20, 312.6, 7.67, 57, 6.74, "1 colher de sopa ≈ 20 g"),
  a("leite-po", "Leite em pó integral", "laticinios", 15, 496.7, 25.42, 39.18, 26.9, "1 colher de sopa ≈ 15 g"),

  // ───────── Doces ─────────
  a("nutella", "Nutella / creme de avelã", "doces", 20, 539, 6.3, 57.5, 30.9, "1 colher de sopa ≈ 15 g"),
  a("chocolate-leite", "Chocolate ao leite", "doces", 25, 539.6, 7.22, 59.58, 30.27, "1 quadradinho ≈ 5 g"),
  a("chocolate-amargo", "Chocolate meio amargo", "doces", 25, 474.9, 4.86, 62.42, 29.86),
  a("chocolate-branco", "Chocolate branco", "doces", 25, 539, 5.87, 59.24, 32.09),
  a("brigadeiro", "Brigadeiro", "doces", 25, 380, 4, 58, 15, "1 brigadeiro ≈ 25 g"),
  a("doce-leite", "Doce de leite", "doces", 20, 306.3, 5.48, 59.49, 5.99),
  a("goiabada", "Goiabada", "doces", 30, 269, 0.58, 74.12, 0),
  a("geleia", "Geleia de frutas", "doces", 20, 278, 0.37, 68.86, 0.07, "1 colher de sopa ≈ 20 g"),
  a("mel", "Mel", "doces", 20, 309.2, 0, 84.03, 0, "1 colher de sopa ≈ 20 g"),
  a("acucar", "Açúcar", "doces", 10, 386.6, 0.32, 99.54, 0, "1 colher de chá ≈ 5 g"),
  a("sorvete", "Sorvete de creme", "doces", 80, 207, 3.5, 23.6, 11, "1 bola ≈ 60 g"),
  a("picole-fruta", "Picolé de frutas", "doces", 70, 90, 0.5, 22, 0.3),
  a("pudim", "Pudim de leite", "doces", 100, 195, 4.5, 30, 6.5),
  a("gelatina", "Gelatina", "doces", 100, 60, 1.5, 14, 0),
  a("pacoca", "Paçoca", "doces", 20, 486.9, 16, 52.38, 26.08, "1 paçoca ≈ 20 g"),
  a("cookie", "Cookie", "doces", 30, 444, 3.63, 65.75, 19.77, "1 cookie ≈ 30 g"),
  a("barra-cereal", "Barra de cereal", "doces", 25, 365, 4.22, 67.61, 8.67, "1 barra ≈ 25 g"),
  a("barra-proteina", "Barra de proteína", "doces", 45, 380, 30, 35, 13, "1 barra ≈ 45 g"),
  a("achocolatado-po", "Achocolatado em pó", "doces", 20, 401, 4.2, 91.18, 2.17, "1 colher de sopa ≈ 10 g"),
  a("acai-tigela", "Açaí na tigela (com granola e banana)", "doces", 300, 160, 2.4, 25, 6),

  // ───────── Bebidas ─────────
  a("cafe-preto", "Café preto (sem açúcar)", "bebidas", 50, 9.1, 0.71, 1.48, 0.07, "1 xícara pequena ≈ 50 ml"),
  a("cafe-acucar", "Café com açúcar", "bebidas", 100, 20, 0, 5, 0),
  a("cafe-leite", "Café com leite (sem açúcar)", "bebidas", 150, 32, 1.7, 2.5, 1.7),
  a("cha", "Chá (sem açúcar)", "bebidas", 200, 2.2, 0, 0.63, 0),
  a("suco-laranja", "Suco de laranja natural", "bebidas", 200, 36.2, 0.48, 8.55, 0.12, "1 copo ≈ 200 ml"),
  a("suco-uva", "Suco de uva integral", "bebidas", 200, 60, 0.37, 14.77, 0.13),
  a("suco-caixinha", "Suco industrializado", "bebidas", 200, 45, 0.2, 11, 0),
  a("refri", "Refrigerante", "bebidas", 300, 33.5, 0, 8.66, 0, "1 lata ≈ 350 ml"),
  a("refri-zero", "Refrigerante zero", "bebidas", 300, 0.5, 0, 0, 0),
  a("agua-coco", "Água de coco", "bebidas", 200, 21.5, 0, 5.28, 0),
  a("vitamina-banana", "Vitamina de banana com leite", "bebidas", 250, 85, 3, 14, 2),
  a("achocolatado", "Achocolatado (leite com chocolate)", "bebidas", 200, 82.8, 2.1, 14.16, 2.17),
  a("isotonico", "Isotônico", "bebidas", 300, 26, 0, 6.4, 0),
  a("energetico", "Energético", "bebidas", 250, 43, 0.46, 10.23, 0, "1 lata ≈ 250 ml"),
  a("cerveja", "Cerveja", "bebidas", 350, 40.7, 0.56, 3.32, 0, "1 lata ≈ 350 ml"),
  a("vinho", "Vinho tinto", "bebidas", 150, 85, 0.07, 2.61, 0, "1 taça ≈ 150 ml"),

  // ───────── Gorduras e molhos ─────────
  a("azeite", "Azeite", "gorduras", 10, 884, 0, 0, 100, "1 colher de sopa ≈ 10 g"),
  a("oleo", "Óleo de soja", "gorduras", 10, 884, 0, 0, 100),
  a("manteiga", "Manteiga", "gorduras", 10, 726, 0.41, 0.06, 82.36, "1 colher de sopa ≈ 10 g"),
  a("margarina", "Margarina", "gorduras", 10, 596.1, 0, 0, 67.43),
  a("maionese", "Maionese", "gorduras", 15, 302.2, 0.58, 7.9, 30.5, "1 colher de sopa ≈ 15 g"),
  a("ketchup", "Ketchup", "gorduras", 15, 101, 1.04, 27.4, 0.1),
  a("mostarda", "Mostarda", "gorduras", 10, 60, 3.74, 5.83, 3.34),
  a("molho-tomate", "Molho de tomate", "gorduras", 60, 38.4, 1.38, 7.71, 0.9),
  a("shoyu", "Molho shoyu", "gorduras", 10, 53, 8.14, 4.93, 0.57),
  a("castanhas", "Castanhas", "gorduras", 30, 600, 18, 12, 54),
  a("castanha-caju", "Castanha de caju", "gorduras", 30, 570.2, 18.51, 29.13, 46.28),
  a("castanha-para", "Castanha-do-pará", "gorduras", 20, 643, 14.54, 15.08, 63.46, "1 castanha ≈ 4 g"),
  a("amendoas", "Amêndoas", "gorduras", 30, 579, 21.15, 21.55, 49.93),
  a("nozes", "Nozes", "gorduras", 30, 620.1, 13.97, 18.36, 59.36),
  a("amendoim", "Amendoim torrado", "gorduras", 30, 605.8, 22.48, 18.7, 53.96),
  a("pasta-amendoim", "Pasta de amendoim", "gorduras", 15, 588, 21.93, 23.98, 49.54, "1 colher de sopa ≈ 15 g"),
  a("chia", "Chia", "gorduras", 10, 486, 16.54, 42.12, 30.74, "1 colher de sopa ≈ 12 g"),
  a("linhaca", "Linhaça", "gorduras", 10, 495.1, 14.08, 43.31, 32.25),

  // ───────── Pratos e lanches ─────────
  a("pizza", "Pizza (muçarela)", "pratos", 110, 268, 10.36, 29.02, 12.28, "1 fatia ≈ 110 g"),
  a("hamburguer-sanduiche", "Hambúrguer (sanduíche)", "pratos", 200, 297, 16.52, 31.5, 12.01),
  a("cachorro-quente", "Cachorro-quente", "pratos", 140, 290, 10, 24, 17),
  a("misto-quente", "Misto quente", "pratos", 100, 300, 15, 28, 14),
  a("sanduiche-natural", "Sanduíche natural", "pratos", 130, 190, 11, 22, 6),
  a("wrap-frango", "Wrap de frango", "pratos", 180, 215, 12, 25, 7),
  a("coxinha", "Coxinha", "pratos", 90, 283, 9.61, 34.52, 11.84, "1 coxinha ≈ 90 g"),
  a("pastel", "Pastel frito", "pratos", 100, 388.4, 10.1, 43.77, 20.14, "1 pastel ≈ 100 g"),
  a("esfiha", "Esfiha de carne", "pratos", 90, 260, 10, 33, 10),
  a("empada", "Empada", "pratos", 70, 358.2, 6.94, 47.49, 15.61),
  a("kibe", "Kibe frito", "pratos", 70, 253.8, 14.89, 12.34, 15.8),
  a("nuggets", "Nuggets de frango", "pratos", 100, 261, 14.36, 16.24, 15.42, "1 nugget ≈ 20 g"),
  a("salgadinho", "Salgadinho de pacote", "pratos", 30, 536, 6, 53, 34),
  a("pipoca", "Pipoca", "pratos", 30, 460, 8, 55, 23),
  a("crepioca", "Crepioca", "pratos", 100, 190, 11, 16, 9),
  a("strogonoff", "Strogonoff de frango", "pratos", 150, 156.8, 17.55, 2.59, 7.96),
  a("feijoada", "Feijoada", "pratos", 200, 116.9, 8.67, 11.64, 6.48),
  a("lasanha", "Lasanha à bolonhesa", "pratos", 200, 185, 10.83, 11.36, 10.69),
  a("risoto", "Risoto de frango", "pratos", 200, 150, 6, 21, 4.5),
  a("moqueca", "Moqueca de peixe", "pratos", 200, 130, 13, 4, 7),
  a("baiao", "Baião de dois", "pratos", 150, 135.7, 6.24, 20.42, 3.23),
  a("yakisoba", "Yakisoba", "pratos", 250, 150, 6, 20, 5),
  a("sushi", "Sushi / niguiri", "pratos", 100, 145, 6, 28, 1, "1 peça ≈ 30 g"),
  a("sopa-legumes", "Sopa de legumes", "pratos", 300, 45, 1.8, 7, 1.2),
  a("salada-frutas", "Salada de frutas", "pratos", 150, 60, 0.8, 15, 0.2),
];

// Tabela Brasileira de Composição de Alimentos (TACO, 4ª ed., NEPA/Unicamp): ~590 alimentos
// brasileiros com vitaminas e minerais, por 100 g. Mesma base que o servidor carrega no banco
// (backend-dotnet/Dados/Sementes/importar_taco.py). Fica aqui para a busca funcionar sem internet.
for (const t of taco as any[]) {
  ALIMENTOS.push({ id: t.id, nome: t.nome, categoria: t.categoria, porcaoPadrao: 100, kcal: t.kcal, proteina: t.proteina, carbo: t.carbo, gordura: t.gordura });
  registrarInfoDoServidor(t.id, null, t.micros);
}

// Pratos típicos do Brasil e conhecidos no mundo todo (acrescentados à mão, valores aproximados por
// 100 g). Mesma lista que o servidor carrega: backend-dotnet/Dados/Sementes/tipicos.json.
for (const t of tipicos as any[]) {
  ALIMENTOS.push({ id: t.id, nome: t.nome, categoria: t.categoria, porcaoPadrao: t.porcaoPadrao, kcal: t.kcal, proteina: t.proteina, carbo: t.carbo, gordura: t.gordura, medida: t.medida ?? undefined });
}

// Fonte e vitaminas/minerais conferidos (mesma base que o servidor: backend-dotnet/Dados/Sementes).
// Substitui os micronutrientes antigos, que eram de memória.
for (const [id, v] of Object.entries(verificado as Record<string, { fonte: Alimento["fonte"]; micros: Record<string, number> }>)) {
  const alvo = ALIMENTOS.find((x) => x.id === id);
  if (alvo) alvo.fonte = v.fonte;
  if (v.fonte !== "estimado") substituirMicros(id, v.micros);
}

/**
 * Aplica o catálogo vindo do servidor sobre o que já está no app: atualiza os
 * valores dos ids que existem e acrescenta os novos. Mexe na MESMA lista, então
 * quem já importou ALIMENTOS enxerga a mudança. O que o servidor não conhece
 * (o catálogo embutido) continua valendo, inclusive sem internet.
 */
export function aplicarCatalogo(lista: Alimento[]) {
  for (const novo of lista) {
    const i = ALIMENTOS.findIndex((x) => x.id === novo.id);
    if (i >= 0) ALIMENTOS[i] = { ...ALIMENTOS[i], ...novo };
    else ALIMENTOS.push(novo);
  }
}

/** Minúsculas e sem acento, para a busca achar "pao" em "Pão". */
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ") // "Pão, de queijo" → "pao de queijo"
    .trim();

/** Palavras da busca sem o "s" final, para "ovos" achar "ovo". */
export const palavrasDaBusca = (busca: string) =>
  normalizar(busca)
    .split(" ")
    .filter(Boolean)
    .map((p) => (p.length > 3 && p.endsWith("s") ? p.slice(0, -1) : p));

export const alimentoPorId = (id: string) => ALIMENTOS.find((x) => x.id === id);

/**
 * O alimento de um item do prato. Os personalizados vão DENTRO do registro da
 * refeição (`personalizado`), para que a refeição continue valendo mesmo se a
 * lista pessoal mudar — e para que ela chegue inteira em outro aparelho.
 */
export const alimentoDoItem = (it: { alimentoId: string; personalizado?: Alimento }) =>
  alimentoPorId(it.alimentoId) ?? it.personalizado;

export const nutrientes = (al: Alimento, gramas: number) => {
  const f = gramas / 100;
  return {
    kcal: Math.round(al.kcal * f),
    proteina: +(al.proteina * f).toFixed(1),
    carbo: +(al.carbo * f).toFixed(1),
    gordura: +(al.gordura * f).toFixed(1),
  };
};
