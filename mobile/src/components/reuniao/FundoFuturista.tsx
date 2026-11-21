import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from "react-native-svg";

const VERDE = "#4ADE80";
const CIANO = "#22D3EE";

/**
 * Fundo da tela compartilhada: gradiente profundo, brilhos de néon, grade de
 * dados, uma linha de varredura que desce devagar e cantos de HUD.
 */
export default function FundoFuturista() {
  const [t, setT] = useState({ w: 0, h: 0 });
  const varredura = useRef(new Animated.Value(0)).current;
  const respira = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(Animated.timing(varredura, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: true }));
    const b = Animated.loop(Animated.sequence([
      Animated.timing(respira, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(respira, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, [varredura, respira]);

  const aoMedir = (e: LayoutChangeEvent) => setT({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const passo = 26;
  const colunas = Math.ceil(t.w / passo);
  const linhas = Math.ceil(t.h / passo);

  return (
    <View style={StyleSheet.absoluteFill} onLayout={aoMedir} pointerEvents="none">
      <LinearGradient colors={["#020B08", "#04241B", "#03130F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {t.w > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: respira.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }]}>
          <Svg width={t.w} height={t.h}>
            <Defs>
              <RadialGradient id="ciano" cx="85%" cy="8%" rx="70%" ry="45%">
                <Stop offset="0" stopColor={CIANO} stopOpacity="0.30" />
                <Stop offset="1" stopColor={CIANO} stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="verde" cx="10%" cy="95%" rx="75%" ry="50%">
                <Stop offset="0" stopColor={VERDE} stopOpacity="0.26" />
                <Stop offset="1" stopColor={VERDE} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width={t.w} height={t.h} fill="url(#ciano)" />
            <Rect x="0" y="0" width={t.w} height={t.h} fill="url(#verde)" />
            {Array.from({ length: colunas + 1 }, (_, i) => <Line key={`v${i}`} x1={i * passo} y1={0} x2={i * passo} y2={t.h} stroke={VERDE} strokeOpacity={0.06} strokeWidth={1} />)}
            {Array.from({ length: linhas + 1 }, (_, i) => <Line key={`h${i}`} x1={0} y1={i * passo} x2={t.w} y2={i * passo} stroke={VERDE} strokeOpacity={0.06} strokeWidth={1} />)}
          </Svg>
        </Animated.View>
      )}
      {t.h > 0 && (
        <Animated.View style={[styles.varredura, { transform: [{ translateY: varredura.interpolate({ inputRange: [0, 1], outputRange: [-40, t.h] }) }] }]}>
          <LinearGradient colors={["transparent", "rgba(74,222,128,0.22)", "transparent"]} style={{ height: 40 }} />
          <View style={styles.linhaBrilho} />
        </Animated.View>
      )}
      {/* Cantos de HUD */}
      <View style={[styles.canto, { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2 }]} />
      <View style={[styles.canto, { top: 8, right: 8, borderTopWidth: 2, borderRightWidth: 2 }]} />
      <View style={[styles.canto, { bottom: 8, left: 8, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
      <View style={[styles.canto, { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  varredura: { position: "absolute", left: 0, right: 0, top: 0 },
  linhaBrilho: { height: 1, backgroundColor: "rgba(74,222,128,0.55)", shadowColor: VERDE, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  canto: { position: "absolute", width: 18, height: 18, borderColor: "rgba(74,222,128,0.75)" },
});
