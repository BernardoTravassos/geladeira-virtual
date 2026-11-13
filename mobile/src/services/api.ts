import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { DEV } from "../config/dev";

const PORTA_API = 3333;

/**
 * Endereço da API, descoberto automaticamente em desenvolvimento.
 *
 * Antes isto era um IP fixo, e quebrava toda vez que a máquina trocava de
 * rede — o celular ficava chamando um endereço que não existia mais, e o
 * sintoma era um "ERR_NETWORK" sem explicação.
 *
 * O Expo informa, em `hostUri`, o endereço da máquina que está servindo o
 * app (algo como "192.168.15.6:8081"). Como o backend roda nessa mesma
 * máquina, basta trocar a porta. Mudou de rede? O Expo informa o endereço
 * novo e o app acompanha sozinho.
 *
 * Em produção isto não se aplica: ali o servidor tem endereço próprio e
 * fixo, definido em `extra.apiUrl` no app.json, e que precisa ser HTTPS
 * (item 5 da lista de segurança).
 */
function ehEnderecoLocal(host: string): boolean {
  return (
    host === "localhost" ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

function descobrirEnderecoApi(): string {
  // Em produção, defina "extra": { "apiUrl": "https://..." } no app.json.
  const urlConfigurada = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (urlConfigurada) return urlConfigurada;

  // Só em desenvolvimento, e só se o host for uma máquina da rede local.
  // Num app PUBLICADO o hostUri aponta para os servidores do Expo
  // (u.expo.dev), e sem esta guarda o app tentaria http://u.expo.dev:3333.
  // Em modo túnel o host é *.exp.direct, que também não hospeda a nossa API.
  const hostDoExpo = Constants.expoConfig?.hostUri?.split(":")[0];
  if (__DEV__ && hostDoExpo && ehEnderecoLocal(hostDoExpo)) {
    return `http://${hostDoExpo}:${PORTA_API}`;
  }

  // Último recurso: emulador rodando na própria máquina.
  return `http://localhost:${PORTA_API}`;
}

const BASE_URL = descobrirEnderecoApi();

/** Exportado para as telas conseguirem mostrar o endereço em uso ao diagnosticar. */
export const ENDERECO_API = BASE_URL;

/**
 * Descreve uma falha de REDE (quando não houve resposta nenhuma do servidor).
 * Devolve null quando o servidor respondeu — aí o problema não é de rede.
 *
 * Serve para o app parar de dizer só "não foi possível" e passar a dizer o
 * que de fato aconteceu: tempo esgotado, conexão recusada, endereço errado.
 */
export function descreverFalhaDeRede(erro: any): string | null {
  if (erro?.response) return null;
  const codigo = erro?.code ?? "SEM_CODIGO";
  return `${codigo} ao chamar ${BASE_URL}`;
}

export const api = axios.create({
  baseURL: BASE_URL,
  // Sem isto o axios espera PARA SEMPRE. Se o servidor não responde (rede
  // errada, porta bloqueada, API fora), o app fica girando sem fim e sem
  // mensagem. 15 segundos transforma o travamento em um erro visível.
  timeout: 15000,
});

// Modo demo: sem backend, o perfil do wizard fica guardado só no aparelho.
const CHAVE_PERFIL_DEMO = "@geladeira:perfilDemo";
const TOKEN_DEMO = "token-demonstracao";

const CHAVE_EMAIL_DEMO = "@geladeira:emailDemo";

export async function login(email: string, senha: string) {
  if (DEV.MODO_DEMO) {
    await AsyncStorage.setItem(CHAVE_EMAIL_DEMO, email.trim().toLowerCase());
    return TOKEN_DEMO;
  }
  const response = await api.post("/auth/login", { email, senha });
  return response.data.token as string;
}

export async function register(email: string, senha: string) {
  if (DEV.MODO_DEMO) {
    await AsyncStorage.setItem(CHAVE_EMAIL_DEMO, email.trim().toLowerCase());
    return TOKEN_DEMO;
  }
  const response = await api.post("/auth/register", { email, senha });
  return response.data.token as string;
}

export async function saveProfile(dados: {
  nome: string;
  idade: number;
  sexo: string;
  alturaCm: number;
  pesoKg: number;
  objetivo: string;
  praticaExercicio: boolean;
  /** sedentario | leve | moderado | intenso | muito_intenso */
  nivelAtividade?: string;
  intolerancias?: string;
  vegano: boolean;
  preferenciaPreparo: string;
  tempoDisponivel: string;
}) {
  if (DEV.MODO_DEMO) {
    // Guarda no MESMO formato que a API devolve (snake_case). Antes ficava em
    // camelCase e o app não achava `peso_kg`/`altura_cm`: as metas eram
    // calculadas com peso, altura e idade padrão, ignorando o que a pessoa disse.
    await AsyncStorage.setItem(CHAVE_PERFIL_DEMO, JSON.stringify(paraFormatoDaApi(dados)));
    return dados;
  }
  const token = await AsyncStorage.getItem("@geladeira:token");
  const response = await api.post("/profile", dados, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

function paraFormatoDaApi(d: any) {
  return {
    nome: d.nome,
    idade: d.idade,
    sexo: d.sexo,
    altura_cm: d.alturaCm,
    peso_kg: String(d.pesoKg),
    objetivo: d.objetivo,
    pratica_exercicio: d.praticaExercicio,
    nivel_atividade: d.nivelAtividade ?? null,
    intolerancias: d.intolerancias ?? null,
    vegano: d.vegano,
    preferencia_preparo: d.preferenciaPreparo,
    tempo_disponivel: d.tempoDisponivel,
  };
}

// Retorna o perfil do usuário logado, ou null se ele ainda não preencheu o wizard (404).
export async function getProfile() {
  if (DEV.MODO_DEMO) {
    const salvo = await AsyncStorage.getItem(CHAVE_PERFIL_DEMO);
    if (!salvo) return null;
    const perfil = JSON.parse(salvo);
    // Perfis salvos antes da correção estavam em camelCase: converte ao ler.
    return perfil.alturaCm !== undefined ? paraFormatoDaApi(perfil) : perfil;
  }
  const token = await AsyncStorage.getItem("@geladeira:token");
  try {
    const response = await api.get("/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (erro: any) {
    if (erro?.response?.status === 404) return null;
    throw erro;
  }
}

/**
 * Pede um cardápio a partir da foto da geladeira.
 *
 * Ainda incompleto: o endpoint /meals/generate é um esqueleto no backend
 * (Fase 4 da migração) e a câmera não está integrada no app. O que já está
 * pronto aqui é o contrato de erro — ver `ehLimiteAtingido` abaixo.
 */
export async function gerarCardapio(foto?: { uri: string; nome: string; tipo: string }) {
  const token = await AsyncStorage.getItem("@geladeira:token");

  const corpo = new FormData();
  if (foto) {
    // O React Native aceita este formato de arquivo no FormData.
    corpo.append("photo", { uri: foto.uri, name: foto.nome, type: foto.tipo } as any);
  }

  const response = await api.post("/meals/generate", corpo, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

/**
 * O usuário do plano gratuito esgotou as consultas do dia?
 *
 * 429 é o código HTTP para "você fez pedidos demais". É o backend que decide
 * isso — o app apenas reage. Confiar no app para controlar o limite seria o
 * mesmo erro de confiar nele para dizer que o usuário pagou.
 */
export function ehLimiteAtingido(erro: any) {
  return erro?.response?.status === 429;
}

/**
 * Passo 1 da recuperação: pede o envio de um código de 6 dígitos por e-mail.
 *
 * ⚠️ Contrato de segurança: a API responde SEMPRE 200, exista ou não uma conta
 * com esse e-mail. Se respondesse 404 para e-mail inexistente, qualquer pessoa
 * poderia descobrir quem tem conta no app testando endereços — é o que se
 * chama de "enumeração de contas". Por isso a tela mostra a mesma mensagem nos
 * dois casos.
 */
export async function solicitarCodigoSenha(email: string) {
  if (DEV.MODO_DEMO) return;
  await api.post("/auth/forgot-password", { email });
}

/**
 * Passo 2: troca o código pela nova senha.
 *
 * Erros esperados:
 *   400 → código errado, expirado ou já usado
 *   429 → tentativas demais
 */
export async function redefinirSenha(email: string, codigo: string, novaSenha: string) {
  if (DEV.MODO_DEMO) return;
  await api.post("/auth/reset-password", { email, codigo, novaSenha });
}

/** Um alimento reconhecido na foto, com os valores POR 100 g dele (a quantidade a pessoa informa depois). */
export type AlimentoReconhecido = {
  nome: string;
  calorias_100g: number;
  proteina_100g: number;
  carboidratos_100g: number;
  gordura_100g: number;
};

export type EstimativaPrato = {
  eh_comida: boolean;
  alimentos: AlimentoReconhecido[];
  confianca: "baixa" | "media" | "alta";
  aviso: string;
};

/** Envia a foto do prato e recebe uma ESTIMATIVA nutricional feita por IA. */
export async function analisarPrato(fotoUri: string, refeicao?: string): Promise<EstimativaPrato> {
  if (DEV.SIMULAR_IA_PRATO) return simularAnalisePrato(refeicao);

  const token = await AsyncStorage.getItem("@geladeira:token");
  const corpo = new FormData();
  corpo.append("photo", { uri: fotoUri, name: "prato.jpg", type: "image/jpeg" } as any);

  const response = await api.post("/meals/analyze", corpo, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
    timeout: 60000, // a análise por IA leva alguns segundos
  });
  return response.data;
}

// Pratos prontos para a simulação (DEV.SIMULAR_IA_PRATO). Rodam em sequência,
// para quem testa ver variações em vez de sempre o mesmo resultado.
const al = (nome: string, kcal: number, p: number, c: number, g: number): AlimentoReconhecido =>
  ({ nome, calorias_100g: kcal, proteina_100g: p, carboidratos_100g: c, gordura_100g: g });

const PRATOS_SIMULADOS: { alimentos: AlimentoReconhecido[]; confianca: EstimativaPrato["confianca"] }[] = [
  {
    alimentos: [
      al("Arroz branco", 128, 2.5, 28, 0.2),
      al("Feijão", 76, 4.8, 14, 0.5),
      al("Frango grelhado", 159, 32, 0, 2.5),
      al("Salada de alface e tomate", 17, 1.1, 3.4, 0.2),
    ],
    confianca: "media",
  },
  {
    alimentos: [
      al("Strogonoff de frango", 170, 12, 6, 10.5),
      al("Arroz branco", 128, 2.5, 28, 0.2),
      al("Batata palha", 545, 5, 55, 35),
    ],
    confianca: "media",
  },
  {
    alimentos: [al("Macarrão ao molho", 150, 5, 29, 1.5), al("Carne moída", 250, 24, 0, 16)],
    confianca: "baixa",
  },
  {
    alimentos: [al("Pão francês", 300, 8, 58, 3.1), al("Ovo mexido", 165, 11, 2, 12), al("Mamão", 40, 0.5, 10, 0.1)],
    confianca: "alta",
  },
];
// Na simulação, cada refeição "reconhece" um prato DIFERENTE do plano da nutricionista, para dar
// para ver os cards do plano sendo substituídos pelos da foto. Qualquer foto serve.
const PRATO_POR_REFEICAO: Record<string, { alimentos: AlimentoReconhecido[]; confianca: EstimativaPrato["confianca"] }> = {
  cafe: {
    alimentos: [al("Tapioca com queijo", 220, 8, 33, 6), al("Suco de laranja", 45, 0.7, 10, 0.2), al("Café com leite", 40, 2, 4, 1.5)],
    confianca: "media",
  },
  "lanche-manha": {
    alimentos: [al("Barra de cereal", 390, 5, 70, 9), al("Banana", 89, 1.3, 23, 0.1)],
    confianca: "alta",
  },
  almoco: {
    alimentos: [
      al("Strogonoff de frango", 170, 12, 6, 10.5),
      al("Arroz branco", 128, 2.5, 28, 0.2),
      al("Batata palha", 545, 5, 55, 35),
    ],
    confianca: "media",
  },
  "lanche-tarde": {
    alimentos: [al("Pão de queijo", 363, 5, 38, 21), al("Café com leite", 40, 2, 4, 1.5)],
    confianca: "alta",
  },
  jantar: {
    alimentos: [al("Pizza de mussarela", 270, 12, 33, 10), al("Refrigerante", 42, 0, 10.6, 0)],
    confianca: "media",
  },
  ceia: {
    alimentos: [al("Sorvete de creme", 207, 3.5, 24, 11)],
    confianca: "baixa",
  },
};
let proximoPratoSimulado = 0;

async function simularAnalisePrato(refeicao?: string): Promise<EstimativaPrato> {
  await new Promise((r) => setTimeout(r, 1800)); // parece uma análise de verdade
  const prato = (refeicao && PRATO_POR_REFEICAO[refeicao]) || PRATOS_SIMULADOS[proximoPratoSimulado++ % PRATOS_SIMULADOS.length];
  return {
    eh_comida: true,
    alimentos: prato.alimentos,
    confianca: prato.confianca,
    aviso: "Alimentos reconhecidos por IA a partir da foto, com valores aproximados por 100 g.",
  };
}

/** Dados da conta (e-mail) para a tela de perfil. */
export async function getConta(): Promise<{ email: string }> {
  if (DEV.MODO_DEMO) {
    return { email: (await AsyncStorage.getItem(CHAVE_EMAIL_DEMO)) ?? "conta de demonstração" };
  }
  const token = await AsyncStorage.getItem("@geladeira:token");
  const response = await api.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  return response.data;
}

/**
 * Troca a senha com a pessoa logada. O servidor devolve um token novo (as
 * outras sessões são encerradas), que passa a ser o da sessão atual.
 */
export async function alterarSenha(senhaAtual: string, novaSenha: string) {
  if (DEV.MODO_DEMO) return; // em demonstração não existe senha de verdade
  const token = await AsyncStorage.getItem("@geladeira:token");
  const response = await api.post(
    "/auth/change-password",
    { senhaAtual, novaSenha },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.data?.token) await AsyncStorage.setItem("@geladeira:token", response.data.token);
}
