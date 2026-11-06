import React from "react";
import Svg, { Rect, Path, Line } from "react-native-svg";
import { colors } from "../theme/colors";

type Props = {
  tamanho?: number;
  /** "tudo" desenha o símbolo; "corpo"/"folha" desenham só uma parte, para animar separadas. */
  parte?: "tudo" | "corpo" | "folha";
  /** Cor da geladeira. Em fundo verde, use o off-white; em fundo claro, o verde da marca. */
  corCorpo?: string;
  /** Cor dos detalhes (divisória e puxadores). Deve ser a cor do fundo da tela. */
  corDetalhe?: string;
};

/**
 * Símbolo PROVISÓRIO do app: uma geladeira com uma folha brotando no topo.
 * Verde = saúde e frescor; a folha em laranja é a cor de destaque da marca e
 * resume a ideia do app (o que tem na geladeira vira comida saudável).
 *
 * Desenhado em SVG (viewBox 100×100), então fica nítido em qualquer tamanho.
 */
export default function Logo({
  tamanho = 120,
  parte = "tudo",
  corCorpo = colors.background,
  corDetalhe = colors.primary,
}: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 100 100">
      {parte !== "folha" && (
        <>
          {/* Corpo da geladeira */}
          <Rect x={24} y={24} width={52} height={68} rx={12} fill={corCorpo} />
          {/* Divisória entre congelador e porta */}
          <Line x1={24} y1={48} x2={76} y2={48} stroke={corDetalhe} strokeWidth={3} />
          {/* Puxadores */}
          <Rect x={63} y={32} width={4.5} height={11} rx={2.25} fill={corDetalhe} />
          <Rect x={63} y={55} width={4.5} height={20} rx={2.25} fill={corDetalhe} />
          {/* Pezinhos */}
          <Rect x={32} y={92} width={9} height={3.5} rx={1.75} fill={corCorpo} />
          <Rect x={59} y={92} width={9} height={3.5} rx={1.75} fill={corCorpo} />
        </>
      )}
      {parte !== "corpo" && (
        <>
          {/* Folha brotando do topo */}
          <Path
            d="M50 25 C48 8 64 1 80 5 C80 20 68 29 50 25 Z"
            fill={colors.accent}
          />
          <Path d="M52 23 L71 11" stroke={corCorpo === colors.background ? colors.primary : colors.background} strokeWidth={2} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}
