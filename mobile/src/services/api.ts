import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.4.43:3333";

export const api = axios.create({
  baseURL: BASE_URL,
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
