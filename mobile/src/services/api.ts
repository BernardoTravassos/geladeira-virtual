import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.4.43:3333";

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

export async function login(email: string, senha: string) {
  const response = await api.post("/auth/login", { email, senha });
  return response.data.token as string;
}

export async function register(email: string, senha: string) {
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
  intolerancias?: string;
  vegano: boolean;
  preferenciaPreparo: string;
  tempoDisponivel: string;
}) {
  const token = await AsyncStorage.getItem("@geladeira:token");
  const response = await api.post("/profile", dados, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// Retorna o perfil do usuário logado, ou null se ele ainda não preencheu o wizard (404).
export async function getProfile() {
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
  await api.post("/auth/reset-password", { email, codigo, novaSenha });
}
