import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { NUTRICIONISTA, PACIENTES, type Paciente } from "../mocks/nutricionista";

/** Vagas livres aparecem como espaço vazio, para o limite do plano ficar visível. */
export default function NutriPacientesScreen({ navigation }: any) {
  const vagasLivres = NUTRICIONISTA.vagas - PACIENTES.length;

  return (
    <View style={styles.tela}>
      <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecalho}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ola}>Bom dia</Text>
            <Text style={styles.nome}>{NUTRICIONISTA.nome}</Text>
            <Text style={styles.crn}>{NUTRICIONISTA.crn}</Text>
          </View>
          <TouchableOpacity
            style={styles.botaoIcone}
            onPress={() => navigation.replace("Login")}
            accessibilityLabel="Sair"
          >
            <Feather name="log-out" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.cardPlano}>
          <View style={styles.planoTopo}>
            <Text style={styles.planoNome}>Plano {NUTRICIONISTA.plano}</Text>
            <Text style={styles.planoVagas}>
              {PACIENTES.length} de {NUTRICIONISTA.vagas} vagas
            </Text>
          </View>
          <View style={styles.vagasLinha}>
            {Array.from({ length: NUTRICIONISTA.vagas }).map((_, i) => (
              <View
                key={i}
                style={[styles.vaga, i < PACIENTES.length ? styles.vagaCheia : styles.vagaLivre]}
              />
            ))}
          </View>
          <Text style={styles.planoRenova}>Renova em {NUTRICIONISTA.renovaEm}</Text>
        </View>

        <Text style={styles.secao}>Pacientes</Text>

        {PACIENTES.map((p) => (
          <CartaoPaciente
            key={p.id}
            paciente={p}
            onPress={() => navigation.navigate("NutriPaciente", { id: p.id })}
          />
        ))}

        {vagasLivres > 0 && (
          <TouchableOpacity
            style={styles.cardVazio}
            onPress={() =>
              Alert.alert(
                "Vaga livre",
                "Quando um assinante do app pedir acompanhamento, ele aparece aqui para você aceitar."
              )
            }
          >
            <Feather name="user-plus" size={18} color={colors.primaryLight} />
            <Text style={styles.cardVazioTexto}>
              {vagasLivres === 1 ? "1 vaga livre" : `${vagasLivres} vagas livres`}
            </Text>
            <Text style={styles.cardVazioSub}>
              Assinantes que pedirem acompanhamento aparecem aqui
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function CartaoPaciente({ paciente, onPress }: { paciente: Paciente; onPress: () => void }) {
  const diferenca = paciente.pesoKg - paciente.pesoInicialKg;
  const semRegistroHoje = paciente.consumidasHoje === 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.avatar}>
        <Text style={styles.avatarTexto}>{paciente.nome.charAt(0)}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.cardNome}>{paciente.nome}</Text>
        <Text style={styles.cardInfo}>
          {paciente.idade} anos · {paciente.objetivo}
        </Text>
        <Text style={styles.cardInfo}>
          {paciente.pesoKg.toFixed(1)} kg
          <Text style={{ color: diferenca < 0 ? colors.primaryLight : colors.textSecondary }}>
            {"  "}
            {diferenca >= 0 ? "+" : ""}
            {diferenca.toFixed(1)} kg
          </Text>
        </Text>
      </View>

      <View style={styles.cardDireita}>
        {/*
          Status é estado, não identidade: cor fixa e reservada, e NUNCA
          sozinha — vem sempre com texto, para quem não distingue as cores.
        */}
        <View style={[styles.selo, semRegistroHoje ? styles.seloAtencao : styles.seloOk]}>
          <Text style={[styles.seloTexto, semRegistroHoje ? styles.seloTextoAtencao : styles.seloTextoOk]}>
            {semRegistroHoje ? "Sem registro" : `${paciente.adesao}% adesão`}
          </Text>
        </View>
        <Text style={styles.cardUltimo}>{paciente.ultimoRegistro}</Text>
        <Feather name="chevron-right" size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.background },
  conteudo: { padding: 20, paddingTop: 52, paddingBottom: 32, gap: 12 },
  cabecalho: { flexDirection: "row", alignItems: "flex-start" },
  ola: { fontSize: 12, color: colors.textSecondary },
  nome: { fontSize: 19, fontWeight: "700", color: colors.textPrimary, marginTop: 2 },
  crn: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  botaoIcone: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#EAF3E4",
    alignItems: "center", justifyContent: "center",
  },

  cardPlano: {
    backgroundColor: colors.primary, borderRadius: 16, padding: 16, gap: 10, marginTop: 4,
  },
  planoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planoNome: { color: colors.background, fontWeight: "700", fontSize: 14 },
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
    width: 42, height: 42, borderRadius: 21, backgroundColor: "#EAF3E4",
    alignItems: "center", justifyContent: "center",
  },
  avatarTexto: { fontSize: 17, fontWeight: "700", color: colors.primary },
  cardNome: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  cardInfo: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  cardDireita: { alignItems: "flex-end", gap: 4 },
  selo: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9 },
  seloOk: { backgroundColor: "#EAF3E4" },
  seloAtencao: { backgroundColor: "#FCEFE7" },
  seloTexto: { fontSize: 10, fontWeight: "700" },
  seloTextoOk: { color: colors.primary },
  seloTextoAtencao: { color: "#B4531F" },
  cardUltimo: { fontSize: 10, color: colors.textSecondary },

  cardVazio: {
    borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.primaryLight,
    backgroundColor: "#F3F8EE", borderRadius: 16, padding: 18, alignItems: "center", gap: 5,
  },
  cardVazioTexto: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  cardVazioSub: { fontSize: 11, color: colors.textSecondary, textAlign: "center" },
});
