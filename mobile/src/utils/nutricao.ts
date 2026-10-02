export type PerfilApi = {
  nome?: string;
  idade?: number;
  sexo?: string;
  altura_cm?: number;
  peso_kg?: string | number | null; // NUMERIC do Postgres chega como string
  objetivo?: string;
  pratica_exercicio?: boolean;
  tempo_disponivel?: string;
};

export type Metas = {
  calorias: number;
  proteina: number;
  carboidrato: number;
  gordura: number;
};

// Estimativa por Mifflin-St Jeor + fator de atividade + ajuste pelo objetivo.
// É uma referência geral, não uma prescrição nutricional.
export function calcularMetas(perfil: PerfilApi | null): Metas {
  const peso = Number(perfil?.peso_kg) || 70;
  const altura = perfil?.altura_cm || 170;
  const idade = perfil?.idade || 30;

  const ajusteSexo = perfil?.sexo === "Masculino" ? 5 : perfil?.sexo === "Feminino" ? -161 : -78;
  const tmb = 10 * peso + 6.25 * altura - 5 * idade + ajusteSexo;
  const gastoDiario = tmb * (perfil?.pratica_exercicio ? 1.55 : 1.3);

  const ajusteObjetivo =
    perfil?.objetivo === "Emagrecer" ? -400 : perfil?.objetivo === "Ganhar massa" ? 300 : 0;
  const calorias = Math.round(Math.max(1200, gastoDiario + ajusteObjetivo) / 10) * 10;

  const gramasProteinaPorKg =
    perfil?.objetivo === "Ganhar massa" ? 2 : perfil?.objetivo === "Emagrecer" ? 1.8 : 1.4;
  const proteina = Math.round(peso * gramasProteinaPorKg);
  const gordura = Math.round((calorias * 0.25) / 9);
  const carboidrato = Math.max(0, Math.round((calorias - proteina * 4 - gordura * 9) / 4));

  return { calorias, proteina, carboidrato, gordura };
}

export function saudacao(data = new Date()) {
  const hora = data.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}
