import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Alert, Animated,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sombra } from "../theme/colors";
import BarraTeclado, { ID_BARRA_TECLADO } from "./BarraTeclado";
import { useFeedback } from "./Feedback";
import { useChaveDoDia } from "../utils/dia";
import {
  adicionarTreinoManual, estimarKcalTreino, formatarDuracao, lerSaudeDoDia, removerTreinoManual, SaudeDoDia, TIPOS_TREINO, Treino,
} from "../utils/saude";

type Props = {
  pesoKg: number;
  consumidasKcal: number;
  onConectar: () => void;
};

const ROTULO_ORIGEM = { manual: "Manual", smartwatch: "Smartwatch", gymrats: "GymRats" } as const;

export default function CardAtividade({ pesoKg, consumidasKcal, onConectar }: Props) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const VERDE = colors.sucessoTexto;
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();
  const chaveDia = useChaveDoDia(); // vira à meia-noite e zera o dia
  const [saude, setSaude] = useState<SaudeDoDia | null>(null);

  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState("Musculação");
  const [horas, setHoras] = useState("0");
  const [mins, setMins] = useState("45");
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    lerSaudeDoDia(pesoKg).then(setSaude).catch(() => {});
  }, [pesoKg]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar, chaveDia]));
  useEffect(() => { carregar(); }, [carregar]);

  const somenteDigitos = (t: string) => t.replace(/[^0-9]/g, "");
  const totalMin = (parseInt(horas, 10) || 0) * 60 + (parseInt(mins, 10) || 0);

  function definirTotal(total: number) {
    const t = Math.min(Math.max(total, 0), 600);
    setHoras(String(Math.floor(t / 60)));
    setMins(String(t % 60));
    setErro("");
  }

  async function salvar() {
    if (totalMin < 5) return setErro("O treino precisa ter pelo menos 5 minutos.");
    if (totalMin > 600) return setErro("A duração máxima é de 10 horas.");
    const novo = await adicionarTreinoManual(tipo, totalMin, pesoKg);
    setAberto(false);
    setErro("");
    carregar();
    feedback.sucesso("Treino registrado!", `${novo.tipo} · ${formatarDuracao(novo.minutos)} · ≈ ${novo.kcal} kcal`);
  }

  function confirmarRemocao(t: Treino) {
    if (t.origem !== "manual") return; // treinos do relógio não se apagam por aqui
    Alert.alert("Remover treino", `Remover "${t.tipo}" de hoje?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => { await removerTreinoManual(t.id); carregar(); } },
    ]);
  }

  const treinou = !!saude?.treinou;
  const gastas = saude?.caloriasGastas ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.topo}>
        <View style={[styles.icone, treinou && { backgroundColor: colors.sucessoFundo }]}>
          <Feather name="activity" size={18} color={treinou ? VERDE : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Atividade de hoje</Text>
          <Text style={[styles.status, treinou && { color: VERDE, fontWeight: "700" }]}>
            {treinou ? "✓ Você treinou hoje" : "Ainda sem treino hoje"}
          </Text>
        </View>
      </View>

      {saude?.treinos.map((t) => (
        <TouchableOpacity key={t.id} style={styles.treino} activeOpacity={t.origem === "manual" ? 0.7 : 1} onPress={() => confirmarRemocao(t)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.treinoNome}>{t.tipo}</Text>
            <Text style={styles.treinoInfo}>{formatarDuracao(t.minutos)} · ≈ {t.kcal} kcal</Text>
          </View>
          <View style={styles.origem}><Text style={styles.origemTxt}>{ROTULO_ORIGEM[t.origem]}</Text></View>
        </TouchableOpacity>
      ))}

      {saude?.conectado ? (
        <View style={styles.numeros}>
          <View style={styles.numero}>
            <Text style={styles.numeroValor}>{(saude.passos ?? 0).toLocaleString("pt-BR")}</Text>
            <Text style={styles.numeroRotulo}>passos</Text>
          </View>
          <View style={styles.numero}>
            <Text style={styles.numeroValor}>{gastas.toLocaleString("pt-BR")}</Text>
            <Text style={styles.numeroRotulo}>kcal gastas</Text>
          </View>
          <View style={styles.numero}>
            <Text style={styles.numeroValor}>{Math.round(consumidasKcal).toLocaleString("pt-BR")}</Text>
            <Text style={styles.numeroRotulo}>kcal consumidas</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.conectar} onPress={onConectar} activeOpacity={0.8} accessibilityRole="button">
          <Feather name="watch" size={16} color={colors.primary} />
          <Text style={styles.conectarTxt}>Conectar smartwatch para ver passos e calorias gastas</Text>
          <Feather name="chevron-right" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.botao} onPress={() => { setErro(""); setAberto(true); }} activeOpacity={0.85} accessibilityRole="button">
        <Feather name="plus" size={16} color="#fff" />
        <Text style={styles.botaoTxt}>Treinei hoje</Text>
      </TouchableOpacity>

      <Modal visible={aberto} transparent animationType="slide" onRequestClose={() => setAberto(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.fundo}>
              <TouchableWithoutFeedback>
                <View style={[styles.folha, { paddingBottom: 28 + insets.bottom }]}>
                  <View style={styles.folhaTopo}>
                    <Text style={styles.folhaTitulo}>Registrar treino</Text>
                    <TouchableOpacity onPress={() => setAberto(false)} accessibilityLabel="Fechar"><Feather name="x" size={20} color={colors.textSecondary} /></TouchableOpacity>
                  </View>

                  <Text style={styles.rotulo}>Que treino foi?</Text>
                  <ScrollView horizontal={false} style={{ maxHeight: 150 }} keyboardShouldPersistTaps="handled">
                    <View style={styles.chips}>
                      {TIPOS_TREINO.map((t) => (
                        <TouchableOpacity key={t.nome} style={[styles.chip, tipo === t.nome && styles.chipSel]} onPress={() => setTipo(t.nome)}>
                          <Text style={[styles.chipTxt, tipo === t.nome && styles.chipTxtSel]}>{t.nome}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={styles.rotulo}>Quanto tempo durou?</Text>
                  <View style={styles.relogio}>
                    {/* Faixa que marca o valor escolhido, atrás das duas rodas */}
                    <View pointerEvents="none" style={styles.faixa} />
                    <Roda
                      rotulo="horas"
                      max={10}
                      valor={parseInt(horas, 10) || 0}
                      onChange={(n) => { setHoras(String(n)); setErro(""); }}
                    />
                    <Text style={styles.doisPontos}>:</Text>
                    <Roda
                      rotulo="min"
                      max={59}
                      valor={parseInt(mins, 10) || 0}
                      onChange={(n) => { setMins(String(n)); setErro(""); }}
                    />
                  </View>
                  <View style={styles.atalhos}>
                    {[15, 30, 45, 60, 90, 120].map((m) => (
                      <TouchableOpacity key={m} style={[styles.atalho, totalMin === m && styles.atalhoSel]} onPress={() => definirTotal(m)}>
                        <Text style={[styles.atalhoTxt, totalMin === m && styles.atalhoTxtSel]}>{formatarDuracao(m)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {totalMin >= 5 && !erro && (
                    <Text style={styles.previa}>
                      {formatarDuracao(totalMin)} · gasto estimado ≈ {estimarKcalTreino(tipo, totalMin, pesoKg)} kcal
                    </Text>
                  )}
                  {!!erro && <Text style={styles.erro}>{erro}</Text>}
                  <Text style={styles.nota}>Estimativa pelo tipo de treino, tempo e seu peso. Com o smartwatch conectado, o gasto vem do relógio.</Text>

                  <TouchableOpacity style={styles.botao} onPress={salvar} activeOpacity={0.85}>
                    <Text style={styles.botaoTxt}>Salvar treino</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
        <BarraTeclado />
      </Modal>
    </View>
  );
}

const ALTURA_ITEM = 46;
const ITENS_VISIVEIS = 3;

type RodaProps = { rotulo: string; max: number; valor: number; onChange: (n: number) => void };

/**
 * Roda de números, como a de um despertador: gira com o dedo, desacelera e
 * "encaixa" no número do meio. Os vizinhos ficam menores e mais claros, e tocar
 * num deles leva até ele. Usa só ScrollView (sem biblioteca nativa).
 */
function Roda({ rotulo, max, valor, onChange }: RodaProps) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const itens = Array.from({ length: max + 1 }, (_, i) => i);
  const rolagem = useRef<any>(null);
  const y = useRef(new Animated.Value(valor * ALTURA_ITEM)).current;
  const atual = useRef(valor);

  // Mudou de fora (atalho "1 h 30", por exemplo): gira a roda até o novo valor.
  useEffect(() => {
    if (valor !== atual.current) {
      atual.current = valor;
      rolagem.current?.scrollTo({ y: valor * ALTURA_ITEM, animated: true });
    }
  }, [valor]);

  // Posiciona na abertura, sem animação.
  useEffect(() => {
    const t = setTimeout(() => rolagem.current?.scrollTo({ y: valor * ALTURA_ITEM, animated: false }), 0);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function terminou(offsetY: number) {
    const indice = Math.min(Math.max(Math.round(offsetY / ALTURA_ITEM), 0), max);
    if (indice !== atual.current) {
      atual.current = indice;
      onChange(indice);
    }
  }

  return (
    <View style={styles.rodaCaixa}>
      <View style={styles.rodaJanela}>
        <Animated.ScrollView
          ref={rolagem}
          showsVerticalScrollIndicator={false}
          snapToInterval={ALTURA_ITEM}
          decelerationRate="fast"
          scrollEventThrottle={16}
          nestedScrollEnabled
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true })}
          onMomentumScrollEnd={(e) => terminou(e.nativeEvent.contentOffset.y)}
          onScrollEndDrag={(e) => terminou(e.nativeEvent.contentOffset.y)}
          contentContainerStyle={{ paddingVertical: ALTURA_ITEM * Math.floor(ITENS_VISIVEIS / 2) }}
          accessibilityLabel={rotulo}
        >
          {itens.map((n) => {
            const centro = n * ALTURA_ITEM;
            const faixa = [centro - 2 * ALTURA_ITEM, centro - ALTURA_ITEM, centro, centro + ALTURA_ITEM, centro + 2 * ALTURA_ITEM];
            return (
              <TouchableOpacity
                key={n}
                activeOpacity={0.6}
                onPress={() => rolagem.current?.scrollTo({ y: centro, animated: true })}
                style={styles.rodaItem}
              >
                <Animated.Text
                  style={[
                    styles.rodaNumero,
                    {
                      opacity: y.interpolate({ inputRange: faixa, outputRange: [0.12, 0.4, 1, 0.4, 0.12], extrapolate: "clamp" }),
                      transform: [{ scale: y.interpolate({ inputRange: faixa, outputRange: [0.7, 0.82, 1.08, 0.82, 0.7], extrapolate: "clamp" }) }],
                    },
                  ]}
                >
                  {String(n).padStart(2, "0")}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
        </Animated.ScrollView>
        {/* Esmaece o topo e o fundo, para a roda parecer sumir nas pontas */}
        <LinearGradient pointerEvents="none" colors={[colors.surface, `${colors.surface}00`]} style={[styles.esmaece, { top: 0 }]} />
        <LinearGradient pointerEvents="none" colors={[`${colors.surface}00`, colors.surface]} style={[styles.esmaece, { bottom: 0 }]} />
      </View>
      <Text style={styles.colunaRotulo}>{rotulo}</Text>
    </View>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12, ...sombra },
  topo: { flexDirection: "row", alignItems: "center", gap: 12 },
  icone: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.verdeSuave, alignItems: "center", justifyContent: "center" },
  titulo: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  status: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  treino: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderRadius: 12, padding: 12 },
  treinoNome: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  treinoInfo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  origem: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.verdeSuave },
  origemTxt: { fontSize: 10, fontWeight: "700", color: colors.primary },
  numeros: { flexDirection: "row", gap: 8 },
  numero: { flex: 1, backgroundColor: colors.background, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  numeroValor: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  numeroRotulo: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  conectar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.verdeSuave, borderRadius: 12, padding: 12 },
  conectarTxt: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.textPrimary, fontWeight: "600" },
  botao: { height: 46, borderRadius: 14, backgroundColor: colors.botao, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  botaoTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  folha: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, gap: 12 },
  folhaTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  folhaTitulo: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  rotulo: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipSel: { backgroundColor: colors.botao, borderColor: colors.primary },
  chipTxt: { fontSize: 13, color: colors.textPrimary },
  chipTxtSel: { color: "#fff", fontWeight: "700" },
  input: { height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.surface },
  previa: { fontSize: 13, color: colors.textPrimary, fontWeight: "600" },
  erro: { fontSize: 13, color: colors.erroTexto },
  nota: { fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  rodaCaixa: { alignItems: "center", width: 110 },
  rodaJanela: { height: ALTURA_ITEM * ITENS_VISIVEIS, width: 110, overflow: "hidden" },
  rodaItem: { height: ALTURA_ITEM, alignItems: "center", justifyContent: "center" },
  rodaNumero: { fontSize: 34, fontWeight: "800", color: colors.textPrimary },
  esmaece: { position: "absolute", left: 0, right: 0, height: ALTURA_ITEM * 0.9 },
  faixa: { position: "absolute", left: 14, right: 14, top: 10 + ALTURA_ITEM, height: ALTURA_ITEM, borderRadius: 14, backgroundColor: colors.verdeSuave },
  relogio: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  colunaRotulo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  doisPontos: { fontSize: 34, fontWeight: "800", color: colors.textSecondary, marginTop: -22 },
  atalhos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  atalho: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.verdeSuave },
  atalhoSel: { backgroundColor: colors.botao },
  atalhoTxt: { fontSize: 12, fontWeight: "600", color: colors.primary },
  atalhoTxtSel: { color: "#fff" },
});
