// Catálogo de alimentos comuns. Valores APROXIMADOS por 100 g (base: tabelas
// brasileiras como a TACO e o USDA, arredondados). Servem de estimativa, não de
// laudo: marca, receita e modo de preparo mudam os números.
//
// Os `id` são gravados nas refeições já registradas — nunca renomeie um id
// existente; para corrigir um valor, edite só os números.
import taco from "./taco.json";
import { registrarInfoDoServidor } from "./micronutrientes";

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
  a("arroz", "Arroz branco", "carboidratos", 120, 128, 2.5, 28, 0.2, "1 colher de servir ≈ 60 g"),
  a("arroz-int", "Arroz integral", "carboidratos", 120, 124, 2.6, 26, 1),
  a("feijao", "Feijão", "carboidratos", 100, 76, 4.8, 14, 0.5, "1 concha ≈ 100 g"),
  a("feijao-preto", "Feijão preto", "carboidratos", 100, 77, 4.5, 14, 0.5),
  a("lentilha", "Lentilha", "carboidratos", 100, 93, 6.3, 16, 0.5),
  a("grao-bico", "Grão-de-bico", "carboidratos", 80, 164, 8.9, 27, 2.6),
  a("ervilha", "Ervilha", "carboidratos", 80, 84, 5.4, 14, 0.4),
  a("milho", "Milho verde", "carboidratos", 80, 98, 3.2, 21, 1.5),
  a("macarrao", "Macarrão", "carboidratos", 120, 150, 5, 31, 1),
  a("macarrao-int", "Macarrão integral", "carboidratos", 120, 124, 5, 26, 1),
  a("nhoque", "Nhoque", "carboidratos", 120, 130, 3.5, 28, 0.9),
  a("tapioca", "Tapioca", "carboidratos", 60, 240, 0.2, 59, 0, "1 tapioca média ≈ 60 g"),
  a("cuscuz", "Cuscuz", "carboidratos", 100, 113, 2.2, 25, 0.7),
  a("batata-doce", "Batata-doce", "carboidratos", 100, 77, 0.6, 18, 0.1),
  a("batata", "Batata cozida", "carboidratos", 100, 52, 1.2, 12, 0),
  a("pure-batata", "Purê de batata", "carboidratos", 100, 83, 1.8, 14, 2.3),
  a("batata-frita", "Batata frita", "carboidratos", 100, 312, 3.4, 41, 15),
  a("mandioca", "Mandioca / aipim cozido", "carboidratos", 100, 125, 0.6, 30, 0.3),
  a("inhame", "Inhame cozido", "carboidratos", 100, 97, 2.3, 23, 0.2),
  a("polenta", "Polenta", "carboidratos", 100, 70, 1.6, 15, 0.5),
  a("farofa", "Farofa", "carboidratos", 40, 406, 2, 58, 17),
  a("quinoa", "Quinoa cozida", "carboidratos", 100, 120, 4.4, 21, 1.9),
  a("aveia", "Aveia", "carboidratos", 30, 394, 14, 67, 8.5, "1 colher de sopa ≈ 10 g"),
  a("granola", "Granola", "carboidratos", 40, 471, 10, 64, 20, "1 colher de sopa ≈ 10 g"),
  a("cereal-matinal", "Cereal matinal (flocos de milho)", "carboidratos", 40, 375, 7, 84, 0.9),

  // ───────── Pães e padaria ─────────
  a("pao-frances", "Pão francês", "paes", 50, 300, 8, 58, 3, "1 pão ≈ 50 g"),
  a("pao-chapa", "Pão francês na chapa (com manteiga)", "paes", 60, 337, 7.3, 53, 10, "1 pão ≈ 60 g"),
  a("pao-forma", "Pão de forma", "paes", 50, 253, 8, 49, 3, "1 fatia ≈ 25 g"),
  a("pao-integral", "Pão integral de forma", "paes", 50, 250, 9.4, 49, 3.5, "1 fatia ≈ 25 g"),
  a("pao-queijo", "Pão de queijo", "paes", 40, 363, 5.5, 41, 20, "1 unidade ≈ 25 g"),
  a("pao-hamburguer", "Pão de hambúrguer", "paes", 60, 270, 9, 49, 4),
  a("pao-arabe", "Pão árabe / sírio", "paes", 60, 275, 9, 56, 1.2),
  a("croissant", "Croissant", "paes", 60, 406, 8, 45, 21),
  a("torrada", "Torrada", "paes", 30, 377, 11, 71, 4, "1 torrada ≈ 8 g"),
  a("tortilha", "Wrap / tortilha", "paes", 50, 300, 8, 50, 7),
  a("biscoito-cream", "Biscoito cream cracker", "paes", 30, 432, 10, 69, 12, "1 biscoito ≈ 6 g"),
  a("biscoito-maisena", "Biscoito maisena", "paes", 30, 443, 8, 75, 12),
  a("biscoito-recheado", "Biscoito recheado", "paes", 30, 480, 6, 70, 20, "1 biscoito ≈ 12 g"),
  a("bolo-simples", "Bolo simples", "paes", 60, 313, 5.4, 51, 9.3, "1 fatia ≈ 60 g"),
  a("bolo-chocolate", "Bolo de chocolate", "paes", 60, 370, 5, 54, 15),
  a("rosquinha", "Rosquinha / donut", "paes", 60, 420, 5, 50, 22),

  // ───────── Proteínas ─────────
  a("frango", "Frango grelhado", "proteinas", 100, 159, 32, 0, 2.5, "1 filé médio ≈ 120 g"),
  a("frango-desfiado", "Frango cozido desfiado", "proteinas", 80, 163, 31, 0, 3.5),
  a("coxa-frango", "Coxa / sobrecoxa de frango assada", "proteinas", 120, 215, 26, 0, 12),
  a("frango-empanado", "Frango empanado frito", "proteinas", 100, 290, 22, 12, 17),
  a("carne", "Carne bovina", "proteinas", 100, 219, 32, 0, 9),
  a("alcatra", "Alcatra grelhada", "proteinas", 100, 241, 31, 0, 12),
  a("picanha", "Picanha grelhada", "proteinas", 100, 290, 28, 0, 20),
  a("carne-moida", "Carne moída refogada", "proteinas", 100, 212, 26, 0, 11),
  a("costela", "Costela assada", "proteinas", 100, 330, 24, 0, 26),
  a("figado", "Fígado bovino grelhado", "proteinas", 100, 175, 27, 4, 5),
  a("lombo-suino", "Lombo de porco assado", "proteinas", 100, 210, 28, 0, 10),
  a("bisteca-suina", "Bisteca suína grelhada", "proteinas", 100, 270, 26, 0, 18),
  a("bacon", "Bacon frito", "proteinas", 20, 540, 37, 1.5, 42, "1 fatia ≈ 8 g"),
  a("linguica", "Linguiça", "proteinas", 80, 296, 15, 1, 26),
  a("salsicha", "Salsicha cozida", "proteinas", 50, 250, 11, 3, 22, "1 salsicha ≈ 50 g"),
  a("presunto", "Presunto", "proteinas", 30, 145, 18, 1.5, 7, "1 fatia ≈ 15 g"),
  a("peito-peru", "Peito de peru (frios)", "proteinas", 30, 104, 17, 2, 2.5, "1 fatia ≈ 15 g"),
  a("mortadela", "Mortadela", "proteinas", 30, 270, 12, 3, 23, "1 fatia ≈ 20 g"),
  a("hamburguer-carne", "Hambúrguer de carne (só o bife)", "proteinas", 90, 260, 25, 0, 18),
  a("peixe", "Peixe grelhado", "proteinas", 100, 140, 26, 0, 3.5),
  a("tilapia", "Tilápia grelhada", "proteinas", 100, 128, 26, 0, 2.7),
  a("salmao", "Salmão grelhado", "proteinas", 100, 208, 22, 0, 13),
  a("sardinha", "Sardinha em lata", "proteinas", 80, 208, 25, 0, 11),
  a("atum", "Atum em lata", "proteinas", 80, 116, 26, 0, 1),
  a("camarao", "Camarão cozido", "proteinas", 100, 99, 24, 0.2, 0.3),
  a("bacalhau", "Bacalhau cozido", "proteinas", 100, 105, 23, 0, 0.9),
  a("ovo", "Ovo cozido", "proteinas", 50, 146, 13, 0.6, 9.5, "1 ovo ≈ 50 g"),
  a("ovo-mexido", "Ovo mexido", "proteinas", 100, 165, 11, 2, 12, "2 ovos ≈ 100 g"),
  a("ovo-frito", "Ovo frito", "proteinas", 50, 196, 14, 0.8, 15, "1 ovo ≈ 50 g"),
  a("omelete", "Omelete simples", "proteinas", 100, 170, 11, 1, 13, "2 ovos ≈ 110 g"),
  a("clara-ovo", "Clara de ovo cozida", "proteinas", 35, 52, 11, 0.7, 0.2, "1 clara ≈ 33 g"),
  a("tofu", "Tofu", "proteinas", 100, 76, 8, 1.9, 4.8),
  a("hamburguer-vegetal", "Hambúrguer vegetal", "proteinas", 90, 200, 16, 10, 10),
  a("whey", "Whey protein (pó)", "proteinas", 30, 400, 80, 8, 6, "1 scoop ≈ 30 g"),

  // ───────── Vegetais ─────────
  a("alface", "Alface", "vegetais", 40, 15, 1.4, 3, 0.2),
  a("tomate", "Tomate", "vegetais", 80, 18, 0.9, 3.9, 0.2),
  a("cenoura", "Cenoura", "vegetais", 60, 34, 1.3, 7.7, 0.2),
  a("brocolis", "Brócolis", "vegetais", 80, 25, 2.1, 4.4, 0.5),
  a("abobrinha", "Abobrinha", "vegetais", 80, 19, 1.1, 4.3, 0.1),
  a("pepino", "Pepino", "vegetais", 60, 15, 0.7, 3.6, 0.1),
  a("couve", "Couve refogada", "vegetais", 60, 90, 3, 8, 6),
  a("espinafre", "Espinafre cozido", "vegetais", 60, 23, 3, 3.6, 0.3),
  a("repolho", "Repolho", "vegetais", 60, 25, 1.3, 5.8, 0.1),
  a("couve-flor", "Couve-flor cozida", "vegetais", 80, 23, 1.9, 4.5, 0.3),
  a("beterraba", "Beterraba cozida", "vegetais", 60, 49, 1.9, 11, 0.1),
  a("chuchu", "Chuchu cozido", "vegetais", 80, 19, 0.4, 4.8, 0),
  a("abobora", "Abóbora cozida", "vegetais", 80, 48, 1.4, 10.8, 0.7),
  a("pimentao", "Pimentão", "vegetais", 50, 28, 1, 6, 0.3),
  a("cebola", "Cebola", "vegetais", 30, 40, 1.1, 9.3, 0.1),
  a("berinjela", "Berinjela cozida", "vegetais", 80, 35, 0.8, 8.7, 0.2),
  a("vagem", "Vagem cozida", "vegetais", 80, 35, 1.9, 7.9, 0.3),
  a("quiabo", "Quiabo cozido", "vegetais", 80, 33, 1.9, 7, 0.2),
  a("palmito", "Palmito", "vegetais", 50, 30, 2.5, 4.6, 0.5),
  a("rucula", "Rúcula", "vegetais", 30, 25, 2.6, 3.7, 0.7),
  a("agriao", "Agrião", "vegetais", 30, 11, 2.3, 1.3, 0.1),
  a("acelga", "Acelga", "vegetais", 60, 20, 1.8, 3.7, 0.2),
  a("cogumelo", "Cogumelo", "vegetais", 60, 28, 3, 4, 0.5),
  a("azeitona", "Azeitona", "vegetais", 20, 115, 0.8, 6, 11, "1 azeitona ≈ 4 g"),

  // ───────── Frutas ─────────
  a("banana", "Banana", "frutas", 100, 89, 1.3, 23, 0.1, "1 banana média ≈ 100 g (sem casca)"),
  a("maca", "Maçã", "frutas", 130, 56, 0.3, 15, 0, "1 maçã média ≈ 130 g"),
  a("mamao", "Mamão", "frutas", 150, 40, 0.5, 10, 0.1),
  a("laranja", "Laranja", "frutas", 130, 46, 1, 11, 0.1),
  a("morango", "Morango", "frutas", 100, 30, 0.9, 7, 0.3),
  a("abacaxi", "Abacaxi", "frutas", 100, 48, 0.9, 12.3, 0.1),
  a("melancia", "Melancia", "frutas", 200, 33, 0.9, 8, 0.2),
  a("melao", "Melão", "frutas", 150, 29, 0.7, 7.5, 0.1),
  a("manga", "Manga", "frutas", 130, 64, 0.8, 16, 0.3),
  a("uva", "Uva", "frutas", 100, 69, 0.7, 18, 0.2),
  a("pera", "Pera", "frutas", 130, 57, 0.4, 15, 0.1),
  a("kiwi", "Kiwi", "frutas", 80, 61, 1.1, 15, 0.5),
  a("goiaba", "Goiaba", "frutas", 120, 54, 1.1, 13, 0.4),
  a("maracuja", "Maracujá (polpa)", "frutas", 50, 68, 2, 12, 2),
  a("tangerina", "Tangerina / mexerica", "frutas", 100, 38, 0.8, 9.6, 0.1),
  a("ameixa", "Ameixa", "frutas", 60, 46, 0.7, 11, 0.3),
  a("pessego", "Pêssego", "frutas", 100, 39, 0.9, 9.5, 0.3),
  a("caqui", "Caqui", "frutas", 100, 71, 0.6, 19, 0.2),
  a("abacate", "Abacate", "frutas", 80, 160, 1.9, 8.5, 14.7),
  a("framboesa", "Framboesa", "frutas", 80, 52, 1.2, 12, 0.7),
  a("mirtilo", "Mirtilo", "frutas", 80, 57, 0.7, 14, 0.3),
  a("acai-polpa", "Açaí (polpa pura)", "frutas", 100, 58, 0.8, 6.2, 3.9),
  a("tamara", "Tâmara", "frutas", 30, 277, 1.8, 75, 0.2, "1 tâmara ≈ 8 g"),
  a("uva-passa", "Uva-passa", "frutas", 30, 299, 3, 79, 0.5),

  // ───────── Laticínios ─────────
  a("leite", "Leite", "laticinios", 200, 61, 3.2, 4.7, 3.3, "1 copo ≈ 200 ml"),
  a("leite-desnatado", "Leite desnatado", "laticinios", 200, 35, 3.4, 5, 0.1),
  a("leite-soja", "Leite de soja", "laticinios", 200, 45, 3.3, 4, 1.8),
  a("leite-amendoa", "Leite de amêndoa", "laticinios", 200, 24, 0.7, 2, 1.5),
  a("iogurte", "Iogurte natural", "laticinios", 170, 51, 4.1, 2.3, 3),
  a("iogurte-grego", "Iogurte grego natural", "laticinios", 170, 97, 9, 3.9, 5),
  a("iogurte-frutas", "Iogurte com frutas", "laticinios", 170, 90, 3, 15, 2),
  a("iogurte-desnatado", "Iogurte desnatado", "laticinios", 170, 41, 4.2, 6, 0.2),
  a("iogurte-proteico", "Iogurte proteico", "laticinios", 170, 63, 10, 4, 0.5),
  a("kefir", "Kefir", "laticinios", 150, 55, 3.5, 4.5, 3),
  a("queijo", "Queijo", "laticinios", 30, 330, 25, 3, 25, "1 fatia ≈ 20 g"),
  a("queijo-minas", "Queijo minas frescal", "laticinios", 40, 264, 17, 3, 20),
  a("mussarela", "Queijo mussarela", "laticinios", 30, 330, 22, 3, 25, "1 fatia ≈ 15 g"),
  a("queijo-prato", "Queijo prato", "laticinios", 30, 360, 23, 2, 29, "1 fatia ≈ 15 g"),
  a("queijo-coalho", "Queijo coalho", "laticinios", 50, 311, 22, 2, 24),
  a("parmesao", "Queijo parmesão ralado", "laticinios", 10, 400, 36, 3, 27, "1 colher de sopa ≈ 7 g"),
  a("cottage", "Queijo cottage", "laticinios", 50, 98, 11, 3.4, 4.3),
  a("ricota", "Ricota", "laticinios", 50, 140, 12, 3, 8),
  a("requeijao", "Requeijão", "laticinios", 20, 257, 9, 3, 24, "1 colher de sopa ≈ 20 g"),
  a("cream-cheese", "Cream cheese", "laticinios", 20, 342, 6, 5, 33),
  a("creme-leite", "Creme de leite", "laticinios", 30, 221, 2.2, 3.4, 22),
  a("leite-condensado", "Leite condensado", "laticinios", 20, 321, 8, 55, 8, "1 colher de sopa ≈ 20 g"),
  a("leite-po", "Leite em pó integral", "laticinios", 15, 497, 26, 38, 27, "1 colher de sopa ≈ 15 g"),

  // ───────── Doces ─────────
  a("nutella", "Nutella / creme de avelã", "doces", 20, 539, 6.3, 57.5, 30.9, "1 colher de sopa ≈ 15 g"),
  a("chocolate-leite", "Chocolate ao leite", "doces", 25, 535, 7.6, 59, 30, "1 quadradinho ≈ 5 g"),
  a("chocolate-amargo", "Chocolate meio amargo", "doces", 25, 528, 5.4, 60, 30),
  a("chocolate-branco", "Chocolate branco", "doces", 25, 540, 6, 59, 32),
  a("brigadeiro", "Brigadeiro", "doces", 25, 380, 4, 58, 15, "1 brigadeiro ≈ 25 g"),
  a("doce-leite", "Doce de leite", "doces", 20, 315, 5.5, 59, 7),
  a("goiabada", "Goiabada", "doces", 30, 285, 0.6, 76, 0.1),
  a("geleia", "Geleia de frutas", "doces", 20, 250, 0.3, 65, 0.1, "1 colher de sopa ≈ 20 g"),
  a("mel", "Mel", "doces", 20, 304, 0.3, 82, 0, "1 colher de sopa ≈ 20 g"),
  a("acucar", "Açúcar", "doces", 10, 387, 0, 100, 0, "1 colher de chá ≈ 5 g"),
  a("sorvete", "Sorvete de creme", "doces", 80, 207, 3.5, 24, 11, "1 bola ≈ 60 g"),
  a("picole-fruta", "Picolé de frutas", "doces", 70, 90, 0.5, 22, 0.3),
  a("pudim", "Pudim de leite", "doces", 100, 195, 4.5, 30, 6.5),
  a("gelatina", "Gelatina", "doces", 100, 60, 1.5, 14, 0),
  a("pacoca", "Paçoca", "doces", 20, 510, 16, 52, 28, "1 paçoca ≈ 20 g"),
  a("cookie", "Cookie", "doces", 30, 480, 5, 65, 22, "1 cookie ≈ 30 g"),
  a("barra-cereal", "Barra de cereal", "doces", 25, 390, 6, 70, 9, "1 barra ≈ 25 g"),
  a("barra-proteina", "Barra de proteína", "doces", 45, 380, 30, 35, 13, "1 barra ≈ 45 g"),
  a("achocolatado-po", "Achocolatado em pó", "doces", 20, 390, 4, 85, 3, "1 colher de sopa ≈ 10 g"),
  a("acai-tigela", "Açaí na tigela (com granola e banana)", "doces", 300, 160, 2.4, 25, 6),

  // ───────── Bebidas ─────────
  a("cafe-preto", "Café preto (sem açúcar)", "bebidas", 50, 2, 0.1, 0.3, 0, "1 xícara pequena ≈ 50 ml"),
  a("cafe-acucar", "Café com açúcar", "bebidas", 100, 20, 0, 5, 0),
  a("cafe-leite", "Café com leite (sem açúcar)", "bebidas", 150, 32, 1.7, 2.5, 1.7),
  a("cha", "Chá (sem açúcar)", "bebidas", 200, 1, 0, 0.2, 0),
  a("suco-laranja", "Suco de laranja natural", "bebidas", 200, 45, 0.7, 10.4, 0.2, "1 copo ≈ 200 ml"),
  a("suco-uva", "Suco de uva integral", "bebidas", 200, 65, 0.3, 16, 0),
  a("suco-caixinha", "Suco industrializado", "bebidas", 200, 45, 0.2, 11, 0),
  a("refri", "Refrigerante", "bebidas", 300, 42, 0, 10.6, 0, "1 lata ≈ 350 ml"),
  a("refri-zero", "Refrigerante zero", "bebidas", 300, 0.5, 0, 0, 0),
  a("agua-coco", "Água de coco", "bebidas", 200, 22, 0.3, 5.3, 0.1),
  a("vitamina-banana", "Vitamina de banana com leite", "bebidas", 250, 85, 3, 14, 2),
  a("achocolatado", "Achocolatado (leite com chocolate)", "bebidas", 200, 76, 3, 11, 2.4),
  a("isotonico", "Isotônico", "bebidas", 300, 26, 0, 6.4, 0),
  a("energetico", "Energético", "bebidas", 250, 45, 0, 11, 0, "1 lata ≈ 250 ml"),
  a("cerveja", "Cerveja", "bebidas", 350, 43, 0.4, 3.6, 0, "1 lata ≈ 350 ml"),
  a("vinho", "Vinho tinto", "bebidas", 150, 85, 0.1, 2.6, 0, "1 taça ≈ 150 ml"),

  // ───────── Gorduras e molhos ─────────
  a("azeite", "Azeite", "gorduras", 10, 884, 0, 0, 100, "1 colher de sopa ≈ 10 g"),
  a("oleo", "Óleo de soja", "gorduras", 10, 884, 0, 0, 100),
  a("manteiga", "Manteiga", "gorduras", 10, 717, 0.5, 0, 81, "1 colher de sopa ≈ 10 g"),
  a("margarina", "Margarina", "gorduras", 10, 600, 0.1, 0.9, 66),
  a("maionese", "Maionese", "gorduras", 15, 302, 0.6, 4.5, 30, "1 colher de sopa ≈ 15 g"),
  a("ketchup", "Ketchup", "gorduras", 15, 100, 1.2, 26, 0.1),
  a("mostarda", "Mostarda", "gorduras", 10, 66, 4, 5.8, 4),
  a("molho-tomate", "Molho de tomate", "gorduras", 60, 40, 1.5, 7, 0.7),
  a("shoyu", "Molho shoyu", "gorduras", 10, 60, 6, 6, 0.1),
  a("castanhas", "Castanhas", "gorduras", 30, 600, 18, 12, 54),
  a("castanha-caju", "Castanha de caju", "gorduras", 30, 570, 18, 28, 46),
  a("castanha-para", "Castanha-do-pará", "gorduras", 20, 656, 14, 12, 66, "1 castanha ≈ 4 g"),
  a("amendoas", "Amêndoas", "gorduras", 30, 579, 21, 22, 50),
  a("nozes", "Nozes", "gorduras", 30, 654, 15, 14, 65),
  a("amendoim", "Amendoim torrado", "gorduras", 30, 585, 26, 20, 50),
  a("pasta-amendoim", "Pasta de amendoim", "gorduras", 15, 588, 25, 20, 50, "1 colher de sopa ≈ 15 g"),
  a("chia", "Chia", "gorduras", 10, 486, 17, 42, 31, "1 colher de sopa ≈ 12 g"),
  a("linhaca", "Linhaça", "gorduras", 10, 534, 18, 29, 42),

  // ───────── Pratos e lanches ─────────
  a("pizza", "Pizza (muçarela)", "pratos", 110, 266, 11, 33, 10, "1 fatia ≈ 110 g"),
  a("hamburguer-sanduiche", "Hambúrguer (sanduíche)", "pratos", 200, 255, 13, 24, 12),
  a("cachorro-quente", "Cachorro-quente", "pratos", 140, 290, 10, 24, 17),
  a("misto-quente", "Misto quente", "pratos", 100, 300, 15, 28, 14),
  a("sanduiche-natural", "Sanduíche natural", "pratos", 130, 190, 11, 22, 6),
  a("wrap-frango", "Wrap de frango", "pratos", 180, 215, 12, 25, 7),
  a("coxinha", "Coxinha", "pratos", 90, 275, 9, 29, 13, "1 coxinha ≈ 90 g"),
  a("pastel", "Pastel frito", "pratos", 100, 330, 9, 36, 17, "1 pastel ≈ 100 g"),
  a("esfiha", "Esfiha de carne", "pratos", 90, 260, 10, 33, 10),
  a("empada", "Empada", "pratos", 70, 390, 7, 35, 25),
  a("kibe", "Kibe frito", "pratos", 70, 260, 15, 15, 16),
  a("nuggets", "Nuggets de frango", "pratos", 100, 290, 15, 17, 18, "1 nugget ≈ 20 g"),
  a("salgadinho", "Salgadinho de pacote", "pratos", 30, 536, 6, 53, 34),
  a("pipoca", "Pipoca", "pratos", 30, 460, 8, 55, 23),
  a("crepioca", "Crepioca", "pratos", 100, 190, 11, 16, 9),
  a("strogonoff", "Strogonoff de frango", "pratos", 150, 140, 11, 4, 9),
  a("feijoada", "Feijoada", "pratos", 200, 150, 9, 10, 8),
  a("lasanha", "Lasanha à bolonhesa", "pratos", 200, 165, 9, 16, 7),
  a("risoto", "Risoto de frango", "pratos", 200, 150, 6, 21, 4.5),
  a("moqueca", "Moqueca de peixe", "pratos", 200, 130, 13, 4, 7),
  a("baiao", "Baião de dois", "pratos", 150, 155, 7, 24, 3.5),
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
