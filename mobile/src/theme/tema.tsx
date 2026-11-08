import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StatusBar, StyleSheet, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Cores, coresClaras, coresEscuras } from "./colors";

export type ModoTema = "sistema" | "claro" | "escuro";

type Tema = {
  cores: Cores;
  escuro: boolean;
  modo: ModoTema;
  definirModo: (modo: ModoTema) => void;
};

const CHAVE = "@geladeira:tema";

const Contexto = createContext<Tema>({ cores: coresClaras, escuro: false, modo: "sistema", definirModo: () => {} });

export const useTema = () => useContext(Contexto);
/** Paleta do modo atual (claro ou escuro). */
export const useCores = () => useContext(Contexto).cores;

/**
 * Guarda a escolha da pessoa (automático, claro ou escuro) e entrega a paleta.
 * "Automático" acompanha o modo do celular em tempo real. Não renderiza nada
 * até ler a escolha salva, para não piscar o tema errado ao abrir o app.
 */
export function TemaProvider({ children }: { children: React.ReactNode }) {
  const sistema = useColorScheme();
  const [modo, setModo] = useState<ModoTema>("sistema");
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((v) => { if (v === "claro" || v === "escuro" || v === "sistema") setModo(v); })
      .catch(() => {})
      .finally(() => setPronto(true));
  }, []);

  const definirModo = useCallback((novo: ModoTema) => {
    setModo(novo);
    AsyncStorage.setItem(CHAVE, novo).catch(() => {});
  }, []);

  // `alvo` é o que a pessoa (ou o celular) pediu; `escuro` é o que está na tela.
  // Entre os dois há uma transição: a tela escurece/clareia até a cor do novo
  // fundo, o tema troca por baixo, e a cortina se dissolve revelando o novo visual.
  const alvo = modo === "escuro" || (modo === "sistema" && sistema === "dark");
  const [escuro, setEscuro] = useState(alvo);
  const [corCortina, setCorCortina] = useState(alvo ? coresEscuras.background : coresClaras.background);
  const cortina = useRef(new Animated.Value(0)).current;
  const primeira = useRef(true);

  useEffect(() => {
    if (!pronto) return;
    if (primeira.current) {
      primeira.current = false;
      setEscuro(alvo); // abertura do app: sem animação
      return;
    }
    if (alvo === escuro) return;

    setCorCortina(alvo ? coresEscuras.background : coresClaras.background);
    cortina.stopAnimation();
    Animated.timing(cortina, { toValue: 1, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setEscuro(alvo);
      // espera a tela redesenhar no novo tema antes de dissolver a cortina
      setTimeout(() => {
        Animated.timing(cortina, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
      }, 60);
    });
  }, [alvo, pronto]); // eslint-disable-line react-hooks/exhaustive-deps

  const valor = useMemo<Tema>(
    () => ({ cores: escuro ? coresEscuras : coresClaras, escuro, modo, definirModo }),
    [escuro, modo, definirModo],
  );

  if (!pronto) return null;

  return (
    <Contexto.Provider value={valor}>
      <StatusBar barStyle={escuro ? "light-content" : "dark-content"} />
      {children}
      {/* Cortina da transição entre claro e escuro (não bloqueia toques) */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill as object, { backgroundColor: corCortina, opacity: cortina, zIndex: 2000, elevation: 2000 }]}
      />
    </Contexto.Provider>
  );
}
