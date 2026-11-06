import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Alert,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, sombra } from "../theme/colors";
import BarraTeclado, { ID_BARRA_TECLADO } from "./BarraTeclado";
import { useFeedback } from "./Feedback";
import { useChaveDoDia } from "../utils/dia";
import { interpretarNumero } from "../utils/numeros";
import {
  adicionarTreinoManual, estimarKcalTreino, lerSaudeDoDia, removerTreinoManual, SaudeDoDia, TIPOS_TREINO, Treino,
} from "../utils/saude";

type Props = {
  pesoKg: number;
  consumidasKcal: number;
  onConectar: () => void;
};

const ROTULO_ORIGEM = { manual: "Manual", smartwatch: "Smartwatch", gymrats: "GymRats" } as const;
const VERDE = "#1E5E34";

export default function CardAtividade({ pesoKg, consumidasKcal, onConectar }: Props) {
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();
  const chaveDia = useChaveDoDia(); // vira à meia-noite e zera o dia
  const [saude, setSaude] = useState<SaudeDoDia | null>(null);

  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState("Musculação");
  const [minutos, setMinutos] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    lerSaudeDoDia(pesoKg).then(setSaude).catch(() => {});
  }, [pesoKg]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar, chaveDia]));
  useEffect(() => { carregar(); }, [carregar]);

  const minutosNum = (() => {
    const r = interpretarNumero(minutos, { artigoRotulo: "A duração", min: 5, max: 600, unidade: "min", inteiro: "proximo" });
    return "valor" in r ? r.valor : 0;
  })();

  async function salvar() {
    const r = interpretarNumero(minutos, { artigoRotulo: "A duração", min: 5, max: 600, unidade: "min", inteiro: "proximo" });
    if ("erro" in r) return setErro(r.erro);
    const novo = await adicionarTreinoManual(tipo, r.valor, pesoKg);
    setAberto(false);
    setMinutos("");
    setErro("");
    carregar();
    feedback.sucesso("Treino registrado!", `${novo.tipo} · ${novo.minutos} min · ≈ ${novo.kcal} kcal`);
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
        <View style={[styles.icone, treinou && { backgroundColor: "#E3F6EE" }]}>
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
            <Text style={styles.treinoInfo}>{t.minutos} min · ≈ {t.kcal} kcal</Text>
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

                  <Text style={styles.rotulo}>Quanto tempo (minutos)?</Text>
                  <TextInput
                    style={styles.input}
                    value={minutos}
                    onChangeText={(t) => { setMinutos(t); setErro(""); }}
                    keyboardType="decimal-pad"
                    inputAccessoryViewID={ID_BARRA_TECLADO}
                    placeholder="Ex: 45"
                    placeholderTextColor={colors.textSecondary}
                  />

                  {minutosNum > 0 && !erro && (
                    <Text style={styles.previa}>Gasto estimado: ≈ {estimarKcalTreino(tipo, minutosNum, pesoKg)} kcal</Text>
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

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12, ...sombra },
  topo: { flexDirection: "row", alignItems: "center", gap: 12 },
  icone: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#EAF3E4", alignItems: "center", justifyContent: "center" },
  titulo: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  status: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  treino: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderRadius: 12, padding: 12 },
  treinoNome: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  treinoInfo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  origem: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: "#EAF3E4" },
  origemTxt: { fontSize: 10, fontWeight: "700", color: colors.primary },
  numeros: { flexDirection: "row", gap: 8 },
  numero: { flex: 1, backgroundColor: colors.background, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  numeroValor: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  numeroRotulo: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  conectar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#EAF3E4", borderRadius: 12, padding: 12 },
  conectarTxt: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.textPrimary, fontWeight: "600" },
  botao: { height: 46, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  botaoTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  folha: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, gap: 12 },
  folhaTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  folhaTitulo: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  rotulo: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipSel: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { fontSize: 13, color: colors.textPrimary },
  chipTxtSel: { color: "#fff", fontWeight: "700" },
  input: { height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.surface },
  previa: { fontSize: 13, color: colors.textPrimary, fontWeight: "600" },
  erro: { fontSize: 13, color: "#C0392B" },
  nota: { fontSize: 11, lineHeight: 16, color: colors.textSecondary },
});
