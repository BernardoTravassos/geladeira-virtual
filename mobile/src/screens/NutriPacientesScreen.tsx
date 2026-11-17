import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useCallback, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import {
  criarConvite, encerrarSessao, encerrarVinculoComoNutri, listarPacientes, minhaContaNutri,
  type PacienteDoNutri,
} from "../services/nutri";

const dataCurta = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "");

/** Pacientes que aceitaram o convite e convites ainda pendentes, direto do servidor. */
export default function NutriPacientesScreen({ navigation }: any) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [itens, setItens] = useState<PacienteDoNutri[]>([]);
  const [conta, setConta] = useState<{ nome: string; crn: string } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [lista, eu] = await Promise.all([listarPacientes(), minhaContaNutri()]);
      setItens(lista);
      setConta(eu.nutricionista);
      setErro("");
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        await encerrarSessao();
        navigation.replace("Login");
        return;
      }
      setErro("Não foi possível carregar os pacientes. Puxe para tentar de novo.");
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [navigation]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const ativos = itens.filter((i) => i.status === "ativo" && i.paciente);
  const pendentes = itens.filter((i) => i.status === "pendente");

  async function novoConvite() {
    setGerando(true);
    try {
      const { codigo } = await criarConvite();
      await carregar();
      compartilhar(codigo);
    } catch (e: any) {
      Alert.alert("Ops", e?.response?.data?.error || "Não foi possível gerar o convite.");
    } finally {
      setGerando(false);
    }
  }

  function compartilhar(codigo: string) {
    Share.share({ message: `Para eu acompanhar a sua alimentação no Geladeira Virtual, abra o app, vá em Perfil › Meu nutricionista e digite o código: ${codigo}` }).catch(() => {});
  }

  function cancelar(i: PacienteDoNutri) {
    Alert.alert("Cancelar convite", `O código ${i.codigo} deixará de funcionar.`, [
      { text: "Voltar", style: "cancel" },
      { text: "Cancelar convite", style: "destructive", onPress: async () => { try { await encerrarVinculoComoNutri(i.vinculoId); } catch {} carregar(); } },
    ]);
  }

  async function sair() {
    await encerrarSessao();
    navigation.replace("Login");
  }

  return (
    <View style={styles.tela}>
      <ScrollView
        contentContainerStyle={[styles.conteudo, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => { setAtualizando(true); carregar(); }} />}
      >
        <View style={styles.cabecalho}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ola}>Área do nutricionista</Text>
            <Text style={styles.nome}>{conta?.nome ?? " "}</Text>
            <Text style={styles.crn}>{conta?.crn ?? ""}</Text>
          </View>
          <TouchableOpacity style={styles.botaoIcone} onPress={sair} accessibilityLabel="Sair">
            <Feather name="log-out" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.cardPlano} onPress={novoConvite} disabled={gerando} activeOpacity={0.85}>
          <View style={styles.planoTopo}>
            <Text style={styles.planoNome}>Convidar paciente</Text>
            {gerando ? <ActivityIndicator color={colors.textoSobreMarca} /> : <Feather name="user-plus" size={18} color={colors.textoSobreMarca} />}
          </View>
          <Text style={styles.planoRenova}>Gera um código para o paciente digitar no app dele.</Text>
        </TouchableOpacity>

        {pendentes.length > 0 && <Text style={styles.secao}>Convites pendentes</Text>}
        {pendentes.map((i) => (
          <View key={i.vinculoId} style={styles.card}>
            <View style={styles.avatar}><Feather name="clock" size={17} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.codigo}>{i.codigo}</Text>
              <Text style={styles.cardInfo}>Aguardando o paciente · criado em {dataCurta(i.criadoEm)}</Text>
            </View>
            <TouchableOpacity onPress={() => i.codigo && compartilhar(i.codigo)} hitSlop={10} accessibilityLabel="Compartilhar código"><Feather name="share-2" size={18} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => cancelar(i)} hitSlop={10} accessibilityLabel="Cancelar convite" style={{ marginLeft: 12 }}><Feather name="x" size={18} color={colors.textSecondary} /></TouchableOpacity>
          </View>
        ))}

        <Text style={styles.secao}>Pacientes</Text>
        {carregando && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}
        {!carregando && !!erro && <Text style={styles.cardInfo}>{erro}</Text>}
        {ativos.map((i) => (
          <CartaoPaciente key={i.vinculoId} item={i} onPress={() => navigation.navigate("NutriPaciente", { item: i })} />
        ))}
        {!carregando && !erro && ativos.length === 0 && (
          <View style={styles.cardVazio}>
            <Feather name="users" size={18} color={colors.primaryLight} />
            <Text style={styles.cardVazioTexto}>Nenhum paciente ainda</Text>
            <Text style={styles.cardVazioSub}>Gere um convite e peça para o paciente digitar o código em Perfil › Meu nutricionista</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CartaoPaciente({ item, onPress }: { item: PacienteDoNutri; onPress: () => void }) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const p = item.paciente!;
  const nome = p.nome || p.email;
  const peso = Number(p.pesoKg);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.avatar}>
        <Text style={styles.avatarTexto}>{nome.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardNome}>{nome}</Text>
        <Text style={styles.cardInfo}>
          {[p.idade ? `${p.idade} anos` : null, p.objetivo].filter(Boolean).join(" · ") || "Perfil ainda não preenchido"}
        </Text>
        {!!peso && <Text style={styles.cardInfo}>{peso.toFixed(1)} kg</Text>}
      </View>
      <View style={styles.cardDireita}>
        <Text style={styles.cardUltimo}>desde {dataCurta(item.aceitoEm)}</Text>
        <Feather name="chevron-right" size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.background },
  conteudo: { padding: 20, paddingTop: 52, paddingBottom: 32, gap: 12 },
  cabecalho: { flexDirection: "row", alignItems: "flex-start" },
  ola: { fontSize: 12, color: colors.textSecondary },
  nome: { fontSize: 19, fontWeight: "700", color: colors.textPrimary, marginTop: 2 },
  crn: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  botaoIcone: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.verdeSuave,
    alignItems: "center", justifyContent: "center",
  },

  cardPlano: {
    backgroundColor: colors.botao, borderRadius: 16, padding: 16, gap: 10, marginTop: 4,
  },
  planoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planoNome: { color: colors.textoSobreMarca, fontWeight: "700", fontSize: 14 },
  planoVagas: { color: "#CFE6D8", fontSize: 12 },
  vagasLinha: { flexDirection: "row", gap: 5 },
  vaga: { flex: 1, height: 5, borderRadius: 3 },
  vagaCheia: { backgroundColor: colors.accent },
  vagaLivre: { backgroundColor: "rgba(255,255,255,0.25)" },
  planoRenova: { color: "#CFE6D8", fontSize: 11 },

  secao: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginTop: 8 },

  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.verdeSuave,
    alignItems: "center", justifyContent: "center",
  },
  avatarTexto: { fontSize: 17, fontWeight: "700", color: colors.primary },
  cardNome: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  cardInfo: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  cardDireita: { alignItems: "flex-end", gap: 4 },
  selo: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9 },
  seloOk: { backgroundColor: colors.verdeSuave },
  seloAtencao: { backgroundColor: colors.avisoFundo },
  seloTexto: { fontSize: 10, fontWeight: "700" },
  seloTextoOk: { color: colors.primary },
  seloTextoAtencao: { color: colors.avisoTexto },
  codigo: { fontSize: 16, fontWeight: "800", letterSpacing: 2, color: colors.textPrimary },
  cardUltimo: { fontSize: 10, color: colors.textSecondary },

  cardVazio: {
    borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.primaryLight,
    backgroundColor: colors.verdeSuave, borderRadius: 16, padding: 18, alignItems: "center", gap: 5,
  },
  cardVazioTexto: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  cardVazioSub: { fontSize: 11, color: colors.textSecondary, textAlign: "center" },
});
