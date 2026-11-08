import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useCallback, useEffect, useRef, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Animated, Easing, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

const CirculoAnimado = Animated.createAnimatedComponent(Circle);

type Props = {
  tamanho: number;
  espessura?: number;
  /** 0 a 1. */
  progresso: number;
  cor: string;
  trilha?: string;
  /** Espera antes de começar a se desenhar (combina com a transição de tela). */
  atraso?: number;
  children?: React.ReactNode; // conteúdo no centro do anel
};

/** Anel de progresso que se desenha sozinho, no sentido horário a partir do topo. */
export default function AnelProgresso({ tamanho, espessura = 12, progresso, cor, trilha = "rgba(255,255,255,0.18)", atraso = 0, children }: Props) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const valor = useRef(new Animated.Value(0)).current;

  const alvo = useRef(Math.min(Math.max(progresso, 0), 1));

  const desenhar = useCallback(
    (do0: boolean, espera: number) => {
      if (do0) valor.setValue(0);
      Animated.timing(valor, {
        toValue: alvo.current,
        duration: 900,
        delay: espera,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // strokeDashoffset não roda no driver nativo
      }).start();
    },
    [valor],
  );

  // O anel se desenha do zero toda vez que a tela aparece...
  useFocusEffect(useCallback(() => { desenhar(true, atraso); }, [desenhar, atraso]));

  // ...e acompanha o valor se ele mudar com a tela já aberta.
  useEffect(() => {
    alvo.current = Math.min(Math.max(progresso, 0), 1);
    desenhar(false, 0);
  }, [progresso, desenhar]);

  return (
    <View style={{ width: tamanho, height: tamanho }}>
      <Svg width={tamanho} height={tamanho} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={tamanho / 2} cy={tamanho / 2} r={raio} stroke={trilha} strokeWidth={espessura} fill="none" />
        <CirculoAnimado
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={cor}
          strokeWidth={espessura}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circunferencia} ${circunferencia}`}
          strokeDashoffset={valor.interpolate({ inputRange: [0, 1], outputRange: [circunferencia, 0] })}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.centro]}>{children}</View>
    </View>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({ centro: { alignItems: "center", justifyContent: "center" } });
