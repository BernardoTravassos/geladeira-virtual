import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";
import { DEV } from "../config/dev";
import type { PerfilApi } from "../utils/nutricao";

/**
 * Tudo da relação nutricionista ↔ paciente que passa pelo servidor:
 * entrar como nutricionista, convidar, vincular e ler o diário de quem aceitou.
 */

export const CHAVE_PAPEL = "@geladeira:papel";
export type Papel = "paciente" | "nutricionista";

async function auth() {
  const token = await AsyncStorage.getItem("@geladeira:token");
  return { headers: { Authorization: `Bearer ${token}` } };
}

/** Papel guardado na sessão atual ("paciente" quando não há nada guardado). */
export async function papelAtual(): Promise<Papel> {
  return (await AsyncStorage.getItem(CHAVE_PAPEL)) === "nutricionista" ? "nutricionista" : "paciente";
}

/** Login que também informa o papel da conta (o servidor decide, nunca o app). */
export async function entrar(email: string, senha: string): Promise<{ token: string; papel: Papel }> {
  if (DEV.MODO_DEMO) return { token: "token-demonstracao", papel: "paciente" };
  const { data } = await api.post("/auth/login", { email, senha });
  return { token: data.token, papel: data.papel === "nutricionista" ? "nutricionista" : "paciente" };
}

export async function cadastrarNutricionista(dados: { email: string; senha: string; nome: string; crn: string }) {
  const { data } = await api.post("/auth/register-nutritionist", dados);
  return { token: data.token as string, papel: "nutricionista" as Papel };
}

/** Guarda a sessão (token + papel). */
export async function guardarSessao(token: string, papel: Papel) {
  await AsyncStorage.multiSet([["@geladeira:token", token], [CHAVE_PAPEL, papel]]);
}

export async function encerrarSessao() {
  await AsyncStorage.multiRemove(["@geladeira:token", "@geladeira:wizardDone", CHAVE_PAPEL]);
}

// ───────────────────────────── lado do nutricionista ─────────────────────────────

export type PacienteDoNutri = {
  vinculoId: string;
  status: "pendente" | "ativo";
  codigo: string | null;
  criadoEm: string;
  aceitoEm: string | null;
  paciente: null | {
    id: string;
    nome: string | null;
    email: string;
    objetivo: string | null;
    idade: number | null;
    pesoKg: number | string | null;
    perfil: PerfilApi | null;
  };
};

export async function minhaContaNutri(): Promise<{ email: string; nutricionista: { nome: string; crn: string } | null }> {
  const { data } = await api.get("/auth/me", await auth());
  return data;
}

export async function listarPacientes(): Promise<PacienteDoNutri[]> {
  const { data } = await api.get("/nutritionist/patients", await auth());
  return data;
}

export async function criarConvite(): Promise<{ id: string; codigo: string }> {
  const { data } = await api.post("/nutritionist/invites", null, await auth());
  return data;
}

export async function encerrarVinculoComoNutri(vinculoId: string) {
  await api.delete(`/nutritionist/links/${vinculoId}`, await auth());
}

export type LinhaDiario = { tipo: "refeicoes" | "agua" | "treinos"; data: string; conteudo: string };

export async function diarioDoPaciente(pacienteId: string): Promise<LinhaDiario[]> {
  const { data } = await api.get(`/nutritionist/patients/${pacienteId}/diary`, await auth());
  return data;
}

// ───────────────────────────── lado do paciente ─────────────────────────────

export type MeuNutricionista = { vinculoId: string; aceitoEm: string; nutricionista: { nome: string; crn: string } };

export async function meusNutricionistas(): Promise<MeuNutricionista[]> {
  const { data } = await api.get("/links", await auth());
  return data;
}

export async function aceitarConvite(codigo: string): Promise<MeuNutricionista["nutricionista"]> {
  const { data } = await api.post("/links/accept", { codigo }, await auth());
  return data.nutricionista;
}

export async function encerrarMeuVinculo(vinculoId: string) {
  await api.delete(`/links/${vinculoId}`, await auth());
}
