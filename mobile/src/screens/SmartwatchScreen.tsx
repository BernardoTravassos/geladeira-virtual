import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, sombra, degrade } from "../theme/colors";
import { useFeedback } from "../components/Feedback";
import { abrirDadosHealthConnect } from "../utils/healthConnect";
import { conectarSaude, definirSmartwatchConectado, modoSaude, smartwatchConectado } from "../utils/saude";

const LEEMOS: { icone: keyof typeof Feather.glyphMap; texto: string }[] = [
  { icone: "check-circle", texto: "Se você treinou no dia, e qual treino" },
  { icone: "zap", texto: "Calorias gastas em atividade" },
  { icone: "map-pin", texto: "Passos do dia" },
];

export default function SmartwatchScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();
  const [conectado, setConectado] = useState(false);

  useFocusEffect(useCallback(() => { smartwatchConectado().then(setConectado); }, []));

  const modo = modoSaude();
  const fonte = Platform.OS === "ios" ? "Apple Saúde (Apple Health)" : "Health Connect";

  function conectar() {
    Alert.alert(
      "Permitir acesso",
      `O Geladeira Virtual vai ler do ${fonte}: treinos, calorias gastas e passos. Você pode desconectar quando quiser.`,
      [
        { text: "Agora não", style: "cancel" },
        {
          text: "Permitir",
          onPress: async () => {
            const r = await conectarSaude();
            if (!r.ok) return Alert.alert("Não foi possível conectar", r.mensagem);
            setConectado(true);
            feedback.sucesso("Smartwatch conectado!", modo === "simulado" ? "Versão de testes: os dados são simulados." : undefined);
          },
        },
      ],
    );
  }

  function desconectar() {
    Alert.alert("Desconectar", "O app deixará de ler seus dados de atividade. O que você registrou à mão continua salvo.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Desconectar", style: "destructive", onPress: async () => { await definirSmartwatchConectado(false); setConectado(false); } },
    ]);
  }

  return (
    <View style={styles.tela}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={degrade.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.decoracao} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar} accessibilityLabel="Voltar">
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.selo}><Feather name="watch" size={30} color="#fff" /></View>
          <Text style={styles.titulo}>Smartwatch e treinos</Text>
          <View style={[styles.estado, conectado && styles.estadoOn]}>
            <View style={[styles.ponto, conectado && { backgroundColor: "#7EE0B5" }]} />
            <Text style={styles.estadoTxt}>{conectado ? "Conectado" : "Desconectado"}</Text>
          </View>
        </LinearGradient>

        <View style={styles.corpo}>
          {modo === "simulado" && (
            <View style={styles.teste}>
              <Feather name="info" size={14} color="#6B4500" />
              <Text style={styles.testeTxt}>Versão de testes: ao conectar, os dados do relógio são simulados. A leitura real exige uma versão instalada do app, fora do Expo Go.</Text>
            </View>
          )}

          <Text style={styles.secao}>O que vamos ler</Text>
          <View style={styles.card}>
            {LEEMOS.map((l, i) => (
              <View key={l.texto} style={[styles.linha, i < LEEMOS.length - 1 && styles.divisor]}>
                <View style={styles.icone}><Feather name={l.icone} size={16} color={colors.primary} /></View>
                <Text style={styles.linhaTxt}>{l.texto}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.nota}>Não lemos localização, mensagens nem outros dados de saúde. Os dados servem só para ajustar o seu acompanhamento e, se você autorizar, para o seu nutricionista.</Text>

          <Text style={styles.secao}>De onde vêm os dados</Text>
          <View style={styles.card}>
            <Text style={styles.paragrafo}>
              O app lê do <Text style={styles.forte}>{fonte}</Text>, onde ficam os dados de relógios como Apple Watch, Samsung, Garmin e Fitbit, e de apps de treino que gravam ali, como o Strava.
            </Text>
            <Text style={[styles.paragrafo, { marginTop: 10 }]}>
              O <Text style={styles.forte}>GymRats</Text> não tem integração direta: se o treino registrado nele chegar ao {fonte}, aparece aqui. Treinos que ficarem só no GymRats podem ser adicionados no botão <Text style={styles.forte}>"Treinei hoje"</Text>.
            </Text>
          </View>

          {conectado && modo === "real" && (
            <TouchableOpacity
              style={styles.verDados}
              activeOpacity={0.8}
              onPress={() => { if (!abrirDadosHealthConnect()) Alert.alert("Não foi possível abrir", "Abra o Health Connect pelas Configurações do celular."); }}
              accessibilityRole="button"
            >
              <Feather name="external-link" size={16} color={colors.primary} />
              <Text style={styles.verDadosTxt}>Ver meus dados no Health Connect</Text>
            </TouchableOpacity>
          )}

          {conectado ? (
            <TouchableOpacity style={styles.desconectar} onPress={desconectar} activeOpacity={0.8}>
              <Text style={styles.desconectarTxt}>Desconectar smartwatch</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.botao} onPress={conectar} activeOpacity={0.85}>
              <Feather name="link" size={16} color="#fff" />
              <Text style={styles.botaoTxt}>Conectar smartwatch</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.background },
  hero: { paddingTop: 54, paddingBottom: 26, alignItems: "center", borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: "hidden" },
  decoracao: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)", top: -70, right: -60 },
  voltar: { position: "absolute", left: 20, top: 54, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  selo: { width: 72, height: 72, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", marginTop: 8 },
  titulo: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 14 },
  estado: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.16)" },
  estadoOn: { backgroundColor: "rgba(126,224,181,0.25)" },
  ponto: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.6)" },
  estadoTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  corpo: { padding: 20, gap: 12 },
  teste: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "#FFF4DC", borderRadius: 12, padding: 12 },
  testeTxt: { flex: 1, fontSize: 12, lineHeight: 17, color: "#6B4500" },
  secao: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, marginTop: 6 },
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, ...sombra },
  linha: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  divisor: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icone: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#EAF3E4", alignItems: "center", justifyContent: "center" },
  linhaTxt: { flex: 1, fontSize: 14, color: colors.textPrimary },
  nota: { fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  paragrafo: { fontSize: 14, lineHeight: 21, color: colors.textPrimary },
  forte: { fontWeight: "700" },
  botao: { height: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 6 },
  botaoTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
  verDados: { height: 48, borderRadius: 14, backgroundColor: "#EAF3E4", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 6 },
  verDadosTxt: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  desconectar: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#F0C4BF", alignItems: "center", justifyContent: "center", marginTop: 6 },
  desconectarTxt: { color: "#C0392B", fontWeight: "700", fontSize: 14 },
});
