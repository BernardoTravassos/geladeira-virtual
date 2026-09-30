import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export default function HomeScreen() {
  const caloriasConsumidas = 1240;
  const metaCalorias = 1800;
  const progresso = Math.min(caloriasConsumidas / metaCalorias, 1);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingSmall}>Boa tarde</Text>
            <Text style={styles.greetingName}>Oi, Bernardo</Text>
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Feather name="bell" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.ctaCard} activeOpacity={0.85}>
          <View style={styles.ctaIcon}>
            <Feather name="camera" size={20} color={colors.background} />
          </View>
          <View>
            <Text style={styles.ctaTitle}>Tirar foto da geladeira</Text>
            <Text style={styles.ctaSubtitle}>Gere seu cardápio agora</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={[styles.card, styles.calorieCard]}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progresso * 100}%` }]} />
            </View>
            <Text style={styles.calorieValue}>{caloriasConsumidas} kcal</Text>
            <Text style={styles.calorieGoal}>meta {metaCalorias}</Text>
          </View>

          <View style={[styles.card, styles.mealCard]}>
            <Text style={styles.mealLabel}>Cardápio de hoje</Text>
            <Text style={styles.mealName}>Frango grelhado com legumes</Text>
            <View style={styles.mealLink}>
              <Text style={styles.mealLinkText}>Ver receita</Text>
              <Feather name="chevron-right" size={12} color={colors.primary} />
            </View>
          </View>
        </View>

        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickItem}>
            <Feather name="clock" size={16} color={colors.textSecondary} />
            <Text style={styles.quickLabel}>Histórico</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickItem}>
            <Feather name="heart" size={16} color={colors.textSecondary} />
            <Text style={styles.quickLabel}>Favoritos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickItem}>
            <Feather name="user" size={16} color={colors.textSecondary} />
            <Text style={styles.quickLabel}>Perfil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <Feather name="home" size={20} color={colors.primary} />
        <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
          <Feather name="camera" size={18} color={colors.background} />
        </TouchableOpacity>
        <Feather name="user" size={20} color={colors.textSecondary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 100, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greetingSmall: { fontSize: 12, color: colors.textSecondary },
  greetingName: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginTop: 2 },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF3E4",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ctaIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTitle: { color: colors.background, fontWeight: "600", fontSize: 14 },
  ctaSubtitle: { color: "#CFE6D8", fontSize: 12, marginTop: 2 },
  row: { flexDirection: "row", gap: 10 },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  calorieCard: { alignItems: "center", justifyContent: "center" },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
  calorieValue: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginTop: 10 },
  calorieGoal: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  mealCard: { justifyContent: "center" },
  mealLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: "600", marginBottom: 6 },
  mealName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  mealLink: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  mealLinkText: { fontSize: 11, color: colors.primary, fontWeight: "600" },
  quickRow: { flexDirection: "row", gap: 8 },
  quickItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  quickLabel: { fontSize: 10, color: colors.textSecondary },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 10,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
    borderWidth: 4,
    borderColor: colors.background,
  },
});
