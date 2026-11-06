import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, degrade } from "../theme/colors";

export type AbaAtiva = "Home" | "Treino" | "Historico" | "Perfil";

type Props = {
  ativa: AbaAtiva;
  /** Toque no botão da câmera. Fora da Home, o padrão é voltar à Home já pedindo a câmera. */
  onCamera?: () => void;
};

const ITENS: { chave: AbaAtiva; rotulo: string; lado: "esq" | "dir" }[] = [
  { chave: "Home", rotulo: "Início", lado: "esq" },
  { chave: "Treino", rotulo: "Treino", lado: "esq" },
  { chave: "Historico", rotulo: "Histórico", lado: "dir" },
  { chave: "Perfil", rotulo: "Perfil", lado: "dir" },
];

function Icone({ chave, cor }: { chave: AbaAtiva; cor: string }) {
  if (chave === "Treino") return <MaterialCommunityIcons name="dumbbell" size={22} color={cor} />;
  const nome = chave === "Home" ? "home" : chave === "Historico" ? "bar-chart-2" : "user";
  return <Feather name={nome} size={21} color={cor} />;
}

/**
 * Barra inferior flutuante: uma "pílula" branca solta da borda, com as quatro
 * áreas do app e o botão da câmera em destaque no meio (degradê laranja, anel
 * e um pulso suave que chama a atenção para a ação principal).
 */
export default function BarraInferior({ ativa, onCamera }: Props) {
  const navegacao = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const pulso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const laco = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    laco.start();
    return () => laco.stop();
  }, [pulso]);

  function ir(chave: AbaAtiva) {
    if (chave === ativa) return;
    if (chave === "Historico") navegacao.navigate("Historico", { periodo: "semana" });
    else navegacao.navigate(chave);
  }

  function camera() {
    if (onCamera) onCamera();
    else navegacao.navigate("Home", { camera: Date.now() });
  }

  const aba = (item: (typeof ITENS)[number]) => {
    const ligada = item.chave === ativa;
    const cor = ligada ? colors.primary : colors.textSecondary;
    return (
      <TouchableOpacity
        key={item.chave}
        style={styles.aba}
        activeOpacity={0.7}
        onPress={() => ir(item.chave)}
        accessibilityRole="tab"
        accessibilityState={{ selected: ligada }}
        accessibilityLabel={item.rotulo}
      >
        <View style={[styles.bolha, ligada && styles.bolhaLigada]}>
          <Icone chave={item.chave} cor={cor} />
        </View>
        <Text style={[styles.rotulo, ligada && styles.rotuloLigado]}>{item.rotulo}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.area, { bottom: 10 + insets.bottom }]}>
      <View style={styles.barra}>
        <View style={styles.lado}>{ITENS.filter((i) => i.lado === "esq").map(aba)}</View>
        <View style={styles.vao} />
        <View style={styles.lado}>{ITENS.filter((i) => i.lado === "dir").map(aba)}</View>
      </View>

      <Animated.View
        style={[
          styles.fabCaixa,
          { transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }] },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity activeOpacity={0.85} onPress={camera} accessibilityRole="button" accessibilityLabel="Tirar foto da geladeira">
          <LinearGradient colors={degrade.acento} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
            <Feather name="camera" size={26} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { position: "absolute", left: 14, right: 14, alignItems: "center" },
  barra: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 70,
    backgroundColor: colors.surface,
    borderRadius: 30,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#1F5D3A",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  lado: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  vao: { width: 78 },
  aba: { alignItems: "center", gap: 2, minWidth: 56, paddingVertical: 4 },
  bolha: { width: 44, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  bolhaLigada: { backgroundColor: "#E3F0E6" },
  rotulo: { fontSize: 10, fontWeight: "600", color: colors.textSecondary },
  rotuloLigado: { color: colors.primary, fontWeight: "800" },
  fabCaixa: { position: "absolute", top: -26, alignItems: "center", justifyContent: "center" },
  fab: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: colors.background,
    shadowColor: "#F2622B",
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
