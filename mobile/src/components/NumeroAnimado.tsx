import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, TextProps } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

type Props = TextProps & {
  valor: number;
  /** Espera antes de começar (para combinar com a transição de tela). */
  atraso?: number;
  duracao?: number;
};

/**
 * Número que "conta" de 0 até o valor, toda vez que a tela ganha foco e
 * sempre que o valor muda. Pode ser usado dentro de outro <Text>.
 */
export default function NumeroAnimado({ valor, atraso = 0, duracao = 900, ...resto }: Props) {
  const v = useRef(new Animated.Value(0)).current;
  const alvo = useRef(valor);
  const [exibido, setExibido] = useState(0);

  useEffect(() => {
    const id = v.addListener(({ value }) => setExibido(Math.round(value)));
    return () => v.removeListener(id);
  }, [v]);

  const ir = useCallback(
    (de0: boolean, espera: number) => {
      if (de0) v.setValue(0);
      Animated.timing(v, {
        toValue: alvo.current,
        duration: duracao,
        delay: espera,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [v, duracao],
  );

  // Volta a contar do zero sempre que a tela aparece.
  useFocusEffect(
    useCallback(() => {
      ir(true, atraso);
    }, [ir, atraso]),
  );

  // Valor mudou com a tela já aberta (dados chegaram): continua de onde está.
  useEffect(() => {
    alvo.current = valor;
    ir(false, 0);
  }, [valor, ir]);

  return <Text {...resto}>{exibido.toLocaleString("pt-BR")}</Text>;
}
