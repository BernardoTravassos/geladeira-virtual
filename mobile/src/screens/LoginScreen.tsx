import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, degrade } from "../theme/colors";
import { LinearGradient } from "expo-linear-gradient";
import Logo from "../components/Logo";
import { login, register, getProfile, descreverFalhaDeRede } from "../services/api";
import CampoSenha from "../components/CampoSenha";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modoCadastro, setModoCadastro] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function handleEntrar() {
    if (!email || !senha) {
      Alert.alert("Ops", "Preencha e-mail e senha.");
      return;
    }

    setCarregando(true);
    try {
      const token = modoCadastro
        ? await register(email, senha)
        : await login(email, senha);

      await AsyncStorage.setItem("@geladeira:token", token);

      // Conta nova → perguntas. Conta existente com perfil → tela principal.
      const perfil = modoCadastro ? null : await getProfile();
      if (perfil) {
        await AsyncStorage.setItem("@geladeira:wizardDone", "true");
        navigation.replace("Home");
      } else {
        await AsyncStorage.removeItem("@geladeira:wizardDone");
        navigation.replace("Wizard");
      }
    } catch (erro: any) {
      const falhaDeRede = descreverFalhaDeRede(erro);
      const mensagem =
        erro?.response?.data?.error || "Não foi possível entrar. Tente de novo.";

      // __DEV__ é verdadeiro só rodando pelo Expo; num app publicado o
      // detalhe técnico não aparece para o usuário.
      Alert.alert(
        "Erro",
        __DEV__ && falhaDeRede ? `${mensagem}\n\n[diagnóstico] ${falhaDeRede}` : mensagem
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={degrade.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.decoracao1} />
        <View style={styles.decoracao2} />
        <View style={styles.logoCaixa}>
          <Logo tamanho={78} />
        </View>
        <Text style={styles.title}>Sua geladeira,{"\n"}mais esperta</Text>
        <Text style={styles.subtitle}>
          Cardápios feitos pra você, a partir do que já tem em casa
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
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

        <TouchableOpacity style={styles.button} onPress={handleEntrar} disabled={carregando}>
          {carregando ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>
              {modoCadastro ? "Criar conta" : "Entrar"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setModoCadastro(!modoCadastro)}>
          <Text style={styles.link}>
            {modoCadastro ? "Já tenho conta — entrar" : "Não tenho conta — cadastrar"}
          </Text>
        </TouchableOpacity>

        {/* Só faz sentido para quem já tem conta — no modo cadastro, fica oculto. */}
        {!modoCadastro && (
          <TouchableOpacity onPress={() => navigation.navigate("EsqueciSenha")}>
            <Text style={styles.linkDiscreto}>Esqueci minha senha</Text>
          </TouchableOpacity>
        )}

        <View style={styles.separador} />

        <TouchableOpacity onPress={() => navigation.navigate("NutriLogin")}>
          <Text style={styles.linkDiscreto}>Sou nutricionista parceiro</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: {
    flex: 0.58,
    justifyContent: "flex-end",
    padding: 24,
    overflow: "hidden",
  },
  decoracao1: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(255,255,255,0.06)", top: -90, right: -70 },
  decoracao2: { position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(255,255,255,0.05)", top: 70, left: -60 },
  logoCaixa: { width: 96, height: 96, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.background,
    marginBottom: 8,
  },
  subtitle: { fontSize: 13, color: "#D9EDE0" },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: 24,
    gap: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  button: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: { color: colors.background, fontWeight: "600", fontSize: 15 },
  link: {
    textAlign: "center",
    color: colors.primary,
    fontSize: 13,
    marginTop: 10,
  },
  separador: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 16,
    marginBottom: 4,
  },
  linkDiscreto: {
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
