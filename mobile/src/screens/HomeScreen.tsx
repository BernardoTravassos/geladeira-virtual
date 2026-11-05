import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../theme/colors";
import { getProfile, gerarCardapio, ehLimiteAtingido } from "../services/api";
import { calcularMetas, saudacao, PerfilApi } from "../utils/nutricao";
import PaywallCard from "../components/PaywallCard";
import { DEV } from "../config/dev";
import { carregarDia, totaisDoRegistro, RegistroDoDia } from "../utils/refeicoes";

type Refeicao = {
  chave: string;
  nome: string;
  horario: string;
  icone: keyof typeof Feather.glyphMap;
  fracaoDaMeta: number; // quanto da meta diária essa refeição representa
  feita: boolean;
  caloriasConsumidas?: number;
};

// TODO: quando o backend registrar as refeições do dia, isto deve vir da API.
// Por enquanto é dado de exemplo: só o café da manhã aparece como feito.
const refeicoesBase: Refeicao[] = [
  { chave: "cafe", nome: "Café da manhã", horario: "07:30", icone: "coffee", fracaoDaMeta: 0.25, feita: false },
  { chave: "almoco", nome: "Almoço", horario: "12:30", icone: "sun", fracaoDaMeta: 0.35, feita: false },
  { chave: "lanche", nome: "Lanche", horario: "16:00", icone: "zap", fracaoDaMeta: 0.1, feita: false },
  { chave: "jantar", nome: "Jantar", horario: "19:30", icone: "moon", fracaoDaMeta: 0.3, feita: false },
];

// TODO: virá da tabela "consultas". Dado de exemplo por enquanto.
const consultasRecentes = [
  { id: "1", titulo: "Frango grelhado com legumes", quando: "Ontem", calorias: 520 },
  { id: "2", titulo: "Omelete de espinafre", quando: "Anteontem", calorias: 340 },
];

const cardapioGeradoHoje = false; // vira true quando existir uma consulta de hoje
const METAS_COPOS = 8;

export default function HomeScreen({ navigation }: any) {
  const [perfil, setPerfil] = useState<PerfilApi | null>(null);
  const [copos, setCopos] = useState(0);
  const [paywallVisivel, setPaywallVisivel] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [registros, setRegistros] = useState<RegistroDoDia>({});

  // Recarrega ao voltar da tela da refeição, para o card já aparecer como "Feita".
  useFocusEffect(
    useCallback(() => {
      carregarDia().then(setRegistros);
    }, []),
  );

  useEffect(() => {
    getProfile()
      .then(setPerfil)
      .catch(() => {}); // sem rede/API: a tela ainda abre com valores padrão
  }, []);

  async function handleGerarCardapio() {
    // Atalho de desenvolvimento: ver o card sem depender do backend.
    if (DEV.FORCAR_PAYWALL) {
      setPaywallVisivel(true);
      return;
    }

    if (gerando) return;
    setGerando(true);
    try {
      // TODO Fase 4: abrir a câmera, enviar a foto e navegar para o cardápio.
      await gerarCardapio();
    } catch (erro: any) {
      if (ehLimiteAtingido(erro)) {
        setPaywallVisivel(true);
      } else {
        const mensagem =
          erro?.response?.data?.error || "Não foi possível gerar o cardápio agora.";
        Alert.alert("Erro", mensagem);
      }
    } finally {
      setGerando(false);
    }
  }

  function handleAssinar() {
    // TODO: integrar a compra pela loja (Apple/Google). A tabela `assinaturas`
    // só pode ser alterada por webhook servidor-a-servidor — nunca pelo app.
    Alert.alert("Em breve", "A assinatura ainda não está integrada às lojas.");
  }

  async function handleLogout() {
    await AsyncStorage.multiRemove(["@geladeira:token", "@geladeira:wizardDone"]);
    navigation.replace("Login");
  }

  const metas = calcularMetas(perfil);
  const refeicoesDoDia = refeicoesBase.map((r) => {
    const reg = registros[r.chave];
    return reg ? { ...r, feita: true, caloriasConsumidas: totaisDoRegistro(reg).kcal } : r;
  });
  const consumidas = refeicoesDoDia.reduce((soma, r) => soma + (r.caloriasConsumidas || 0), 0);
  const progressoCalorias = Math.min(consumidas / metas.calorias, 1);
  const restantes = Math.max(metas.calorias - consumidas, 0);
  const primeiroNome = perfil?.nome?.trim().split(" ")[0];

  // Macros consumidos estimados na mesma proporção das calorias (até existir registro real).
  const macros = [
    { nome: "Proteína", meta: metas.proteina },
    { nome: "Carboidrato", meta: metas.carboidrato },
    { nome: "Gordura", meta: metas.gordura },
  ].map((m) => ({ ...m, atual: Math.round(m.meta * progressoCalorias) }));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingSmall}>{saudacao()}</Text>
            <Text style={styles.greetingName}>{primeiroNome ? `Oi, ${primeiroNome}` : "Olá"}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.bellButton}>
              <Feather name="bell" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bellButton} onPress={handleLogout}>
              <Feather name="log-out" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.ctaCard} activeOpacity={0.85} onPress={handleGerarCardapio}>
          <View style={styles.ctaIcon}>
            <Feather name="camera" size={20} color={colors.background} />
          </View>
          <View>
            <Text style={styles.ctaTitle}>Tirar foto da geladeira</Text>
            <Text style={styles.ctaSubtitle}>Gere seu cardápio agora</Text>
          </View>
        </TouchableOpacity>

        {/* Calorias + macros */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionLabel}>Hoje</Text>
            <Text style={styles.calorieGoal}>meta {metas.calorias} kcal</Text>
          </View>
          <Text style={styles.calorieValue}>
            {consumidas} <Text style={styles.calorieUnit}>kcal consumidas</Text>
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressoCalorias * 100}%` }]} />
          </View>
          <Text style={styles.calorieRemaining}>Restam {restantes} kcal</Text>

          <View style={styles.macroRow}>
            {macros.map((m) => (
              <View key={m.nome} style={styles.macroItem}>
                <Text style={styles.macroName}>{m.nome}</Text>
                <View style={styles.macroTrack}>
                  <View
                    style={[
                      styles.macroFill,
                      { width: `${m.meta ? Math.min(m.atual / m.meta, 1) * 100 : 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.macroValue}>
                  {m.atual}/{m.meta} g
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cardápio de hoje */}
        {cardapioGeradoHoje ? null : (
          <View style={styles.emptyCard}>
            <Feather name="camera" size={22} color={colors.primary} />
            <Text style={styles.emptyTitle}>Seu cardápio de hoje ainda não foi gerado</Text>
            <Text style={styles.emptyText}>
              Tire uma foto da geladeira e sugerimos refeições com o que você já tem em casa.
            </Text>
          </View>
        )}

        {/* Refeições do dia */}
        <Text style={styles.sectionTitle}>Refeições do dia</Text>
        <View style={styles.card}>
          {refeicoesDoDia.map((r, i) => (
            <TouchableOpacity
              key={r.chave}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Refeicao", { chave: r.chave, nome: r.nome, icone: r.icone })}
              style={[styles.mealRow, i < refeicoesDoDia.length - 1 && styles.mealRowDivider]}
            >
              <View style={styles.mealIcon}>
                <Feather name={r.icone} size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealRowName}>{r.nome}</Text>
                <Text style={styles.mealRowInfo}>
                  {r.feita ? `${r.caloriasConsumidas} kcal registradas` : `${r.horario} · ~${Math.round(metas.calorias * r.fracaoDaMeta)} kcal`}
                </Text>
              </View>
              <View style={[styles.chip, r.feita ? styles.chipDone : styles.chipPending]}>
                <Text style={[styles.chipText, r.feita ? styles.chipTextDone : styles.chipTextPending]}>
                  {r.feita ? "Feita" : "Pendente"}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Hidratação */}
        <View style={[styles.card, styles.waterCard]}>
          <View style={styles.mealIcon}>
            <Feather name="droplet" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mealRowName}>Hidratação</Text>
            <Text style={styles.mealRowInfo}>
              {copos} de {METAS_COPOS} copos
            </Text>
          </View>
          <TouchableOpacity
            style={styles.waterButton}
            onPress={() => setCopos((c) => Math.max(c - 1, 0))}
          >
            <Feather name="minus" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.waterButton, styles.waterButtonAdd]}
            onPress={() => setCopos((c) => Math.min(c + 1, METAS_COPOS))}
          >
            <Feather name="plus" size={16} color={colors.background} />
          </TouchableOpacity>
        </View>

        {/* Consultas recentes */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Consultas recentes</Text>
          <Text style={styles.sectionLink}>Ver histórico</Text>
        </View>
        <View style={styles.card}>
          {consultasRecentes.map((c, i) => (
            <View
              key={c.id}
              style={[styles.mealRow, i < consultasRecentes.length - 1 && styles.mealRowDivider]}
            >
              <View style={styles.mealIcon}>
                <Feather name="clock" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealRowName}>{c.titulo}</Text>
                <Text style={styles.mealRowInfo}>
                  {c.quando} · {c.calorias} kcal
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textSecondary} />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <Feather name="home" size={20} color={colors.primary} />
        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={handleGerarCardapio}>
          <Feather name="camera" size={18} color={colors.background} />
        </TouchableOpacity>
        <Feather name="user" size={20} color={colors.textSecondary} />
      </View>

      <PaywallCard
        visivel={paywallVisivel}
        onFechar={() => setPaywallVisivel(false)}
        onAssinar={handleAssinar}
        consultasPorDia={1}
        // Só personaliza com a meta quando o perfil realmente carregou —
        // sem isso o card mostraria o número de uma pessoa fictícia.
        metaCalorias={perfil ? metas.calorias : undefined}
        metaProteina={perfil ? metas.proteina : undefined}
        objetivo={perfil?.objetivo}
        tempoDisponivel={perfil?.tempo_disponivel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingTop: 48, paddingBottom: 100, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerActions: { flexDirection: "row", gap: 8 },
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
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  calorieGoal: { fontSize: 11, color: colors.textSecondary },
  calorieValue: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, marginTop: 6 },
  calorieUnit: { fontSize: 12, fontWeight: "400", color: colors.textSecondary },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  calorieRemaining: { fontSize: 11, color: colors.textSecondary, marginTop: 6 },
  macroRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  macroItem: { flex: 1 },
  macroName: { fontSize: 10, color: colors.textSecondary, fontWeight: "600", marginBottom: 6 },
  macroTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  macroFill: { height: "100%", backgroundColor: colors.primaryLight, borderRadius: 3 },
  macroValue: { fontSize: 11, color: colors.textPrimary, marginTop: 5, fontWeight: "600" },
  emptyCard: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primaryLight,
    backgroundColor: "#F3F8EE",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  emptyText: { fontSize: 12, color: colors.textSecondary, textAlign: "center", lineHeight: 17 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginTop: 4 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sectionLink: { fontSize: 11, color: colors.primary, fontWeight: "600" },
  mealRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  mealRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  mealIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EAF3E4",
    alignItems: "center",
    justifyContent: "center",
  },
  mealRowName: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  mealRowInfo: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  chipDone: { backgroundColor: "#EAF3E4" },
  chipPending: { backgroundColor: "#F1EFE6" },
  chipText: { fontSize: 10, fontWeight: "600" },
  chipTextDone: { color: colors.primary },
  chipTextPending: { color: colors.textSecondary },
  waterCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  waterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  waterButtonAdd: { backgroundColor: colors.primary, borderColor: colors.primary },
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
