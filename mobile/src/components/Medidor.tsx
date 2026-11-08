import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useCallback, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { grafico } from "../theme/graficos";

export const COR_EXCESSO = "#F4A0A0"; // vermelho claro

type Props = {
  rotulo: string;
  atual: number;
  meta: number;
  unidade?: string;
  cor?: string;
  /** Atraso para escalonar vários medidores na mesma tela. */
  atraso?: number;
  /**
   * Quando `atual` passa da meta, a parte que sobra aparece em vermelho claro.
   * Use em limites que se pretende respeitar (macros, calorias). NÃO use onde
   * passar é bom (passos, água).
   */
  avisarExcesso?: boolean;
};

/**
 * Uma razão contra um limite. A forma certa aqui é MEDIDOR — trilha de fundo
 * mais preenchimento —, não um gráfico. Gráfico de uma barra só desperdiça
 * espaço e atenção.
 *
 * A cor não codifica identidade (é sempre a mesma grandeza), então uma cor só.
 * O preenchimento cresce da esquerda quando a tela ganha foco, acompanhando as
 * colunas do gráfico: um painel onde só uma peça se mexe parece inacabado.
 */
export default function Medidor({
  rotulo,
  atual,
  meta,
  unidade = "g",
  cor: corProp,
  atraso = 0,
  avisarExcesso = false,
}: Props) {
  const colors = useCores();
  const cor = corProp ?? colors.primaryLight;
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const passou = avisarExcesso && meta > 0 && atual > meta;
  // Com excesso, a trilha passa a representar o total consumido: a parte até a
  // meta fica na cor normal e o que sobrou, em vermelho claro.
  const fracao = meta > 0 ? (passou ? meta / atual : Math.min(atual / meta, 1)) : 0;
  const fracaoExcesso = passou ? 1 - meta / atual : 0;
  const progresso = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      progresso.setValue(0);
      Animated.timing(progresso, {
        toValue: 1,
        duration: 520,
        delay: atraso,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, [progresso, atraso])
  );

  return (
    <View style={styles.caixa}>
      <View style={styles.linhaTopo}>
        <Text style={styles.rotulo}>{rotulo}</Text>
        <Text style={[styles.valor, passou && styles.valorExcesso]}>
          {atual.toLocaleString("pt-BR")}
          <Text style={styles.meta}>
            /{meta.toLocaleString("pt-BR")} {unidade}
          </Text>
          {passou && <Text style={styles.excessoTxt}>  +{Math.round(atual - meta).toLocaleString("pt-BR")}</Text>}
        </Text>
      </View>
      <View style={styles.trilha}>
        <Animated.View
          style={[
            styles.preenchimento,
            passou && styles.semBordaDireita,
            {
              backgroundColor: cor,
              width: progresso.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${fracao * 100}%`] }),
            },
          ]}
        />
        {passou && (
          <Animated.View
            style={[
              styles.excesso,
              { width: progresso.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${fracaoExcesso * 100}%`] }) },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  caixa: { gap: 6 },
  linhaTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  rotulo: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  valor: { fontSize: 12, fontWeight: "700", color: colors.textPrimary },
  meta: { fontSize: 11, fontWeight: "400", color: colors.textSecondary },
  trilha: { height: 6, borderRadius: 3, backgroundColor: colors.trilha, overflow: "hidden", flexDirection: "row" },
  preenchimento: { height: "100%", borderRadius: 3 },
  semBordaDireita: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  excesso: { height: "100%", backgroundColor: COR_EXCESSO },
  valorExcesso: { color: colors.erroTexto },
  excessoTxt: { fontSize: 11, fontWeight: "700", color: colors.erroTexto },
});
