import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, sombra, degrade } from "../theme/colors";
import { receitaPorId } from "../mocks/receitas";

export default function ReceitaScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const receita = receitaPorId(route.params?.id);
  const [marcados, setMarcados] = useState<number[]>([]);

  if (!receita) {
    return (
      <View style={[styles.tela, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={styles.vazio}>Receita não encontrada.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.link}>Voltar</Text></TouchableOpacity>
      </View>
    );
  }

  const alternar = (i: number) => setMarcados((a) => (a.includes(i) ? a.filter((x) => x !== i) : [...a, i]));

  return (
    <View style={styles.tela}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={degrade.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.decoracao} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar} accessibilityLabel="Voltar">
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.selo}>
            <Feather name={receita.icone} size={28} color="#fff" />
          </View>
          <Text style={styles.titulo}>{receita.titulo}</Text>
          <Text style={styles.quando}>Consulta de {receita.quando.toLowerCase()}</Text>

          <View style={styles.chips}>
            <Chip icone="clock" texto={`${receita.tempoMin} min`} />
            <Chip icone="users" texto={`${receita.porcoes} ${receita.porcoes === 1 ? "porção" : "porções"}`} />
            <Chip icone="bar-chart" texto={receita.dificuldade} />
          </View>
        </LinearGradient>

        <View style={styles.corpo}>
          <View style={[styles.card, styles.nutri]}>
            <Nutri valor={`${receita.calorias}`} rotulo="kcal" destaque />
            <Nutri valor={`${receita.proteina} g`} rotulo="proteína" />
            <Nutri valor={`${receita.carbo} g`} rotulo="carboidrato" />
            <Nutri valor={`${receita.gordura} g`} rotulo="gordura" />
          </View>
          <Text style={styles.nota}>Valores aproximados, por porção.</Text>

          <View style={styles.geladeira}>
            <Feather name="camera" size={16} color={colors.primary} />
            <Text style={styles.geladeiraTxt}>
              <Text style={{ fontWeight: "700" }}>Da sua geladeira: </Text>
              {receita.geladeira}
            </Text>
          </View>

          <Text style={styles.secao}>Ingredientes</Text>
          <View style={styles.card}>
            {receita.ingredientes.map((ing, i) => {
              const feito = marcados.includes(i);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.linha, i < receita.ingredientes.length - 1 && styles.divisor]}
                  onPress={() => alternar(i)}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: feito }}
                >
                  <View style={[styles.caixa, feito && styles.caixaMarcada]}>
                    {feito && <Feather name="check" size={13} color="#fff" />}
                  </View>
                  <Text style={[styles.ingrediente, feito && styles.ingredienteFeito]}>{ing}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.nota}>Toque para marcar o que você já separou.</Text>

          <Text style={styles.secao}>Modo de preparo</Text>
          <View style={styles.card}>
            {receita.passos.map((p, i) => (
              <View key={i} style={[styles.passo, i < receita.passos.length - 1 && styles.divisor]}>
                <View style={styles.numero}><Text style={styles.numeroTxt}>{i + 1}</Text></View>
                <Text style={styles.passoTxt}>{p}</Text>
              </View>
            ))}
          </View>

          {!!receita.dica && (
            <View style={styles.dica}>
              <Feather name="star" size={16} color="#6B4500" />
              <Text style={styles.dicaTxt}><Text style={{ fontWeight: "800" }}>Dica: </Text>{receita.dica}</Text>
            </View>
          )}
          <Text style={styles.aviso}>Receita de exemplo, para demonstração.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Chip({ icone, texto }: { icone: keyof typeof Feather.glyphMap; texto: string }) {
  return (
    <View style={styles.chip}>
      <Feather name={icone} size={13} color="#fff" />
      <Text style={styles.chipTxt}>{texto}</Text>
    </View>
  );
}

function Nutri({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <View style={styles.nutriItem}>
      <Text style={[styles.nutriValor, destaque && { color: colors.accent }]}>{valor}</Text>
      <Text style={styles.nutriRotulo}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.background },
  hero: { paddingTop: 54, paddingBottom: 26, paddingHorizontal: 22, alignItems: "center", borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: "hidden" },
  decoracao: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)", top: -70, right: -60 },
  voltar: { position: "absolute", left: 20, top: 54, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  selo: { width: 64, height: 64, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", marginTop: 10 },
  titulo: { fontSize: 24, fontWeight: "800", color: "#fff", textAlign: "center", marginTop: 14 },
  quando: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  chips: { flexDirection: "row", gap: 8, marginTop: 16 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.16)" },
  chipTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
  corpo: { padding: 20, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, ...sombra },
  nutri: { flexDirection: "row", paddingVertical: 16 },
  nutriItem: { flex: 1, alignItems: "center" },
  nutriValor: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  nutriRotulo: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  nota: { fontSize: 11, color: colors.textSecondary, marginTop: -4 },
  geladeira: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "#EAF3E4", borderRadius: 14, padding: 12 },
  geladeiraTxt: { flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  secao: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, marginTop: 8 },
  linha: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  divisor: { borderBottomWidth: 1, borderBottomColor: colors.border },
  caixa: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  caixaMarcada: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  ingrediente: { flex: 1, fontSize: 15, color: colors.textPrimary },
  ingredienteFeito: { color: colors.textSecondary, textDecorationLine: "line-through" },
  passo: { flexDirection: "row", gap: 12, paddingVertical: 14 },
  numero: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 1 },
  numeroTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },
  passoTxt: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.textPrimary },
  dica: { flexDirection: "row", gap: 10, backgroundColor: "#FFF4DC", borderRadius: 14, padding: 14, alignItems: "flex-start" },
  dicaTxt: { flex: 1, fontSize: 13, lineHeight: 19, color: "#6B4500" },
  aviso: { textAlign: "center", fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  vazio: { fontSize: 15, color: colors.textSecondary, marginBottom: 12 },
  link: { color: colors.primary, fontWeight: "700" },
});
