import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import CampoSenha from "../components/CampoSenha";

/**
 * Entrada da área do nutricionista.
 *
 * ⚠️ DEMONSTRAÇÃO: aceita qualquer e-mail e senha. Não há backend de
 * nutricionista ainda — quando houver, isto chama /auth/login como a tela de
 * pessoa física, e o tipo da conta vem no token.
 */
export default function NutriLoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  function entrar() {
    if (!email || !senha) {
      Alert.alert("Ops", "Preencha e-mail e senha.");
      return;
    }
    setCarregando(true);
    setTimeout(() => {
      setCarregando(false);
      navigation.replace("NutriPacientes");
    }, 500);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.hero}>
        <TouchableOpacity
          onPress={() => navigation.replace("Login")}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={20} color={colors.background} />
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

        <TouchableOpacity style={styles.botao} onPress={entrar} disabled={carregando}>
          {carregando ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.botaoTexto}>Entrar</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.rodape}>
          Ainda não é parceiro? Fale com a gente para conhecer os planos.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { flex: 0.52, backgroundColor: colors.primary, justifyContent: "space-between", padding: 24, paddingTop: 56 },
  selo: {
    flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start",
    backgroundColor: colors.background, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999,
  },
  seloTexto: { fontSize: 11, fontWeight: "700", color: colors.primary },
  titulo: { fontSize: 26, fontWeight: "700", color: colors.background, marginTop: 14 },
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
    height: 48, backgroundColor: colors.primary, borderRadius: 12,
    justifyContent: "center", alignItems: "center", marginTop: 4,
  },
  botaoTexto: { color: colors.surface, fontWeight: "600", fontSize: 15 },
  rodape: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 6, lineHeight: 17 },
});
