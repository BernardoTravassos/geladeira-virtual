import React from "react";
import { View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../theme/colors";

export default function WizardScreen({ navigation }: any) {
  async function handleWizardComplete() {
    // Marca que o usuário já respondeu o questionário — assim ele não vê essa tela de novo
    await AsyncStorage.setItem("@geladeira:wizardDone", "true");
    navigation.replace("Home");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Questionário inicial</Text>
      {/* TODO: telas sequenciais (nome, idade, sexo, altura, objetivo, restrições...),
          salvando cada resposta e enviando tudo pro POST /profile ao final */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, color: colors.textPrimary },
});
