import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import AnelProgresso from "../AnelProgresso";

/** Visual "HUD" da reunião: vidro escuro, brilho verde/ciano e números grandes. */
export const HUD = {
  vidro: "rgba(8,24,18,0.74)",
  vidroForte: "rgba(6,18,14,0.92)",
  borda: "rgba(74,222,128,0.28)",
  verde: "#4ADE80",
  ciano: "#22D3EE",
  ambar: "#F5B942",
  rosa: "#FB7185",
  texto: "#E8FFF3",
  suave: "rgba(232,255,243,0.62)",
  trilha: "rgba(255,255,255,0.12)",
};

export function Vidro({ children, style, brilho }: { children: React.ReactNode; style?: ViewStyle; brilho?: string }) {
  return <View style={[s.vidro, brilho ? { borderColor: brilho, shadowColor: brilho, shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 8 } : null, style]}>{children}</View>;
}

/** Borda que pulsa: usada para chamar a atenção para o que foi destacado. */
export function Pulso({ children, cor = HUD.ciano, style }: { children: React.ReactNode; cor?: string; style?: ViewStyle }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]));
    a.start();
    return () => a.stop();
  }, [v]);
  return (
    <Animated.View style={[s.vidro, { borderColor: cor, borderWidth: 1.5, shadowColor: cor, shadowOpacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.85] }) as any, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 10 }, style]}>
      {children}
    </Animated.View>
  );
}

export function Medidor({ icone, rotulo, valor, un, meta, cor, tamanho = 84, destaque }: { icone: any; rotulo: string; valor: string; un?: string; meta?: string; cor: string; tamanho?: number; destaque?: boolean }) {
  const n = parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;
  const m = meta ? parseFloat(meta.replace(/\./g, "").replace(",", ".")) || 0 : 0;
  return (
    <View style={{ alignItems: "center", gap: 6, opacity: 1 }}>
      <AnelProgresso tamanho={tamanho} espessura={7} progresso={m > 0 ? Math.min(n / m, 1) : 0} cor={cor} trilha={HUD.trilha}>
        <Feather name={icone} size={tamanho * 0.22} color={cor} />
        <Text style={[s.valor, { fontSize: tamanho * 0.2 }]}>{valor}</Text>
      </AnelProgresso>
      <Text style={[s.rotulo, destaque && { color: cor }]}>{rotulo}</Text>
      {!!meta && <Text style={s.meta}>de {meta}{un ? ` ${un}` : ""}</Text>}
    </View>
  );
}

export function Barra({ rotulo, atual, meta, cor, un = "g" }: { rotulo: string; atual: number; meta: number; cor: string; un?: string }) {
  const p = meta > 0 ? Math.min(atual / meta, 1) : 0;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={s.barraRot}>{rotulo}</Text>
        <Text style={s.barraVal}>{atual}<Text style={{ color: HUD.suave }}> / {meta} {un}</Text></Text>
      </View>
      <View style={s.barraFundo}><View style={[s.barraDentro, { width: `${p * 100}%`, backgroundColor: cor, shadowColor: cor }]} /></View>
    </View>
  );
}

export function Chip({ icone, texto, cor, onPress, ativo }: { icone: any; texto: string; cor: string; onPress?: () => void; ativo?: boolean }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={!onPress} style={[s.chip, ativo && { borderColor: cor, backgroundColor: "rgba(74,222,128,0.14)" }]}>
      <Feather name={icone} size={13} color={cor} />
      <Text style={s.chipTxt}>{texto}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  vidro: { backgroundColor: HUD.vidro, borderRadius: 18, borderWidth: 1, borderColor: HUD.borda, padding: 12 },
  valor: { color: HUD.texto, fontWeight: "800", marginTop: 1 },
  rotulo: { color: HUD.texto, fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  meta: { color: HUD.suave, fontSize: 11, marginTop: -3 },
  barraRot: { color: HUD.suave, fontSize: 12, fontWeight: "600" },
  barraVal: { color: HUD.texto, fontSize: 12, fontWeight: "800" },
  barraFundo: { height: 6, borderRadius: 3, backgroundColor: HUD.trilha, overflow: "hidden" },
  barraDentro: { height: 6, borderRadius: 3, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, backgroundColor: HUD.vidro, borderWidth: 1, borderColor: HUD.borda },
  chipTxt: { color: HUD.texto, fontSize: 12, fontWeight: "700" },
});
