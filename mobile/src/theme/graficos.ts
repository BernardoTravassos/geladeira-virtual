/**
 * Cores das séries de gráfico.
 *
 * NÃO use o verde da marca (#1F5D3A) nem o par verde+laranja do colors.ts aqui.
 * Foram testados e reprovam:
 *
 *   #1F5D3A         → escuro e dessaturado demais para marca de gráfico
 *   #3E8E5F+#FF7A45 → ΔE 5,8 sob protanopia
 *   #2E9E66+#FF7A45 → ΔE 3,8 sob protanopia
 *
 * Verde e laranja parecem bem separados para quem enxerga as duas cores, mas
 * ficam quase idênticos para quem tem daltonismo vermelho-verde (~8% dos
 * homens). O par abaixo passa em todas as checagens (ΔE 9,2 sob deuteranopia,
 * 27,6 em visão normal) — o verde puxa para o azulado, e é isso que salva.
 */
export const serie = {
  consumidas: "#1BAF7A",
  gastas: "#EB6834",
};

/** Trilha de fundo dos medidores e linha de base dos gráficos. */
export const grafico = {
  trilha: "#EDEAE1",
  eixo: "#D9D4C7",
};
