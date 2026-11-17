import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import CampoSenha from "../components/CampoSenha";
import { descreverFalhaDeRede } from "../services/api";
import { entrar, cadastrarNutricionista, guardarSessao } from "../services/nutri";
import { prepararDadosLocais } from "../utils/dadosLocais";
import { validarEmail, validarSenha } from "../utils/validacao";

/**
 * Entrada da área do nutricionista: login e cadastro de verdade, pela API.
 * O tipo da conta vem do servidor — uma conta de paciente não entra aqui.
 * O CRN é guardado como informado; a conferência no conselho ainda é manual.
 */
export default function NutriLoginScreen({ navigation }: any) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [crn, setCrn] = useState("");
  const [cadastro, setCadastro] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    const erro = validarEmail(email) ?? validarSenha(senha)
      ?? (cadastro && nome.trim().length < 3 ? "Informe o seu nome completo." : null)
      ?? (cadastro && !/^[A-Za-z0-9 \-/.]{4,30}$/.test(crn.trim()) ? "Informe o CRN, como CRN-3 12345." : null);
    if (erro) {
      Alert.alert("Ops", erro);
      return;
    }
    const emailLimpo = email.trim().toLowerCase();
    setCarregando(true);
    try {
      const r = cadastro
        ? await cadastrarNutricionista({ email: emailLimpo, senha, nome: nome.trim(), crn: crn.trim() })
        : await entrar(emailLimpo, senha);
      if (r.papel !== "nutricionista") {
        Alert.alert("Conta de paciente", "Esta conta não é de nutricionista. Entre pelo login normal do app.");
        return;
      }
      await guardarSessao(r.token, "nutricionista");
      await prepararDadosLocais(emailLimpo, cadastro); // não deixa o diário de um paciente do aparelho vazar para esta conta
      navigation.replace("NutriPacientes");
    } catch (e: any) {
      const rede = descreverFalhaDeRede(e);
      const msg = e?.response?.data?.error || e?.response?.data?.errors?.[Object.keys(e.response.data.errors)[0]]?.[0] || "Não foi possível entrar. Tente de novo.";
      Alert.alert("Erro", __DEV__ && rede ? `${msg}\n\n[diagnóstico] ${rede}` : msg);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.hero, cadastro && { flex: 0.28 }]}>
        <TouchableOpacity
          onPress={() => navigation.replace("Login")}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={20} color={colors.textoSobreMarca} />
        </TouchableOpacity>

        <View style={styles.selo}>
          <Feather name="clipboard" size={18} color={colors.primary} />
          <Text style={styles.seloTexto}>Área do nutricionista</Text>
        </View>

        <Text style={styles.titulo}>Acompanhe seus{"\n"}pacientes</Text>
        <Text style={styles.subtitulo}>
          Alimentação, gasto calórico e evolução — tudo em um lugar
        </Text>
      </View>

      <View style={styles.card}>
        {cadastro && (
          <>
            <TextInput style={styles.input} placeholder="Nome completo" placeholderTextColor={colors.textSecondary} value={nome} onChangeText={setNome} autoCapitalize="words" />
            <TextInput style={styles.input} placeholder="CRN (ex.: CRN-3 12345)" placeholderTextColor={colors.textSecondary} value={crn} onChangeText={setCrn} autoCapitalize="characters" autoCorrect={false} />
          </>
        )}
        <TextInput
          style={styles.input}
          placeholder="E-mail profissional"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <CampoSenha
          placeholder="Senha"
          textContentType="password"
          value={senha}
          onChangeText={setSenha}
        />

        <TouchableOpacity style={styles.botao} onPress={enviar} disabled={carregando}>
          {carregando ? (
            <ActivityIndicator color={colors.textoSobreMarca} />
          ) : (
            <Text style={styles.botaoTexto}>{cadastro ? "Criar conta" : "Entrar"}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setCadastro(!cadastro)}>
          <Text style={styles.rodape}>
            {cadastro ? "Já tem conta? Entrar" : "Ainda não tem conta? Cadastre-se como nutricionista"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { flex: 0.52, backgroundColor: colors.botao, justifyContent: "space-between", padding: 24, paddingTop: 56 },
  selo: {
    flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start",
    backgroundColor: colors.background, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999,
  },
  seloTexto: { fontSize: 11, fontWeight: "700", color: colors.primary },
  titulo: { fontSize: 26, fontWeight: "700", color: colors.textoSobreMarca, marginTop: 14 },
  subtitulo: { fontSize: 13, color: "#D9EDE0", marginTop: 6 },
  card: {
    flex: 1, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -20, padding: 24, gap: 12,
  },
  input: {
    height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.surface,
  },
  botao: {
    height: 48, backgroundColor: colors.botao, borderRadius: 12,
    justifyContent: "center", alignItems: "center", marginTop: 4,
  },
  botaoTexto: { color: colors.textoSobreMarca, fontWeight: "600", fontSize: 15 },
  rodape: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 6, lineHeight: 17 },
});
