import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import { aceitarConvite, encerrarMeuVinculo, meusNutricionistas, type MeuNutricionista } from "../services/nutri";
import { DEV } from "../config/dev";

/**
 * Vínculo com o nutricionista, do lado do paciente. Digitar o código do convite É o consentimento:
 * a partir dali o nutricionista passa a ver o diário (refeições, água e treinos). Dá para encerrar
 * quando quiser, e o acesso some na hora.
 */
export default function CardMeuNutricionista() {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [vinculo, setVinculo] = useState<MeuNutricionista | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  useFocusEffect(useCallback(() => {
    if (DEV.MODO_DEMO) { setCarregando(false); return; }
    meusNutricionistas()
      .then((l) => setVinculo(l[0] ?? null))
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []));

  async function vincular() {
    const limpo = codigo.trim().toUpperCase();
    if (limpo.length < 6) { setErro("Digite o código que o nutricionista enviou."); return; }
    setEnviando(true);
    setErro("");
    try {
      const nutri = await aceitarConvite(limpo);
      setVinculo({ vinculoId: "", aceitoEm: new Date().toISOString(), nutricionista: nutri });
      setCodigo("");
      const l = await meusNutricionistas().catch(() => []);
      if (l[0]) setVinculo(l[0]);
    } catch (e: any) {
      setErro(e?.response?.data?.error || "Não foi possível vincular. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  function encerrar() {
    if (!vinculo) return;
    Alert.alert("Encerrar acompanhamento", `${vinculo.nutricionista.nome} deixará de ver as suas refeições, água e treinos.`, [
      { text: "Voltar", style: "cancel" },
      {
        text: "Encerrar", style: "destructive",
        onPress: async () => {
          try { await encerrarMeuVinculo(vinculo.vinculoId); setVinculo(null); }
          catch { Alert.alert("Ops", "Não foi possível encerrar agora. Tente de novo."); }
        },
      },
    ]);
  }

  return (
    <View style={styles.card}>
      {carregando ? (
        <ActivityIndicator color={colors.primary} />
      ) : vinculo ? (
        <>
          <View style={styles.linha}>
            <View style={styles.icone}><Feather name="user-check" size={16} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.valor}>{vinculo.nutricionista.nome}</Text>
              <Text style={styles.rotulo}>{vinculo.nutricionista.crn} · acompanha as suas refeições, água e treinos</Text>
            </View>
          </View>
          <TouchableOpacity onPress={encerrar} activeOpacity={0.7}>
            <Text style={styles.encerrar}>Encerrar acompanhamento</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.linha}>
            <View style={styles.icone}><Feather name="user-plus" size={16} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.valor}>Tem um nutricionista?</Text>
              <Text style={styles.rotulo}>Digite o código do convite. Ao vincular, ele passa a ver suas refeições, água e treinos.</Text>
            </View>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Código do convite"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            value={codigo}
            onChangeText={(t) => { setCodigo(t); setErro(""); }}
          />
          {!!erro && <Text style={styles.erro}>{erro}</Text>}
          <TouchableOpacity style={styles.botao} onPress={vincular} disabled={enviando} activeOpacity={0.85}>
            {enviando ? <ActivityIndicator color={colors.textoSobreMarca} /> : <Text style={styles.botaoTxt}>Vincular</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, gap: 12 },
  linha: { flexDirection: "row", alignItems: "center", gap: 12 },
  icone: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.verdeSuave, alignItems: "center", justifyContent: "center" },
  valor: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  rotulo: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  input: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, letterSpacing: 2, color: colors.textPrimary, backgroundColor: colors.surface },
  erro: { fontSize: 12, color: colors.erroTexto },
  botao: { height: 46, borderRadius: 12, backgroundColor: colors.botao, alignItems: "center", justifyContent: "center" },
  botaoTxt: { color: colors.textoSobreMarca, fontWeight: "700", fontSize: 14 },
  encerrar: { fontSize: 13, fontWeight: "600", color: colors.erroTexto, textAlign: "center" },
});
