import { useCores, useTema } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sombra, degrade } from "../theme/colors";
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
import CardOrientacaoNutri from "../components/CardOrientacaoNutri";
import ChatNutri from "../components/ChatNutri";
import DetalheRefeicaoModal from "../components/DetalheRefeicaoModal";
import { ORIENTACAO_NUTRICIONISTA, TEM_NUTRICIONISTA } from "../mocks/orientacaoNutricionista";
import { aplicarEdicoes, carregarEdicoes, descreverItens, Edicoes, restaurarEdicao, salvarEdicao } from "../utils/planoNutri";
import { detalharRefeicao, ItemPlano } from "../utils/refeicaoDetalhe";
import { useChaveDoDia } from "../utils/dia";
import { RECEITAS } from "../mocks/receitas";
import { carregarDia, nomesDoRegistro, salvarRefeicao, totaisDoRegistro, RegistroDoDia } from "../utils/refeicoes";

// Cada refeição tem a sua cor, para a lista deixar de ser uma fila de bolinhas iguais.
// No modo escuro o fundo é a própria cor do ícone, bem transparente (os pastéis
// claros brilhariam demais sobre o fundo escuro).
const TOM_REFEICAO: Record<string, { claro: string; icone: string }> = {
  cafe: { claro: "#FFF0D9", icone: "#D98324" },
  almoco: { claro: "#E3F4E8", icone: "#2E8B57" },
  lanche: { claro: "#FDE7EB", icone: "#D6455D" },
  "lanche-manha": { claro: "#FDF1E3", icone: "#E0793A" },
  "lanche-tarde": { claro: "#FDE7EB", icone: "#D6455D" },
  jantar: { claro: "#E4ECFB", icone: "#3F63B8" },
  ceia: { claro: "#EDE6FA", icone: "#7650C2" },
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
  { chave: "cafe", nome: "Café da manhã", horario: "07:30", icone: "coffee", fracaoDaMeta: 0.2, feita: false },
  { chave: "lanche-manha", nome: "Lanche da manhã", horario: "10:00", icone: "sunrise", fracaoDaMeta: 0.1, feita: false },
  { chave: "almoco", nome: "Almoço", horario: "12:30", icone: "sun", fracaoDaMeta: 0.27, feita: false },
  { chave: "lanche-tarde", nome: "Lanche da tarde", horario: "16:00", icone: "zap", fracaoDaMeta: 0.15, feita: false },
  { chave: "jantar", nome: "Jantar", horario: "19:30", icone: "moon", fracaoDaMeta: 0.22, feita: false },
  { chave: "ceia", nome: "Ceia", horario: "21:30", icone: "star", fracaoDaMeta: 0.06, feita: false },
];

// TODO: virá da tabela "consultas". Por enquanto são as receitas de exemplo.
const consultasRecentes = RECEITAS.slice(0, 2);

const cardapioGeradoHoje = false; // vira true quando existir uma consulta de hoje

export default function HomeScreen({ navigation, route }: any) {
  const colors = useCores();
  const { escuro } = useTema();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [perfil, setPerfil] = useState<PerfilApi | null>(null);
  const [paywallVisivel, setPaywallVisivel] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [registros, setRegistros] = useState<RegistroDoDia>({});
  const [edicoes, setEdicoes] = useState<Edicoes>({});
  const [chaveAberta, setChaveAberta] = useState<string | null>(null);

  // Recarrega ao voltar da tela da refeição, para o card já aparecer como "Feita".
  // Ao virar o dia (00h) a chave muda e as refeições de hoje recomeçam zeradas.
  const chaveDoDia = useChaveDoDia();
  useFocusEffect(
    useCallback(() => {
      carregarDia().then(setRegistros);
      carregarEdicoes().then(setEdicoes);
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

  // O plano da nutricionista (com as alterações da pessoa), por refeição. Sem nutricionista, vazio.
  const plano = useMemo(
    () => (TEM_NUTRICIONISTA ? aplicarEdicoes(ORIENTACAO_NUTRICIONISTA.refeicoes, edicoes) : []),
    [edicoes],
  );
  const planoPorChave = useMemo(() => Object.fromEntries(plano.map((r) => [r.chave, r])), [plano]);
  const detalhe = plano.find((r) => r.chave === chaveAberta) ?? null;

  function irParaRefeicao(chave: string, itensIniciais?: ItemPlano[], abrirCamera = false) {
    const r = refeicoesBase.find((x) => x.chave === chave);
    if (!r) return;
    navigation.navigate("Refeicao", {
      chave: r.chave, nome: r.nome, icone: r.icone, fracaoDaMeta: r.fracaoDaMeta,
      itensIniciais: itensIniciais?.map((i) => ({ alimentoId: i.alimentoId, gramas: i.gramas })),
      abrirCamera,
    });
  }

  /** Toca na linha: com plano, abre o detalhe do que comer; sem plano, vai direto registrar. */
  function abrirRefeicao(chave: string) {
    if (planoPorChave[chave]) setChaveAberta(chave);
    else irParaRefeicao(chave);
  }

  /** Um toque: registra a refeição exatamente como está no plano. */
  async function registrarComoPlano(chave: string) {
    const pr = planoPorChave[chave];
    if (!pr) return;
    await salvarRefeicao(chave, {
      itens: pr.itens.map((i) => ({ alimentoId: i.alimentoId, gramas: i.gramas })),
      registradoEm: new Date().toISOString(),
    });
    setRegistros(await carregarDia());
    setChaveAberta(null);
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

        {/* Refeições do dia: o que comer (plano) e o que já foi comido (registro), numa lista só */}
        <View>
          <Text style={styles.sectionTitle}>Refeições do dia</Text>
          {TEM_NUTRICIONISTA && <Text style={styles.planoSub}>Seguindo o plano de {ORIENTACAO_NUTRICIONISTA.nutricionista.nome}</Text>}
        </View>
        <View style={styles.card}>
          {refeicoesDoDia.map((r, i) => {
            const pr = planoPorChave[r.chave];
            const kcalPlano = pr ? detalharRefeicao(pr.itens).total.kcal : null;
            const delta = r.feita && kcalPlano != null ? (r.caloriasConsumidas ?? 0) - kcalPlano : null;
            return (
              <TouchableOpacity
                key={r.chave}
                activeOpacity={0.7}
                onPress={() => abrirRefeicao(r.chave)}
                style={[styles.mealRow, i < refeicoesDoDia.length - 1 && styles.mealRowDivider]}
                accessibilityRole="button"
                accessibilityLabel={`${r.nome}, ${r.feita ? "feita" : "pendente"}`}
              >
                <View style={[styles.mealIcon, styles.mealIconGrande, { backgroundColor: escuro ? `${TOM_REFEICAO[r.chave]?.icone}33` : TOM_REFEICAO[r.chave]?.claro }]}>
                  <Feather name={r.icone} size={18} color={TOM_REFEICAO[r.chave]?.icone ?? colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealRowName}>{r.nome}</Text>
                  <Text style={styles.mealRowInfo}>
                    {r.feita
                      ? `${r.caloriasConsumidas} kcal registradas`
                      : kcalPlano != null
                        ? `${r.horario} · plano: ${kcalPlano} kcal`
                        : `${r.horario} · ~${Math.round(metas.calorias * r.fracaoDaMeta)} kcal`}
                    {delta != null && Math.abs(delta) >= 1 && (
                      <Text style={delta > 0 ? styles.deltaMais : styles.deltaMenos}>{`  ${delta > 0 ? "+" : "−"}${Math.abs(delta)} vs plano`}</Text>
                    )}
                  </Text>
                  {(r.feita ? !!registros[r.chave] : !!pr) && (
                    <Text style={styles.alimentosPlano} numberOfLines={1}>
                      {r.feita ? nomesDoRegistro(registros[r.chave]) : descreverItens(pr.itens)}
                    </Text>
                  )}
                  {pr && !r.feita && (
                    <TouchableOpacity
                      onPress={() => registrarComoPlano(r.chave)}
                      style={styles.botaoPlano}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Registrar ${r.nome} como no plano`}
                    >
                      <Feather name="check" size={13} color={colors.primary} />
                      <Text style={styles.botaoPlanoTxt}>Registrar como no plano</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={[styles.chip, r.feita ? styles.chipDone : styles.chipPending]}>
                  <Text style={[styles.chipText, r.feita ? styles.chipTextDone : styles.chipTextPending]}>
                    {r.feita ? "✓ Feita" : "Pendente"}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hidratação */}
        <CardAgua metaMl={calcularMetaAguaMl(perfil)} />


        {/* Orientação do nutricionista (mock) */}
        {TEM_NUTRICIONISTA && <CardOrientacaoNutri />}

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

      {TEM_NUTRICIONISTA && (
        <DetalheRefeicaoModal
          refeicao={detalhe}
          editada={!!(detalhe && edicoes[detalhe.chave])}
          metaCalorias={metas.calorias}
          registro={
            detalhe && registros[detalhe.chave]
              ? {
                  kcal: Math.round(totaisDoRegistro(registros[detalhe.chave]).kcal),
                  // Com foto, o detalhe diz "reconhecido pela foto". Os alimentos estão em `itens`
                  // (cada um com 100 g ajustados à quantidade); só registros antigos usam a estimativa.
                  origem: registros[detalhe.chave].fotoUri || (registros[detalhe.chave].itens.length === 0 && registros[detalhe.chave].estimativa) ? "foto" : "itens",
                  itens: registros[detalhe.chave].itens,
                  fotoAlimentos: registros[detalhe.chave].itens.length === 0 ? registros[detalhe.chave].estimativa?.alimentos : undefined,
                  fotoUri: registros[detalhe.chave].fotoUri,
                }
              : null
          }
          onFechar={() => setChaveAberta(null)}
          onSalvar={async (chave: string, itens: ItemPlano[]) => setEdicoes(await salvarEdicao(chave, itens))}
          onRestaurar={async (chave: string) => setEdicoes(await restaurarEdicao(chave))}
          onRegistrarComoPlano={registrarComoPlano}
          onAjustar={(chave) => {
            const pr = planoPorChave[chave];
            setChaveAberta(null);
            irParaRefeicao(chave, pr?.itens);
          }}
          onFotografar={(chave) => {
            setChaveAberta(null);
            irParaRefeicao(chave, undefined, true);
          }}
          onVerRegistro={(chave) => {
            setChaveAberta(null);
            irParaRefeicao(chave);
          }}
        />
      )}

      <ChatNutri contexto={{ calorias: metas.calorias, proteina: metas.proteina, aguaMl: calcularMetaAguaMl(perfil) }} />

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

const criarStyles = (colors: Cores) => StyleSheet.create({
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
    backgroundColor: colors.verdeSuave,
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
  progressFill: { height: "100%", backgroundColor: colors.botao, borderRadius: 4 },
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
    backgroundColor: colors.verdeSuave,
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
  planoSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  alimentosPlano: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  botaoPlano: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.verdeSuave },
  botaoPlanoTxt: { fontSize: 11, fontWeight: "700", color: colors.primary },
  deltaMais: { color: "#D6455D", fontWeight: "700" },
  deltaMenos: { color: colors.primary, fontWeight: "700" },
  sectionLink: { fontSize: 11, color: colors.primary, fontWeight: "600" },
  mealRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  mealRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  mealIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.verdeSuave,
    alignItems: "center",
    justifyContent: "center",
  },
  mealIconGrande: { width: 42, height: 42, borderRadius: 14 },
  mealRowName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  mealRowInfo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  chipDone: { backgroundColor: colors.verdeSuave },
  chipPending: { backgroundColor: colors.fundoSuave },
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
  waterButtonAdd: { backgroundColor: colors.botao, borderColor: colors.primary },
});
