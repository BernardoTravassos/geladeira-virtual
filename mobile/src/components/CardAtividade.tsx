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
import {
  adicionarTreinoManual, estimarKcalTreino, formatarDuracao, lerSaudeDoDia, removerTreinoManual, SaudeDoDia, TIPOS_TREINO, Treino,
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
                    <Coluna
                      rotulo="horas"
                      valor={horas}
                      onChange={(t) => { setHoras(String(Math.min(parseInt(somenteDigitos(t) || "0", 10), 10))); setErro(""); }}
                      onMais={() => definirTotal(totalMin + 60)}
                      onMenos={() => definirTotal(totalMin - 60)}
                    />
                    <Text style={styles.doisPontos}>:</Text>
                    <Coluna
                      rotulo="minutos"
                      valor={mins}
                      onChange={(t) => { setMins(String(Math.min(parseInt(somenteDigitos(t) || "0", 10), 59))); setErro(""); }}
                      onMais={() => definirTotal(totalMin + 1)}
                      onMenos={() => definirTotal(totalMin - 1)}
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

function Coluna({ rotulo, valor, onChange, onMais, onMenos }: { rotulo: string; valor: string; onChange: (t: string) => void; onMais: () => void; onMenos: () => void }) {
  return (
    <View style={styles.coluna}>
      <TouchableOpacity style={styles.seta} onPress={onMais} accessibilityLabel={`Mais ${rotulo}`}>
        <Feather name="chevron-up" size={22} color={colors.primary} />
      </TouchableOpacity>
      <TextInput
        style={styles.numeroGrande}
        value={valor.padStart(2, "0")}
        onChangeText={onChange}
        keyboardType="number-pad"
        inputAccessoryViewID={ID_BARRA_TECLADO}
        maxLength={2}
        selectTextOnFocus
        accessibilityLabel={rotulo}
      />
      <TouchableOpacity style={styles.seta} onPress={onMenos} accessibilityLabel={`Menos ${rotulo}`}>
        <Feather name="chevron-down" size={22} color={colors.primary} />
      </TouchableOpacity>
      <Text style={styles.colunaRotulo}>{rotulo}</Text>
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
  relogio: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  coluna: { alignItems: "center", minWidth: 96 },
  seta: { width: 48, height: 36, alignItems: "center", justifyContent: "center" },
  numeroGrande: { fontSize: 44, fontWeight: "800", color: colors.textPrimary, textAlign: "center", minWidth: 84, paddingVertical: 0 },
  colunaRotulo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  doisPontos: { fontSize: 40, fontWeight: "800", color: colors.textSecondary, marginTop: -6 },
  atalhos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  atalho: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: "#EAF3E4" },
  atalhoSel: { backgroundColor: colors.primary },
  atalhoTxt: { fontSize: 12, fontWeight: "600", color: colors.primary },
  atalhoTxtSel: { color: "#fff" },
});
