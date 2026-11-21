import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import BarraInferior from "../components/BarraInferior";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sombra, degrade } from "../theme/colors";
import CardAtividade from "../components/CardAtividade";
import { getProfile } from "../services/api";
import { carregarDia, totaisDoRegistro } from "../utils/refeicoes";
import { lerSaudeDeDatas, SaudeDoDia } from "../utils/saude";
import { useChaveDoDia } from "../utils/dia";

const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** A bolinha do dia: quando o treino é marcado, ela enche de verde e o "✓" salta no lugar. */
function BolhaDia({ treinou, hoje, selecionada, styles }: { treinou: boolean; hoje: boolean; selecionada: boolean; styles: any }) {
  const anterior = useRef(treinou);
  const escala = useRef(new Animated.Value(1)).current;
  const check = useRef(new Animated.Value(treinou ? 1 : 0)).current;
  useEffect(() => {
    if (treinou && !anterior.current) {
      check.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(escala, { toValue: 1.25, duration: 140, useNativeDriver: true }),
          Animated.spring(escala, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
        ]),
        Animated.spring(check, { toValue: 1, friction: 4, tension: 140, delay: 80, useNativeDriver: true }),
      ]).start();
    } else if (!treinou) {
      check.setValue(0);
    }
    anterior.current = treinou;
  }, [treinou, escala, check]);
  return (
    <Animated.View style={[styles.bolha, treinou && styles.bolhaTreinou, hoje && !treinou && styles.bolhaHoje, selecionada && styles.bolhaSel, { transform: [{ scale: escala }] }]}>
      {treinou && (
        <Animated.View style={{ opacity: check, transform: [{ scale: check }] }}>
          <Feather name="check" size={16} color="#fff" />
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default function TreinoScreen({ navigation }: any) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const chaveDia = useChaveDoDia();
  const [pesoKg, setPesoKg] = useState(70);
  const [consumidas, setConsumidas] = useState(0);
  const [diaSel, setDiaSel] = useState(6); // posição na fileira de 7 dias; 6 = hoje
  const [versao, setVersao] = useState(0); // sobe quando um treino é salvo/removido, para a semana recarregar
  const [semana, setSemana] = useState<{ data: Date; saude: SaudeDoDia }[]>([]);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      (async () => {
        const perfil = await getProfile().catch(() => null);
        const peso = Number(perfil?.peso_kg) || 70;
        const dia = await carregarDia();
        const hoje = new Date();
        const datas = Array.from({ length: 7 }, (_, i) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (6 - i)));
        const saude = await lerSaudeDeDatas(datas, peso);
        if (!ativo) return;
        setPesoKg(peso);
        setConsumidas(Object.values(dia).reduce((s, r) => s + totaisDoRegistro(r).kcal, 0));
        setSemana(datas.map((data, i) => ({ data, saude: saude[i] })));
      })();
      return () => { ativo = false; };
    }, [chaveDia, versao]),
  );

  const treinosNaSemana = semana.filter((d) => d.saude.treinou).length;

  return (
    <View style={styles.tela}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={degrade.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.decoracao} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar} accessibilityLabel="Voltar">
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.selo}>
            <MaterialCommunityIcons name="dumbbell" size={32} color="#fff" />
          </View>
          <Text style={styles.titulo}>Treino</Text>
          <Text style={styles.sub}>
            {treinosNaSemana === 0 ? "Nenhum treino nos últimos 7 dias" : `${treinosNaSemana} ${treinosNaSemana === 1 ? "dia" : "dias"} de treino nos últimos 7`}
          </Text>
        </LinearGradient>

        <View style={styles.corpo}>
          <CardAtividade data={semana[diaSel]?.data} pesoKg={pesoKg} consumidasKcal={consumidas} onConectar={() => navigation.navigate("Smartwatch")} onMudou={() => setVersao((v) => v + 1)} />

          <Text style={styles.secao}>Últimos 7 dias</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: -8 }}>Toque em um dia para ver ou registrar o treino dele.</Text>
          <View style={[styles.card, styles.semana]}>
            {semana.map(({ data, saude }, i) => {
              const hoje = i === semana.length - 1;
              return (
                <TouchableOpacity key={i} style={styles.dia} activeOpacity={0.7} onPress={() => setDiaSel(i)} accessibilityRole="button" accessibilityLabel={`Treino de ${data.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric" })}`}>
                  <BolhaDia treinou={saude.treinou} hoje={hoje} selecionada={i === diaSel} styles={styles} />
                  <Text style={[styles.diaTxt, hoje && { color: colors.textPrimary, fontWeight: "800" }]}>{DIAS[data.getDay()]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={[styles.card, styles.atalho]} activeOpacity={0.8} onPress={() => navigation.navigate("Smartwatch")} accessibilityRole="button">
            <View style={styles.icone}><Feather name="watch" size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.atalhoTitulo}>Smartwatch e treinos</Text>
              <Text style={styles.atalhoSub}>Conectar o relógio e ver de onde vêm os dados</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.card, styles.atalho]} activeOpacity={0.8} onPress={() => navigation.navigate("Historico", { periodo: "semana" })} accessibilityRole="button">
            <View style={styles.icone}><Feather name="bar-chart-2" size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.atalhoTitulo}>Ver gráficos de atividade</Text>
              <Text style={styles.atalhoSub}>Calorias consumidas × gastas no Histórico</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BarraInferior ativa="Treino" />
    </View>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.background },
  hero: { paddingTop: 54, paddingBottom: 26, alignItems: "center", borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: "hidden" },
  decoracao: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)", top: -70, right: -60 },
  voltar: { position: "absolute", left: 20, top: 54, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  selo: { width: 72, height: 72, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", marginTop: 8 },
  titulo: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 12 },
  sub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  corpo: { padding: 20, gap: 14 },
  secao: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, ...sombra },
  semana: { flexDirection: "row", justifyContent: "space-between", padding: 16 },
  dia: { alignItems: "center", gap: 8 },
  bolha: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  bolhaTreinou: { backgroundColor: "#1BAF7A", borderColor: "#1BAF7A" },
  bolhaSel: { borderWidth: 2.5, borderColor: colors.primary },
  bolhaHoje: { borderColor: colors.primary },
  diaTxt: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  atalho: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  icone: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.verdeSuave, alignItems: "center", justifyContent: "center" },
  atalhoTitulo: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  atalhoSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
