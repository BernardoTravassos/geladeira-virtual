import React, { useCallback, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../theme/colors";
import { grafico } from "../theme/graficos";

type Props = {
  rotulo: string;
  atual: number;
  meta: number;
  unidade?: string;
  cor?: string;
  /** Atraso para escalonar vários medidores na mesma tela. */
  atraso?: number;
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
  cor = colors.primaryLight,
  atraso = 0,
}: Props) {
  const fracao = meta > 0 ? Math.min(atual / meta, 1) : 0;
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
        <Text style={styles.valor}>
          {atual.toLocaleString("pt-BR")}
          <Text style={styles.meta}>
            /{meta.toLocaleString("pt-BR")} {unidade}
          </Text>
        </Text>
      </View>
      <View style={styles.trilha}>
        <Animated.View
          style={[
            styles.preenchimento,
            {
              backgroundColor: cor,
              width: progresso.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", `${fracao * 100}%`],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { gap: 6 },
  linhaTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  rotulo: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  valor: { fontSize: 12, fontWeight: "700", color: colors.textPrimary },
  meta: { fontSize: 11, fontWeight: "400", color: colors.textSecondary },
  trilha: { height: 6, borderRadius: 3, backgroundColor: grafico.trilha, overflow: "hidden" },
  preenchimento: { height: "100%", borderRadius: 3 },
});
