import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

type Props = {
  atual: number;
  meta: number;
  atraso?: number;
};

/**
 * Barra de macro do cabeçalho verde. Enche da esquerda a cada vez que a tela
 * aparece. Passou da meta: a parte até a meta fica verde-menta e o excesso,
 * vermelho claro.
 */
export default function BarraHero({ atual, meta, atraso = 0 }: Props) {
  const progresso = useRef(new Animated.Value(0)).current;
  const passou = meta > 0 && atual > meta;
  const fracaoNormal = meta > 0 ? (passou ? meta / atual : Math.min(atual / meta, 1)) : 0;
  const fracaoExcesso = passou ? 1 - meta / atual : 0;

  const rodar = useCallback(
    (do0: boolean, espera: number) => {
      if (do0) progresso.setValue(0);
      Animated.timing(progresso, { toValue: 1, duration: 800, delay: espera, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    },
    [progresso],
  );

  useFocusEffect(useCallback(() => { rodar(true, atraso); }, [rodar, atraso]));
  // Os dados chegaram depois da tela abrir: refaz o preenchimento.
  useEffect(() => { rodar(true, 0); }, [atual, meta, rodar]);

  return (
    <View style={styles.trilha}>
      <Animated.View
        style={[
          styles.menta,
          passou && styles.semBorda,
          { width: progresso.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${fracaoNormal * 100}%`] }) },
        ]}
      />
      {passou && (
        <Animated.View
          style={[styles.excesso, { width: progresso.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${fracaoExcesso * 100}%`] }) }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trilha: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", flexDirection: "row" },
  menta: { height: "100%", borderRadius: 3, backgroundColor: "#7EE0B5" },
  semBorda: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  excesso: { height: "100%", backgroundColor: "#FF9A9A" },
});
