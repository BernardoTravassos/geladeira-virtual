import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, sombra } from "../theme/colors";
import { RECEITAS } from "../mocks/receitas";

export default function ReceitasScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.tela}>
      <View style={styles.topo}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar} accessibilityLabel="Voltar">
          <Feather name="arrow-left" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Suas receitas</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: 30 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {RECEITAS.map((r) => (
          <TouchableOpacity key={r.id} style={styles.card} activeOpacity={0.8} onPress={() => navigation.navigate("Receita", { id: r.id })}>
            <View style={styles.icone}><Feather name={r.icone} size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nome}>{r.titulo}</Text>
              <Text style={styles.info}>{r.quando} · {r.tempoMin} min · {r.calorias} kcal</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
        <Text style={styles.aviso}>Receitas de exemplo, para demonstração.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.background },
  topo: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
  voltar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  titulo: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  conteudo: { padding: 20, gap: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, ...sombra },
  icone: { width: 46, height: 46, borderRadius: 15, backgroundColor: "#EAF3E4", alignItems: "center", justifyContent: "center" },
  nome: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  info: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  aviso: { textAlign: "center", fontSize: 11, color: colors.textSecondary, marginTop: 6 },
});
