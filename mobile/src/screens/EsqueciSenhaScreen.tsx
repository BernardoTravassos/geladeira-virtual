import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useState, useMemo } from "react";
import { SENHA_MINIMA, validarEmail, validarSenha } from "../utils/validacao";
import { useFeedback } from "../components/Feedback";
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
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { solicitarCodigoSenha, redefinirSenha } from "../services/api";
import { DEV } from "../config/dev";
import CampoSenha from "../components/CampoSenha";
import BarraTeclado, { ID_BARRA_TECLADO } from "../components/BarraTeclado";


export default function EsqueciSenhaScreen({ navigation }: any) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const feedback = useFeedback();
  const [etapa, setEtapa] = useState<"email" | "codigo">("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviarCodigo() {
    const limpo = email.trim().toLowerCase();
    const erroEmail = validarEmail(limpo);
    if (erroEmail) {
      Alert.alert("Ops", erroEmail);
      return;
    }

    setCarregando(true);
    try {
      if (!DEV.SIMULAR_RECUPERACAO_SENHA) {
        await solicitarCodigoSenha(limpo);
      }
      setEmail(limpo);
      setEtapa("codigo");
    } catch (erro: any) {
      const mensagem =
        erro?.response?.data?.error || "Não foi possível enviar o código. Tente de novo.";
      Alert.alert("Erro", mensagem);
    } finally {
      setCarregando(false);
    }
  }

  async function confirmarNovaSenha() {
    if (codigo.trim().length !== 6) {
      Alert.alert("Ops", "O código tem 6 dígitos.");
      return;
    }
    const erroSenha = validarSenha(novaSenha);
    if (erroSenha) {
      Alert.alert("Ops", erroSenha);
      return;
    }
    // Confirmação existe para evitar erro de digitação: a pessoa trocaria a
    // senha por algo que ela não sabe qual é, e ficaria trancada fora.
    if (novaSenha !== confirmacao) {
      Alert.alert("Ops", "As duas senhas não são iguais.");
      return;
    }

    setCarregando(true);
    try {
      if (DEV.SIMULAR_RECUPERACAO_SENHA) {
        if (codigo.trim() !== "000000") {
          Alert.alert("Código inválido", "No modo de simulação, o código é 000000.");
          return;
        }

        // A simulação não chama o backend, então NADA foi alterado. Dizer
        // "senha alterada" aqui faria você tentar entrar com a senha nova e
        // tomar "e-mail ou senha incorretos" sem entender o motivo.
        Alert.alert(
          "Simulação concluída",
          "As telas funcionaram, mas a senha NÃO foi alterada: " +
            "SIMULAR_RECUPERACAO_SENHA está ligado e o backend não foi chamado. " +
            "Entre com a senha antiga.",
          [{ text: "Entendi", onPress: () => navigation.replace("Login") }]
        );
        return;
      }

      await redefinirSenha(email, codigo.trim(), novaSenha);

      feedback.sucesso("Senha alterada!", "Entre com a sua nova senha.", { atraso: 450, duracao: 2300 });
      navigation.replace("Login");
    } catch (erro: any) {
      const mensagem =
        erro?.response?.data?.error || "Não foi possível redefinir a senha. Tente de novo.";
      Alert.alert("Erro", mensagem);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <TouchableOpacity
          style={styles.voltar}
          onPress={() => (etapa === "codigo" ? setEtapa("email") : navigation.replace("Login"))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        {etapa === "email" ? (
          <>
            <Text style={styles.titulo}>Esqueceu a senha?</Text>
            <Text style={styles.subtitulo}>
              Digite o e-mail da sua conta e enviamos um código de 6 dígitos para você criar
              uma senha nova.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />

            <TouchableOpacity style={styles.botao} onPress={enviarCodigo} disabled={carregando}>
              {carregando ? (
                <ActivityIndicator color={colors.textoSobreMarca} />
              ) : (
                <Text style={styles.botaoTexto}>Enviar código</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.titulo}>Confira seu e-mail</Text>
            {/*
              Esta mensagem é deliberadamente ambígua ("se existe uma conta").
              Confirmar que o e-mail existe entregaria a quem está sondando a
              lista de quem tem conta no app.
            */}
            <Text style={styles.subtitulo}>
              Se existe uma conta com <Text style={styles.destaque}>{email}</Text>, enviamos um
              código de 6 dígitos. Ele vale por 15 minutos.
            </Text>

            <TextInput
              style={[styles.input, styles.inputCodigo]}
              placeholder="000000"
              placeholderTextColor={colors.border}
              keyboardType="number-pad"
              inputAccessoryViewID={ID_BARRA_TECLADO}
              maxLength={6}
              value={codigo}
              onChangeText={(texto) => setCodigo(texto.replace(/\D/g, ""))}
            />

            <CampoSenha
              placeholder={`Nova senha (mín. ${SENHA_MINIMA} caracteres e 1 maiúscula)`}
              textContentType="newPassword"
              value={novaSenha}
              onChangeText={setNovaSenha}
            />

            <CampoSenha
              placeholder="Repita a nova senha"
              textContentType="newPassword"
              value={confirmacao}
              onChangeText={setConfirmacao}
            />

            <TouchableOpacity
              style={styles.botao}
              onPress={confirmarNovaSenha}
              disabled={carregando}
            >
              {carregando ? (
                <ActivityIndicator color={colors.textoSobreMarca} />
              ) : (
                <Text style={styles.botaoTexto}>Redefinir senha</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setEtapa("email")}>
              <Text style={styles.link}>Não recebi — enviar de novo</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.replace("Login")}>
          <Text style={styles.link}>Voltar para o login</Text>
        </TouchableOpacity>
      </ScrollView>
      <BarraTeclado />
    </KeyboardAvoidingView>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  conteudo: { padding: 24, paddingTop: 56, gap: 12 },
  voltar: { alignSelf: "flex-start", marginBottom: 12 },
  titulo: { fontSize: 24, fontWeight: "700", color: colors.textPrimary },
  subtitulo: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  destaque: { color: colors.textPrimary, fontWeight: "600" },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputCodigo: {
    fontSize: 24,
    letterSpacing: 10,
    textAlign: "center",
    fontWeight: "700",
  },
  botao: {
    height: 48,
    backgroundColor: colors.botao,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  botaoTexto: { color: colors.textoSobreMarca, fontWeight: "600", fontSize: 15 },
  link: {
    textAlign: "center",
    color: colors.primary,
    fontSize: 13,
    marginTop: 10,
  },
});
