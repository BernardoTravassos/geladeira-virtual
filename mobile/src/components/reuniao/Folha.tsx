import React, { useEffect, useRef } from "react";
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { HUD } from "./hud";

/** Painel que sobe de baixo por cima do vídeo, com abas e brilho de HUD. */
export default function Folha({ aberta, aoFechar, titulo, abas, aba, aoTrocar, children, bottom }: {
  aberta: boolean; aoFechar: () => void; titulo: string;
  abas?: { chave: string; rotulo: string; icone: any }[]; aba?: string; aoTrocar?: (c: string) => void;
  children: React.ReactNode; bottom: number;
}) {
  const { height } = useWindowDimensions();
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(y, { toValue: aberta ? 1 : 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [aberta, y]);
  const altura = Math.round(height * 0.64);
  return (
    <>
      {aberta && <Pressable style={StyleSheet.absoluteFill} onPress={aoFechar} accessibilityLabel="Fechar painel" />}
      <Animated.View pointerEvents={aberta ? "auto" : "none"} style={[s.folha, { height: altura, bottom, opacity: y, transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [altura, 0] }) }] }]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <LinearGradient colors={["rgba(10,32,24,0.96)", "rgba(5,14,11,0.98)"]} style={s.fundo}>
            <View style={s.puxador} />
            <View style={s.topo}>
              <Feather name="cpu" size={15} color={HUD.verde} />
              <Text style={s.titulo}>{titulo}</Text>
              <TouchableOpacity onPress={aoFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Fechar"><Feather name="chevron-down" size={22} color={HUD.suave} /></TouchableOpacity>
            </View>
            {abas && (
              <View style={s.abas}>
                {abas.map((a) => {
                  const on = a.chave === aba;
                  return (
                    <TouchableOpacity key={a.chave} onPress={() => aoTrocar?.(a.chave)} style={[s.aba, on && s.abaOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                      <Feather name={a.icone} size={14} color={on ? "#04130C" : HUD.suave} />
                      <Text style={[s.abaTxt, on && { color: "#04130C" }]}>{a.rotulo}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <View style={{ flex: 1 }}>{children}</View>
          </LinearGradient>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}

const s = StyleSheet.create({
  folha: { position: "absolute", left: 8, right: 8, borderRadius: 26, overflow: "hidden", borderWidth: 1, borderColor: HUD.borda, shadowColor: HUD.verde, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 0 }, elevation: 18 },
  fundo: { flex: 1, paddingHorizontal: 14, paddingBottom: 12 },
  puxador: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.22)", marginTop: 8 },
  topo: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  titulo: { flex: 1, color: HUD.texto, fontSize: 14, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  abas: { flexDirection: "row", gap: 6, marginBottom: 10 },
  aba: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)" },
  abaOn: { backgroundColor: HUD.verde },
  abaTxt: { color: HUD.suave, fontSize: 12, fontWeight: "800" },
});
