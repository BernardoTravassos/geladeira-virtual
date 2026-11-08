/**
 * Gerador pseudoaleatório determinístico (mulberry32), com a semente embaralhada.
 *
 * O mesmo número gera sempre a mesma sequência, então dados de exemplo ficam
 * estáveis. O embaralhamento é essencial: com sementes CONSECUTIVAS (um dia
 * após o outro) um gerador simples produz valores quase iguais, e o gráfico
 * vira uma rampa em vez de dias variados.
 */
export function semente(n: number) {
  let h = (n ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  let t = (h ^ (h >>> 16)) >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
