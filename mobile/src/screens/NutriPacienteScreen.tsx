import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { serie } from "../theme/graficos";
import { PACIENTES } from "../mocks/nutricionista";
import GraficoColunas from "../components/GraficoColunas";
import Medidor from "../components/Medidor";
import BarraTeclado, { ID_BARRA_TECLADO } from "../components/BarraTeclado";

export default function NutriPacienteScreen({ route, navigation }: any) {
  const paciente = PACIENTES.find((p) => p.id === route.params?.id) ?? PACIENTES[0];

  const [editandoMetas, setEditandoMetas] = useState(false);
  const [metaCalorias, setMetaCalorias] = useState(String(paciente.metaCalorias));

  const saldo = paciente.consumidasHoje - paciente.gastasHoje;
  const diferencaPeso = paciente.pesoKg - paciente.pesoInicialKg;

  function salvarMetas() {
    setEditandoMetas(false);
    Alert.alert(
      "Meta atualizada",
      `A meta de ${paciente.nome.split(" ")[0]} passou para ${metaCalorias} kcal.\n\n` +
        "(demonstração — ainda não é gravado)"
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.tela}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.conteudo}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.cabecalho}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.nome}>{paciente.nome}</Text>
            <Text style={styles.sub}>
              {paciente.idade} anos · {paciente.objetivo}
            </Text>
          </View>
        </View>

        {/* ── Figura principal: o número que o painel lidera ───────────── */}
        <View style={styles.card}>
          <Text style={styles.rotuloSecao}>Hoje</Text>
          <View style={styles.heroLinha}>
            <Text style={styles.hero}>{paciente.consumidasHoje.toLocaleString("pt-BR")}</Text>
            <Text style={styles.heroUnidade}>
              kcal de {paciente.metaCalorias.toLocaleString("pt-BR")}
            </Text>
          </View>

          <Medidor
            rotulo="Consumo do dia"
            atual={paciente.consumidasHoje}
            meta={paciente.metaCalorias}
            unidade="kcal"
            cor={serie.consumidas}
            atraso={60}
          />

          <View style={styles.saldoLinha}>
            <Text style={styles.saldoTexto}>
              Gastou {paciente.gastasHoje.toLocaleString("pt-BR")} kcal · saldo{" "}
              <Text style={styles.saldoValor}>
                {saldo >= 0 ? "+" : ""}
                {saldo.toLocaleString("pt-BR")}
              </Text>
            </Text>
          </View>

          <View style={styles.macros}>
            {paciente.macros.map((m, i) => (
              <View key={m.nome} style={{ flex: 1 }}>
                <Medidor rotulo={m.nome} atual={m.atual} meta={m.meta} atraso={120 + i * 90} />
              </View>
            ))}
          </View>
        </View>

        {/* ── Série temporal: duas medidas, mesma unidade, um eixo ─────── */}
        <View style={styles.card}>
          <Text style={styles.rotuloSecao}>Últimos 7 dias</Text>
          <GraficoColunas
            rotulos={paciente.semana.map((d) => d.dia)}
            unidade="kcal"
            series={[
              { nome: "Consumidas", cor: serie.consumidas, valores: paciente.semana.map((d) => d.consumidas) },
              { nome: "Gastas", cor: serie.gastas, valores: paciente.semana.map((d) => d.gastas) },
            ]}
          />
        </View>

        {/* ── Smartwatch: últimas leituras + histórico da semana ───────── */}
        <View style={styles.secaoLinha}>
          <Text style={styles.secao}>Smartwatch</Text>
          <View style={styles.sincronizado}>
            <Feather name="refresh-cw" size={10} color={colors.textSecondary} />
            <Text style={styles.sincronizadoTexto}>
              sincronizado {paciente.smartwatch.sincronizadoEm}
            </Text>
          </View>
        </View>

        {/* Números soltos do agora: linha de indicadores, não gráfico. */}
        <View style={styles.indicadores}>
          <Indicador icone="activity" valor={paciente.smartwatch.passos.toLocaleString("pt-BR")} rotulo="passos hoje" />
          <Indicador icone="heart" valor={`${paciente.smartwatch.batimentoMedio}`} rotulo="bpm agora" />
          <Indicador icone="zap" valor={`${paciente.smartwatch.minutosAtivos}`} rotulo="min ativos" />
          <Indicador icone="moon" valor={`${paciente.smartwatch.sonoHoras}h`} rotulo="de sono" />
        </View>

        <View style={styles.card}>
          <View style={styles.cardTopo}>
            <Text style={styles.rotuloSecao}>Passos na semana</Text>
            <Text style={styles.cardTopoValor}>
              {Math.round(
                paciente.smartwatch.passosSemana.reduce((s, v) => s + v, 0) /
                  paciente.smartwatch.passosSemana.length
              ).toLocaleString("pt-BR")}{" "}
              <Text style={styles.cardTopoUnidade}>média/dia</Text>
            </Text>
          </View>

          {/* Uma série só: sem legenda (o título já diz o que é) e uma cor só.
              A linha de meta responde "quanto falta" sem exigir conta. */}
          <GraficoColunas
            rotulos={paciente.semana.map((d) => d.dia)}
            unidade="passos"
            series={[
              { nome: "Passos", cor: colors.primaryLight, valores: paciente.smartwatch.passosSemana },
            ]}
            referencia={{
              valor: paciente.smartwatch.metaPassos,
              rotulo: `meta ${(paciente.smartwatch.metaPassos / 1000).toFixed(0)}k`,
            }}
          />

          <View style={styles.resumoSemana}>
            <ResumoSemana valor={`${paciente.smartwatch.mediaBatimento}`} rotulo="bpm médio" />
            <ResumoSemana valor={`${paciente.smartwatch.totalMinutosAtivos}`} rotulo="min ativos" />
            <ResumoSemana valor={`${paciente.smartwatch.mediaSonoHoras}h`} rotulo="sono médio" />
          </View>
        </View>

        {/* ── Alimentação do dia ───────────────────────────────────────── */}
        <Text style={styles.secao}>O que comeu hoje</Text>
        <View style={styles.card}>
          {paciente.refeicoesHoje.length === 0 ? (
            <View style={styles.vazio}>
              <Feather name="alert-circle" size={18} color={colors.textSecondary} />
              <Text style={styles.vazioTexto}>Nenhuma refeição registrada hoje</Text>
            </View>
          ) : (
            paciente.refeicoesHoje.map((r, i) => (
              <View
                key={r.nome}
                style={[styles.linha, i < paciente.refeicoesHoje.length - 1 && styles.divisor]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.linhaTitulo}>
                    {r.nome} <Text style={styles.linhaHora}>· {r.horario}</Text>
                  </Text>
                  <Text style={styles.linhaInfo}>{r.descricao}</Text>
                </View>
                <Text style={styles.linhaValor}>{r.calorias} kcal</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Peso ─────────────────────────────────────────────────────── */}
        <View style={[styles.card, styles.pesoCard]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rotuloSecao}>Peso</Text>
            <Text style={styles.pesoValor}>{paciente.pesoKg.toFixed(1)} kg</Text>
          </View>
          <View style={styles.pesoDelta}>
            <Feather
              name={diferencaPeso < 0 ? "trending-down" : "trending-up"}
              size={15}
              color={colors.textSecondary}
            />
            <Text style={styles.pesoDeltaTexto}>
              {diferencaPeso >= 0 ? "+" : ""}
              {diferencaPeso.toFixed(1)} kg desde o início
            </Text>
          </View>
        </View>

        {/* ── Cardápios gerados pelo app ───────────────────────────────── */}
        <Text style={styles.secao}>Cardápios gerados</Text>
        <View style={styles.card}>
          {paciente.cardapiosRecentes.length === 0 ? (
            <View style={styles.vazio}>
              <Feather name="camera-off" size={18} color={colors.textSecondary} />
              <Text style={styles.vazioTexto}>Nenhum cardápio nos últimos dias</Text>
            </View>
          ) : (
            paciente.cardapiosRecentes.map((c, i) => (
              <View
                key={c.titulo}
                style={[styles.linha, i < paciente.cardapiosRecentes.length - 1 && styles.divisor]}
              >
                <View style={styles.iconeRedondo}>
                  <Feather name="clock" size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.linhaTitulo}>{c.titulo}</Text>
                  <Text style={styles.linhaInfo}>{c.quando}</Text>
                </View>
                <Text style={styles.linhaValor}>{c.calorias} kcal</Text>
              </View>
            ))
          )}
        </View>

        {/* ── A ação que o nutricionista tem ───────────────────────────── */}
        <Text style={styles.secao}>Metas</Text>
        <View style={styles.card}>
          {editandoMetas ? (
            <>
              <Text style={styles.rotuloCampo}>Meta diária de calorias</Text>
              <TextInput
                style={styles.campo}
                keyboardType="number-pad"
                inputAccessoryViewID={ID_BARRA_TECLADO}
                value={metaCalorias}
                onChangeText={(t) => setMetaCalorias(t.replace(/\D/g, ""))}
                maxLength={5}
              />
              <Text style={styles.ajuda}>
                Substitui o cálculo automático do app, que é uma estimativa pela fórmula
                de Mifflin-St Jeor.
              </Text>
              <View style={styles.acoes}>
                <TouchableOpacity
                  style={[styles.botao, styles.botaoSecundario]}
                  onPress={() => setEditandoMetas(false)}
                >
                  <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botao, styles.botaoPrimario]} onPress={salvarMetas}>
                  <Text style={styles.botaoPrimarioTexto}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity style={styles.ajustar} onPress={() => setEditandoMetas(true)}>
              <Feather name="sliders" size={17} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.linhaTitulo}>Ajustar metas</Text>
                <Text style={styles.linhaInfo}>Defina calorias e macros no lugar da fórmula</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <BarraTeclado />
    </KeyboardAvoidingView>
  );
}

function ResumoSemana({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={styles.resumoItem}>
      <Text style={styles.resumoValor}>{valor}</Text>
      <Text style={styles.resumoRotulo}>{rotulo}</Text>
    </View>
  );
}

function Indicador({ icone, valor, rotulo }: { icone: any; valor: string; rotulo: string }) {
  return (
    <View style={styles.indicador}>
      <Feather name={icone} size={15} color={colors.primary} />
      <Text style={styles.indicadorValor}>{valor}</Text>
      <Text style={styles.indicadorRotulo}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.background },
  conteudo: { padding: 20, paddingTop: 52, paddingBottom: 36, gap: 12 },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: 14 },
  nome: { fontSize: 19, fontWeight: "700", color: colors.textPrimary },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, padding: 16, gap: 12,
  },
  rotuloSecao: { fontSize: 11, color: colors.textSecondary, fontWeight: "700" },
  secao: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginTop: 8 },

  heroLinha: { flexDirection: "row", alignItems: "baseline", gap: 7 },
  hero: { fontSize: 36, fontWeight: "700", color: colors.textPrimary },
  heroUnidade: { fontSize: 13, color: colors.textSecondary },
  saldoLinha: { marginTop: -4 },
  saldoTexto: { fontSize: 11, color: colors.textSecondary },
  saldoValor: { fontWeight: "700", color: colors.textPrimary },
  macros: { flexDirection: "row", gap: 14, marginTop: 4 },

  secaoLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  sincronizado: { flexDirection: "row", alignItems: "center", gap: 4 },
  sincronizadoTexto: { fontSize: 10, color: colors.textSecondary },
  cardTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  cardTopoValor: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  cardTopoUnidade: { fontSize: 10, fontWeight: "400", color: colors.textSecondary },
  resumoSemana: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 2,
  },
  resumoItem: { flex: 1, alignItems: "center", gap: 2 },
  resumoValor: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  resumoRotulo: { fontSize: 10, color: colors.textSecondary },
  indicadores: { flexDirection: "row", gap: 8 },
  indicador: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, paddingVertical: 13, alignItems: "center", gap: 3,
  },
  indicadorValor: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginTop: 3 },
  indicadorRotulo: { fontSize: 9, color: colors.textSecondary },

  linha: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 9 },
  divisor: { borderBottomWidth: 1, borderBottomColor: colors.border },
  linhaTitulo: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  linhaHora: { fontWeight: "400", color: colors.textSecondary, fontSize: 11 },
  linhaInfo: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  linhaValor: { fontSize: 12, fontWeight: "700", color: colors.textPrimary },
  iconeRedondo: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: "#EAF3E4",
    alignItems: "center", justifyContent: "center",
  },
  vazio: { alignItems: "center", gap: 7, paddingVertical: 12 },
  vazioTexto: { fontSize: 12, color: colors.textSecondary },

  pesoCard: { flexDirection: "row", alignItems: "center" },
  pesoValor: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, marginTop: 3 },
  pesoDelta: { flexDirection: "row", alignItems: "center", gap: 5 },
  pesoDeltaTexto: { fontSize: 11, color: colors.textSecondary },

  ajustar: { flexDirection: "row", alignItems: "center", gap: 11 },
  rotuloCampo: { fontSize: 11, color: colors.textSecondary, fontWeight: "700" },
  campo: {
    height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, fontSize: 18, fontWeight: "700", color: colors.textPrimary,
  },
  ajuda: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },
  acoes: { flexDirection: "row", gap: 10 },
  botao: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  botaoPrimario: { backgroundColor: colors.primary },
  botaoPrimarioTexto: { color: colors.surface, fontWeight: "700", fontSize: 14 },
  botaoSecundario: { borderWidth: 1, borderColor: colors.border },
  botaoSecundarioTexto: { color: colors.textSecondary, fontWeight: "600", fontSize: 14 },
});
