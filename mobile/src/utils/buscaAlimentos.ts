import { Alimento, normalizar, palavrasDaBusca } from "../data/alimentos";

/**
 * Filtra e ordena alimentos para uma busca digitada. Compartilhada pela tela de
 * refeição e pela edição do plano da nutricionista, para as duas acharem igual.
 *
 * - Ignora acento, maiúsculas e pontuação; todas as palavras precisam aparecer, em qualquer ordem.
 * - "ovos" acha "ovo" (plural).
 * - Ordem: a do servidor quando existe; depois palavra inteira antes de pedaço de palavra
 *   ("maca" mostra "Maçã" antes de "Macarrão"); por fim nomes mais curtos.
 */
export function filtrarAlimentos(todos: Alimento[], busca: string, ordemServidor: string[] | null): Alimento[] {
  const palavras = palavrasDaBusca(busca);
  if (palavras.length === 0) return [];

  const posicao = new Map((ordemServidor ?? []).map((id, i) => [id, i]));
  const inteira = (n: string, p: string) => ` ${n} `.includes(` ${p} `) || ` ${n} `.includes(` ${p}s `);

  return todos
    .map((x) => ({ x, n: normalizar(x.nome) }))
    .filter(({ n }) => palavras.every((p) => n.includes(p)))
    .sort((a, b) => {
      const pa = posicao.get(a.x.id) ?? 1000;
      const pb = posicao.get(b.x.id) ?? 1000;
      if (pa !== pb) return pa - pb;
      const ia = palavras.every((p) => inteira(a.n, p)) ? 0 : 1;
      const ib = palavras.every((p) => inteira(b.n, p)) ? 0 : 1;
      return ia - ib || a.n.length - b.n.length;
    })
    .map(({ x }) => x);
}
