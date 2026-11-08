import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { forwardRef, useImperativeHandle, useRef, useState, useMemo } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

import Logo from "./Logo";

export type TransicaoLogoRef = { tocar: () => void };

const TAMANHO = 132;
const ENTRAR = 150; // o verde cobre a tela
const SEGURAR = 330; // o símbolo aparece
const SAIR = 280; // revela a tela nova

/**
 * Cortina verde com o símbolo do app, que passa por cima ao trocar de tela.
 *
 * Ordem: o verde cobre a tela → a geladeira surge com um "pop" → a folha brota
 * com um balanço → tudo some revelando a tela nova. Dura ~0,75 s. Enquanto
 * está visível ela segura os toques, para ninguém apertar um botão no meio.
 *
 * Só usa opacity/transform (driver nativo): a animação continua fluida mesmo
 * que o JS esteja ocupado montando a próxima tela.
 */
const TransicaoLogo = forwardRef<TransicaoLogoRef>(function TransicaoLogo(_, ref) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [ativa, setAtiva] = useState(false);
  const fundo = useRef(new Animated.Value(0)).current;
  const corpo = useRef(new Animated.Value(0)).current;
  const folha = useRef(new Animated.Value(0)).current;
  const execucao = useRef<Animated.CompositeAnimation | null>(null);

  useImperativeHandle(ref, () => ({
    tocar() {
      execucao.current?.stop();
      fundo.setValue(0);
      corpo.setValue(0);
      folha.setValue(0);
      setAtiva(true);

      execucao.current = Animated.parallel([
        Animated.sequence([
          Animated.timing(fundo, { toValue: 1, duration: ENTRAR, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.delay(SEGURAR),
          Animated.timing(fundo, { toValue: 0, duration: SAIR, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(ENTRAR * 0.5),
          Animated.spring(corpo, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(ENTRAR * 0.5 + 140),
          Animated.spring(folha, { toValue: 1, friction: 4, tension: 110, useNativeDriver: true }),
        ]),
      ]);
      execucao.current.start(({ finished }) => {
        if (finished) setAtiva(false);
      });
    },
  }));

  if (!ativa) return null;

  return (
    <Animated.View style={[styles.cortina, { opacity: fundo }]} pointerEvents="auto">
      <Animated.View
        style={{
          width: TAMANHO,
          height: TAMANHO,
          transform: [
            { scale: corpo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
          ],
          opacity: corpo.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: "clamp" }),
        }}
      >
        <Logo tamanho={TAMANHO} parte="corpo" />
        {/* A folha nasce na ponta de cima da geladeira e balança até assentar. */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: folha.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: "clamp" }),
              transform: [
                { translateY: folha.interpolate({ inputRange: [0, 1], outputRange: [TAMANHO * 0.12, 0] }) },
                { scale: folha.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
                { rotate: folha.interpolate({ inputRange: [0, 1], outputRange: ["-35deg", "0deg"] }) },
              ],
            },
          ]}
        >
          <Logo tamanho={TAMANHO} parte="folha" />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
});

export default TransicaoLogo;

const criarStyles = (colors: Cores) => StyleSheet.create({
  cortina: {
    ...StyleSheet.absoluteFill as object,
    backgroundColor: "#1F5D3A", // verde da marca, igual nos dois modos
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    elevation: 999,
  },
});
