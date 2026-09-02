import axios from "axios";

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