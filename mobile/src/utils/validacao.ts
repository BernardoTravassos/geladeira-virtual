/**
 * Regras de e-mail e senha em UM lugar: login, cadastro, recuperação e troca de
 * senha usam as mesmas. A regra da senha também existe no servidor
 * (backend-dotnet/Contratos/RequisicoesAuth.cs) — as duas têm que andar juntas.
 */
export const SENHA_MINIMA = 8;
export const SENHA_MAXIMA = 72; // o bcrypt ignora o que passa de 72 bytes

// Letras maiúsculas ASCII e latinas acentuadas (À–Þ, sem ×). Evita \p{Lu}, que
// o motor JavaScript do celular nem sempre suporta.
const MAIUSCULA = /[A-ZÀ-ÖØ-Þ]/;

const FORMATO_EMAIL =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

/** Devolve a mensagem de erro, ou null se o e-mail está no formato padrão (nome@dominio.com). */
export function validarEmail(valor: string): string | null {
  const email = valor.trim();
  if (!email) return "Digite o seu e-mail.";
  if (email.length > 255) return "O e-mail é longo demais.";
  if (!email.includes("@")) return "O e-mail precisa ter um @, como nome@exemplo.com.";
  if (email.includes("..") || email.startsWith(".") || email.split("@")[0].endsWith(".")) {
    return "O e-mail tem pontos em lugares inválidos.";
  }
  if (!FORMATO_EMAIL.test(email)) return "Digite um e-mail válido, como nome@exemplo.com.";
  return null;
}

export type RegrasSenha = { tamanho: boolean; maiuscula: boolean };

export function regrasDaSenha(senha: string): RegrasSenha {
  return { tamanho: senha.length >= SENHA_MINIMA, maiuscula: MAIUSCULA.test(senha) };
}

/** Devolve a mensagem de erro, ou null se a senha cumpre as regras. */
export function validarSenha(senha: string): string | null {
  if (!senha) return "Digite a sua senha.";
  const r = regrasDaSenha(senha);
  if (!r.tamanho && !r.maiuscula) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres e uma letra maiúscula.`;
  if (!r.tamanho) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (!r.maiuscula) return "A senha precisa ter pelo menos uma letra maiúscula.";
  if (senha.length > SENHA_MAXIMA) return `A senha pode ter no máximo ${SENHA_MAXIMA} caracteres.`;
  return null;
}
