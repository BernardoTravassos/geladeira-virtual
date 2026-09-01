import React from "react";
import { View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../theme/colors";

export default function LoginScreen({ navigation }: any) {
  async function handleLoginSuccess(token: string) {
    // Salva o token localmente — é isso que faz o login "ficar lembrado"
    // e pular a tela de login nas próximas vezes que o app abrir.
    await AsyncStorage.setItem("@geladeira:token", token);
    navigation.replace("Wizard");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tela de login</Text>
      {/* TODO: formulário de e-mail/senha ou login social, chamando POST /auth/login */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, color: colors.textPrimary },
});
