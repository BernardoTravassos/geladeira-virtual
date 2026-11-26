import { interpretarNumero } from "./numeros";
import { REGRAS } from "./camposPerfil";
import { nivelDoPerfil, type PerfilApi } from "./nutricao";

/** Campos do perfil que o nutricionista pode corrigir durante a reunião. */
export type CampoReuniao =
  | "pesoKg" | "alturaCm" | "idade" | "gorduraPct" | "objetivo" | "pesoMetaKg" | "diasTreino" | "intolerancias" | "vegano";

export const OBJETIVOS = ["Emagrecer", "Ganhar massa", "Definir e ficar mais forte", "Melhorar o desempenho", "Manter o peso", "Comer mais saudável"];

const mudaPeso = (objetivo?: string) => objetivo === "Emagrecer" || objetivo === "Ganhar massa";
const numeroOuNulo = (v: unknown) => (v !== null && v !== undefined && v !== "" && Number(v) ? Number(v) : null);

/**
 * Monta o perfil completo (o servidor recebe tudo de uma vez) com UM campo trocado.
 * Valida com as mesmas regras da tela de Perfil e lança Error com a mensagem para a pessoa.
 */
export function perfilComCampo(p: PerfilApi, campo: CampoReuniao, valor: string) {
  const a: any = p;
  const dados: any = {
    nome: a.nome, idade: a.idade, sexo: a.sexo, alturaCm: a.altura_cm, pesoKg: Number(a.peso_kg),
    objetivo: a.objetivo, praticaExercicio: !!a.pratica_exercicio, nivelAtividade: nivelDoPerfil(p), intolerancias: a.intolerancias || undefined,
    vegano: !!a.vegano, preferenciaPreparo: a.preferencia_preparo, tempoDisponivel: a.tempo_disponivel,
    gestacao: a.gestacao ?? null, gorduraPct: numeroOuNulo(a.gordura_pct), pesoMetaKg: numeroOuNulo(a.peso_meta_kg),
    ritmo: a.ritmo ?? null, rotinaDiaria: a.rotina_diaria ?? null, diasTreino: a.dias_treino ?? null,
    minutosTreino: a.minutos_treino ?? null, intensidadeTreino: a.intensidade_treino ?? null,
    condicoesSaude: a.condicoes_saude ?? null,
  };
  const texto = valor.trim();

  if (campo === "pesoKg" || campo === "alturaCm" || campo === "idade" || campo === "gorduraPct" || campo === "pesoMetaKg") {
    if (!texto && (campo === "gorduraPct" || campo === "pesoMetaKg")) dados[campo] = null;
    else {
      const r = interpretarNumero(texto, REGRAS[campo]);
      if ("erro" in r) throw new Error(r.erro);
      if (campo === "pesoMetaKg") {
        if (a.objetivo === "Emagrecer" && r.valor >= dados.pesoKg) throw new Error("Para emagrecer, o peso desejado precisa ser menor que o atual.");
        if (a.objetivo === "Ganhar massa" && r.valor <= dados.pesoKg) throw new Error("Para ganhar massa, o peso desejado precisa ser maior que o atual.");
      }
      dados[campo] = r.valor;
    }
  } else if (campo === "objetivo") {
    if (!OBJETIVOS.includes(texto)) throw new Error("Objetivo inválido.");
    dados.objetivo = texto;
    if (!mudaPeso(texto)) { dados.pesoMetaKg = null; dados.ritmo = null; }
  } else if (campo === "diasTreino") {
    const dias = Number(texto);
    if (!Number.isInteger(dias) || dias < 0 || dias > 7) throw new Error("Informe de 0 a 7 dias.");
    dados.diasTreino = dias;
    dados.praticaExercicio = dias > 0;
    dados.nivelAtividade = nivelDoPerfil({ dias_treino: dias });
    if (dias === 0) { dados.minutosTreino = null; dados.intensidadeTreino = null; }
    else { dados.minutosTreino ??= 60; dados.intensidadeTreino ??= "moderada"; }
    dados.rotinaDiaria ??= "sentado";
  } else if (campo === "intolerancias") {
    dados.intolerancias = texto.slice(0, 300) || undefined;
  } else if (campo === "vegano") {
    dados.vegano = texto === "Sim";
  }
  return dados;
}
