import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";


type Tipo = "sucesso" | "erro";
type Opcoes = { atraso?: number; duracao?: number };
type Aviso = { tipo: Tipo; titulo: string; detalhe?: string };

type Api = {
  /** Cartão de confirmação com o check animado (estilo "SweetAlert"). */
  sucesso: (titulo: string, detalhe?: string, opcoes?: Opcoes) => void;
  erro: (titulo: string, detalhe?: string, opcoes?: Opcoes) => void;
};

const Contexto = createContext<Api>({ sucesso: () => {}, erro: () => {} });
export const useFeedback = () => useContext(Contexto);

const CirculoAnimado = Animated.createAnimatedComponent(Circle);
const CaminhoAnimado = Animated.createAnimatedComponent(Path);

const TAMANHO = 84;
const COMPRIMENTO_CHECK = 52;

const visualDe = (colors: Cores): Record<Tipo, { cor: string; fundo: string; caminho: string; comprimento: number }> => ({
  sucesso: { cor: "#1BAF7A", fundo: colors.sucessoFundo, caminho: "M26 43 L37 54 L58 31", comprimento: COMPRIMENTO_CHECK },
  erro: { cor: "#E0524A", fundo: colors.erroFundo, caminho: "M30 30 L54 54 M54 30 L30 54", comprimento: 70 },
});

/**
 * Provedor do aviso de confirmação. Fica na raiz do app, por cima de todas as
 * telas e da navegação: dá para chamar `sucesso(...)` e voltar de tela logo em
 * seguida, que o aviso continua aparecendo.
 */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const fundo = useRef(new Animated.Value(0)).current;
  const cartao = useRef(new Animated.Value(0)).current;
  const anel = useRef(new Animated.Value(0)).current;
  const marca = useRef(new Animated.Value(0)).current;
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fechar = useCallback(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    Animated.parallel([
      Animated.timing(fundo, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(cartao, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => finished && setAviso(null));
  }, [fundo, cartao]);

  const mostrar = useCallback(
    (tipo: Tipo, titulo: string, detalhe?: string, opcoes: Opcoes = {}) => {
      if (temporizador.current) clearTimeout(temporizador.current);
      if (espera.current) clearTimeout(espera.current);

      espera.current = setTimeout(() => {
        fundo.setValue(0); cartao.setValue(0); anel.setValue(0); marca.setValue(0);
        setAviso({ tipo, titulo, detalhe });

        Animated.parallel([
          Animated.timing(fundo, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(cartao, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(120),
            Animated.timing(anel, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
            Animated.timing(marca, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
          ]),
        ]).start();

        temporizador.current = setTimeout(fechar, opcoes.duracao ?? 1900);
      }, opcoes.atraso ?? 0);
    },
    [fundo, cartao, anel, marca, fechar],
  );

  const api = useMemo<Api>(
    () => ({
      sucesso: (t, d, o) => mostrar("sucesso", t, d, o),
      erro: (t, d, o) => mostrar("erro", t, d, { duracao: 2800, ...o }),
    }),
    [mostrar],
  );

  const visual = aviso ? visualDe(colors)[aviso.tipo] : visualDe(colors).sucesso;
  const raio = 38;
  const circunferencia = 2 * Math.PI * raio;

  return (
    <Contexto.Provider value={api}>
      <View style={{ flex: 1 }}>
        {children}
        {aviso && (
          <Animated.View style={[styles.fundo, { opacity: fundo }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={fechar} accessibilityLabel="Fechar aviso" />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.cartao,
                {
                  opacity: cartao,
                  transform: [{ scale: cartao.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                },
              ]}
            >
              <View style={[styles.selo, { backgroundColor: visual.fundo }]}>
                <Svg width={TAMANHO} height={TAMANHO} viewBox="0 0 84 84" style={{ transform: [{ rotate: "-90deg" }] }}>
                  <CirculoAnimado
                    cx={42}
                    cy={42}
                    r={raio}
                    stroke={visual.cor}
                    strokeWidth={5}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${circunferencia} ${circunferencia}`}
                    strokeDashoffset={anel.interpolate({ inputRange: [0, 1], outputRange: [circunferencia, 0] })}
                  />
                </Svg>
                {/* A marca (check ou X) fica noutra camada, sem a rotação do anel. */}
                <Svg width={TAMANHO} height={TAMANHO} viewBox="0 0 84 84" style={StyleSheet.absoluteFill}>
                  <CaminhoAnimado
                    d={visual.caminho}
                    stroke={visual.cor}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={`${visual.comprimento} ${visual.comprimento}`}
                    strokeDashoffset={marca.interpolate({ inputRange: [0, 1], outputRange: [visual.comprimento, 0] })}
                  />
                </Svg>
              </View>
              <Text style={styles.titulo}>{aviso.titulo}</Text>
              {!!aviso.detalhe && <Text style={styles.detalhe}>{aviso.detalhe}</Text>}
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </Contexto.Provider>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  fundo: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: "rgba(20, 30, 24, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    elevation: 1000,
  },
  cartao: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 26,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  selo: { width: TAMANHO + 12, height: TAMANHO + 12, borderRadius: (TAMANHO + 12) / 2, alignItems: "center", justifyContent: "center" },
  titulo: { fontSize: 20, fontWeight: "800", color: colors.textPrimary, marginTop: 18, textAlign: "center" },
  detalhe: { fontSize: 14, color: colors.textSecondary, marginTop: 6, textAlign: "center", lineHeight: 20 },
});
