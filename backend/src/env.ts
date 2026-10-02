import dotenv from "dotenv";

dotenv.config();

// Valores que já vieram nos arquivos de exemplo do projeto. Se algum deles
// chegar aqui como valor real, não é segredo — está publicado no repositório.
const PLACEHOLDERS = ["troque-por-um-segredo-forte", "mude-isso", "changeme", "secret"];

function obrigatoria(nome: string): string {
  const valor = process.env[nome]?.trim();
  if (!valor) {
    throw new Error(
      `[config] A variável ${nome} não está definida. ` +
        `Defina em backend/.env (use backend/.env.example como referência).`
    );
  }
  return valor;
}

function segredo(nome: string, tamanhoMinimo: number): string {
  const valor = obrigatoria(nome);

  if (PLACEHOLDERS.includes(valor)) {
    throw new Error(
      `[config] ${nome} ainda está com o valor de exemplo do repositório, ` +
        `então qualquer pessoa que leia o código pode forjar tokens válidos. ` +
        `Gere um valor novo com:\n` +
        `  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }

  if (valor.length < tamanhoMinimo) {
    throw new Error(
      `[config] ${nome} tem ${valor.length} caracteres, o mínimo é ${tamanhoMinimo}. ` +
        `Um segredo curto é quebrável por força bruta. Gere um valor novo com:\n` +
        `  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }

  return valor;
}

export const env = {
  PORT: Number(process.env.PORT) || 3333,
  DATABASE_URL: obrigatoria("DATABASE_URL"),
  JWT_SECRET: segredo("JWT_SECRET", 32),
};
