import React, { useCallback, useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, sombra, degrade } from "../theme/colors";
import { LinearGradient } from "expo-linear-gradient";
import Logo from "../components/Logo";
import BarraInferior from "../components/BarraInferior";
import AnelProgresso from "../components/AnelProgresso";
import NumeroAnimado from "../components/NumeroAnimado";
import BarraHero from "../components/BarraHero";

// A transição com o símbolo cobre a tela por ~0,5 s: o preenchimento começa quando ela sai.
const ATRASO_ENTRADA = 450;
import { getProfile, gerarCardapio, ehLimiteAtingido } from "../services/api";
import { calcularMetas, calcularMetaAguaMl, saudacao, PerfilApi } from "../utils/nutricao";
import PaywallCard from "../components/PaywallCard";
import CardAgua from "../components/CardAgua";
import { DEV } from "../config/dev";
import { PERIODOS } from "../utils/historico";
import { useChaveDoDia } from "../utils/dia";
import { RECEITAS } from "../mocks/receitas";
import { carregarDia, totaisDoRegistro, RegistroDoDia } from "../utils/refeicoes";

// Cada refeição tem a sua cor, para a lista deixar de ser uma fila de bolinhas iguais.
const TOM_REFEICAO: Record<string, { fundo: string; icone: string }> = {
  cafe: { fundo: "#FFF0D9", icone: "#D98324" },
  almoco: { fundo: "#E3F4E8", icone: "#2E8B57" },
  lanche: { fundo: "#FDE7EB", icone: "#D6455D" },
  jantar: { fundo: "#E4ECFB", icone: "#3F63B8" },
  ceia: { fundo: "#EDE6FA", icone: "#7650C2" },
};

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
  { chave: "almoco", nome: "Almoço", horario: "12:30", icone: "sun", fracaoDaMeta: 0.3, feita: false },
  { chave: "lanche", nome: "Lanche", horario: "16:00", icone: "zap", fracaoDaMeta: 0.1, feita: false },
  { chave: "jantar", nome: "Jantar", horario: "19:30", icone: "moon", fracaoDaMeta: 0.25, feita: false },
  { chave: "ceia", nome: "Ceia", horario: "21:30", icone: "star", fracaoDaMeta: 0.1, feita: false },
];

// TODO: virá da tabela "consultas". Por enquanto são as receitas de exemplo.
const consultasRecentes = RECEITAS.slice(0, 2);

const cardapioGeradoHoje = false; // vira true quando existir uma consulta de hoje

export default function HomeScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [perfil, setPerfil] = useState<PerfilApi | null>(null);
  const [paywallVisivel, setPaywallVisivel] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [registros, setRegistros] = useState<RegistroDoDia>({});

  // Recarrega ao voltar da tela da refeição, para o card já aparecer como "Feita".
  // Ao virar o dia (00h) a chave muda e as refeições de hoje recomeçam zeradas.
  const chaveDoDia = useChaveDoDia();
  useFocusEffect(
    useCallback(() => {
      carregarDia().then(setRegistros);
    }, [chaveDoDia]),
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

  // Outra tela (Treino, Histórico, Perfil) tocou no botão da câmera: volta para cá e abre.
  useEffect(() => {
    if (route?.params?.camera) {
      navigation.setParams({ camera: undefined });
      handleGerarCardapio();
    }
  }, [route?.params?.camera]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const consumidas = Math.round(refeicoesDoDia.reduce((soma, r) => soma + (r.caloriasConsumidas || 0), 0));
  const progressoCalorias = Math.min(consumidas / metas.calorias, 1);
  const restantes = Math.max(metas.calorias - consumidas, 0);
  const passou = consumidas > metas.calorias;
  const primeiroNome = perfil?.nome?.trim().split(" ")[0];

  // Macros REAIS: a soma do que foi registrado hoje (a mesma conta do Histórico).
  const totaisHoje = Object.values(registros).reduce(
    (t, reg) => {
      const x = totaisDoRegistro(reg);
      return { proteina: t.proteina + x.proteina, carbo: t.carbo + x.carbo, gordura: t.gordura + x.gordura };
    },
    { proteina: 0, carbo: 0, gordura: 0 },
  );
  const macros = [
    { nome: "Proteína", meta: metas.proteina, atual: Math.round(totaisHoje.proteina) },
    { nome: "Carboidrato", meta: metas.carboidrato, atual: Math.round(totaisHoje.carbo) },
    { nome: "Gordura", meta: metas.gordura, atual: Math.round(totaisHoje.gordura) },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={degrade.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          {/* Círculos decorativos, só para dar profundidade ao fundo */}
          <View style={styles.decoracao1} />
          <View style={styles.decoracao2} />

          <View style={styles.heroTopo}>
            <View style={styles.heroMarca}>
              <Logo tamanho={40} />
              <View>
                <Text style={styles.greetingSmall}>{saudacao()}</Text>
                <Text style={styles.greetingName}>{primeiroNome ? `Oi, ${primeiroNome}` : "Olá"}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.heroBotao} accessibilityLabel="Notificações">
                <Feather name="bell" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBotao} onPress={handleLogout} accessibilityLabel="Sair">
                <Feather name="log-out" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroCorpo}>
            <AnelProgresso tamanho={156} espessura={14} progresso={progressoCalorias} cor={passou ? "#FFB38F" : "#7EE0B5"} atraso={ATRASO_ENTRADA}>
              <NumeroAnimado style={styles.anelValor} valor={passou ? consumidas - metas.calorias : restantes} atraso={ATRASO_ENTRADA} />
              <Text style={styles.anelRotulo}>{passou ? "kcal acima da meta" : "kcal restantes"}</Text>
            </AnelProgresso>

            <View style={styles.heroMacros}>
              <View>
                <Text style={styles.heroKcal}>
                  <NumeroAnimado valor={consumidas} atraso={ATRASO_ENTRADA} /> <Text style={styles.heroKcalUn}>/ {metas.calorias} kcal</Text>
                </Text>
                <Text style={styles.heroHoje}>consumidas hoje</Text>
              </View>
              {macros.map((m) => (
                <View key={m.nome}>
                  <View style={styles.heroMacroLinha}>
                    <Text style={styles.heroMacroNome}>{m.nome}</Text>
                    <Text style={styles.heroMacroValor}><NumeroAnimado valor={m.atual} atraso={ATRASO_ENTRADA} />/{m.meta} g{m.atual > m.meta ? `  +${m.atual - m.meta}` : ""}</Text>
                  </View>
                  <BarraHero atual={m.atual} meta={m.meta} atraso={ATRASO_ENTRADA} />
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        <TouchableOpacity activeOpacity={0.9} onPress={handleGerarCardapio}>
          <LinearGradient colors={degrade.acento} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.ctaCard, sombra]}>
            <View style={styles.ctaIcon}>
              <Feather name="camera" size={22} color="#F2622B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Tirar foto da geladeira</Text>
              <Text style={styles.ctaSubtitle}>Gere seu cardápio agora, em segundos</Text>
            </View>
            <Feather name="arrow-right" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

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
              onPress={() => navigation.navigate("Refeicao", { chave: r.chave, nome: r.nome, icone: r.icone, fracaoDaMeta: r.fracaoDaMeta })}
              style={[styles.mealRow, i < refeicoesDoDia.length - 1 && styles.mealRowDivider]}
            >
              <View style={[styles.mealIcon, styles.mealIconGrande, { backgroundColor: TOM_REFEICAO[r.chave]?.fundo }]}>
                <Feather name={r.icone} size={18} color={TOM_REFEICAO[r.chave]?.icone ?? colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealRowName}>{r.nome}</Text>
                <Text style={styles.mealRowInfo}>
                  {r.feita ? `${r.caloriasConsumidas} kcal registradas` : `${r.horario} · ~${Math.round(metas.calorias * r.fracaoDaMeta)} kcal`}
                </Text>
              </View>
              <View style={[styles.chip, r.feita ? styles.chipDone : styles.chipPending]}>
                <Text style={[styles.chipText, r.feita ? styles.chipTextDone : styles.chipTextPending]}>
                  {r.feita ? "✓ Feita" : "Pendente"}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Hidratação */}
        <CardAgua metaMl={calcularMetaAguaMl(perfil)} />


        {/* Histórico */}
        <Text style={styles.sectionTitle}>Histórico</Text>
        <View style={styles.card}>
          <Text style={styles.mealRowInfo}>Veja o que você consumiu, com gráficos</Text>
          <View style={styles.periodos}>
            {PERIODOS.map((p) => (
              <TouchableOpacity
                key={p.chave}
                style={styles.periodo}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("Historico", { periodo: p.chave })}
                accessibilityRole="button"
                accessibilityLabel={`Histórico de ${p.nome}`}
              >
                <View style={styles.mealIcon}>
                  <Feather name={p.icone} size={16} color={colors.primary} />
                </View>
                <Text style={styles.periodoTxt}>{p.nome}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Consultas recentes */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Consultas recentes</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Receitas")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button">
            <Text style={styles.sectionLink}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {consultasRecentes.map((c, i) => (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Receita", { id: c.id })}
              style={[styles.mealRow, i < consultasRecentes.length - 1 && styles.mealRowDivider]}
              accessibilityRole="button"
              accessibilityLabel={`Ver receita: ${c.titulo}`}
            >
              <View style={styles.mealIcon}>
                <Feather name="book-open" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealRowName}>{c.titulo}</Text>
                <Text style={styles.mealRowInfo}>
                  {c.quando} · {c.calorias} kcal
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <BarraInferior ativa="Home" onCamera={handleGerarCardapio} />

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
  scrollContent: { padding: 20, paddingTop: 0, paddingBottom: 100, gap: 16 },
  hero: {
    marginHorizontal: -20,
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: "hidden",
    gap: 22,
  },
  decoracao1: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)", top: -70, right: -60 },
  decoracao2: { position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.05)", bottom: -50, left: -40 },
  heroTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroMarca: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroBotao: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  heroCorpo: { flexDirection: "row", alignItems: "center", gap: 18 },
  anelValor: { fontSize: 36, fontWeight: "800", color: "#fff" },
  anelRotulo: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: -2, textAlign: "center", paddingHorizontal: 18 },
  heroMacros: { flex: 1, gap: 12 },
  heroKcal: { fontSize: 22, fontWeight: "800", color: "#fff" },
  heroKcalUn: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.75)" },
  heroHoje: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  heroMacroLinha: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  heroMacroNome: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  heroMacroValor: { fontSize: 11, fontWeight: "700", color: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerActions: { flexDirection: "row", gap: 8 },
  greetingSmall: { fontSize: 12, color: "rgba(255,255,255,0.75)" },
  greetingName: { fontSize: 19, fontWeight: "800", color: "#fff", marginTop: 1 },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF3E4",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ctaIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  ctaSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    ...sombra,
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
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, marginTop: 6 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  periodos: { flexDirection: "row", gap: 8, marginTop: 12 },
  periodo: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  periodoTxt: { fontSize: 12, fontWeight: "600", color: colors.textPrimary },
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
  mealIconGrande: { width: 42, height: 42, borderRadius: 14 },
  mealRowName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  mealRowInfo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
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
});
