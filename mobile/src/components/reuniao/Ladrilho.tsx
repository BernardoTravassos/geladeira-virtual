import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { HUD } from "./hud";

const iniciais = (nome?: string) => (nome ?? "?").replace(/^(Dra?\.?)\s+/i, "").split(" ").filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join("") || "?";

/**
 * Um quadro da chamada, no estilo do Discord: cada pessoa ganha o seu, com o
 * vídeo (ou o avatar, se a câmera estiver desligada), o nome, o ícone de mudo e
 * um anel verde que acende quando ela fala.
 */
export default function Ladrilho({ VideoTrack, videoRef, nome, voce, mudo, falando, espelhar, aguardando, compacto }: {
  VideoTrack: any; videoRef?: any; nome: string; voce?: boolean; mudo?: boolean; falando?: boolean; espelhar?: boolean; aguardando?: boolean; compacto?: boolean;
}) {
  const brilho = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(brilho, { toValue: falando ? 1 : 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [falando, brilho]);

  return (
    <Animated.View
      style={[
        s.ladrilho,
        {
          borderColor: brilho.interpolate({ inputRange: [0, 1], outputRange: ["rgba(74,222,128,0.18)", HUD.verde] }),
          shadowColor: HUD.verde,
          shadowOpacity: brilho.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] }) as any,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      {videoRef ? (
        <VideoTrack trackRef={videoRef} style={StyleSheet.absoluteFill as any} objectFit="cover" mirror={espelhar} zOrder={voce ? 1 : 0} />
      ) : (
        <LinearGradient colors={aguardando ? ["#0E2219", "#08140F"] : ["#1F5D3A", "#0B1F17"]} style={[StyleSheet.absoluteFill, s.centro]}>
          {aguardando ? (
            <>
              <ActivityIndicator color={HUD.verde} />
              {!compacto && <Text style={s.aguardando}>Aguardando {nome.split(" ")[0]}…</Text>}
            </>
          ) : (
            <View style={[s.avatar, compacto && { width: 52, height: 52, borderRadius: 26 }]}>
              <Text style={[s.iniciais, compacto && { fontSize: 18 }]}>{iniciais(nome)}</Text>
            </View>
          )}
        </LinearGradient>
      )}
      <View style={s.rotulo}>
        {mudo && <Feather name="mic-off" size={12} color={HUD.rosa} />}
        <Text style={s.nome} numberOfLines={1}>{voce ? "Você" : nome}</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  ladrilho: { flex: 1, borderRadius: 20, overflow: "hidden", backgroundColor: "#0A1812", borderWidth: 2 },
  centro: { alignItems: "center", justifyContent: "center", gap: 10 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  iniciais: { fontSize: 26, fontWeight: "800", color: "#fff" },
  aguardando: { color: HUD.suave, fontSize: 13 },
  rotulo: { position: "absolute", left: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "80%", backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  nome: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
