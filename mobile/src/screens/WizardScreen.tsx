import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../theme/colors";
import { saveProfile } from "../services/api";

type Pergunta = {
  chave: string;
  titulo: string;
  tipo: "texto" | "numero" | "selecao";
  opcoes?: string[];
  opcional?: boolean;
  placeholder?: string;
};

const perguntas: Pergunta[] = [
  { chave: "nome", titulo: "Qual é o seu nome?", tipo: "texto", placeholder: "Seu nome" },
  { chave: "idade", titulo: "Qual é a sua idade?", tipo: "numero", placeholder: "Ex: 28" },
  { chave: "sexo", titulo: "Qual é o seu sexo?", tipo: "selecao", opcoes: ["Masculino", "Feminino", "Outro"] },
  { chave: "alturaCm", titulo: "Qual é a sua altura (cm)?", tipo: "numero", placeholder: "Ex: 170" },
  {
    chave: "objetivo",
    titulo: "Qual é o seu objetivo?",
    tipo: "selecao",
    opcoes: ["Emagrecer", "Ganhar massa", "Manter o peso", "Comer mais saudável"],
  },
  { chave: "praticaExercicio", titulo: "Você pratica exercício?", tipo: "selecao", opcoes: ["Sim", "Não"] },
  { chave: "vegano", titulo: "Você é vegano?", tipo: "selecao", opcoes: ["Sim", "Não"] },
  {
    chave: "intolerancias",
    titulo: "Alguma intolerância alimentar?",
    tipo: "texto",
    placeholder: "Ex: lactose, glúten (opcional)",
    opcional: true,
  },
  {
    chave: "preferenciaPreparo",
    titulo: "Prefere comidas práticas ou elaboradas?",
    tipo: "selecao",
    opcoes: ["Prático", "Elaborado"],
  },
  {
    chave: "tempoDisponivel",
    titulo: "Quanto tempo tem pra cozinhar?",
    tipo: "selecao",
    opcoes: ["Pouco tempo", "Tempo razoável", "Bastante tempo"],
  },
];

export default function WizardScreen({ navigation }: any) {
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const pergunta = perguntas[indice];
  const respostaAtual = respostas[pergunta.chave] || "";
  const podeContinuar = pergunta.opcional || respostaAtual.trim().length > 0;

  function atualizarResposta(valor: string) {
    setRespostas((prev) => ({ ...prev, [pergunta.chave]: valor }));
  }

  async function avancar() {
    if (!podeContinuar) return;

    if (indice < perguntas.length - 1) {
      setIndice(indice + 1);
      return;
    }

    setEnviando(true);
    try {
      await saveProfile({
        nome: respostas.nome,
        idade: Number(respostas.idade),
        sexo: respostas.sexo,
        alturaCm: Number(respostas.alturaCm),
        objetivo: respostas.objetivo,
        praticaExercicio: respostas.praticaExercicio === "Sim",
        intolerancias: respostas.intolerancias || undefined,
        vegano: respostas.vegano === "Sim",
        preferenciaPreparo: respostas.preferenciaPreparo,
        tempoDisponivel: respostas.tempoDisponivel,
      });

      await AsyncStorage.setItem("@geladeira:wizardDone", "true");
      navigation.replace("Home");
    } catch (erro: any) {
      const mensagem = erro?.response?.data?.error || "Não foi possível salvar. Tente de novo.";
      Alert.alert("Erro", mensagem);
    } finally {
      setEnviando(false);
    }
  }

  function voltar() {
    if (indice === 0) {
      navigation.replace("Login");
    } else {
      setIndice(indice - 1);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={voltar}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((indice + 1) / perguntas.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <Text style={styles.stepLabel}>
        Pergunta {indice + 1} de {perguntas.length}
      </Text>
      <Text style={styles.title}>{pergunta.titulo}</Text>

      <View style={styles.content}>
        {pergunta.tipo === "texto" && (
          <TextInput
            style={styles.input}
            placeholder={pergunta.placeholder}
            placeholderTextColor={colors.textSecondary}
            value={respostaAtual}
            onChangeText={atualizarResposta}
          />
        )}

        {pergunta.tipo === "numero" && (
          <TextInput
            style={styles.input}
            placeholder={pergunta.placeholder}
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={respostaAtual}
            onChangeText={atualizarResposta}
          />
        )}

        {pergunta.tipo === "selecao" &&
          pergunta.opcoes?.map((opcao) => {
            const selecionado = respostaAtual === opcao;
            return (
              <TouchableOpacity
                key={opcao}
                style={[styles.opcao, selecionado && styles.opcaoSelecionada]}
                onPress={() => atualizarResposta(opcao)}
              >
                <Text style={[styles.opcaoTexto, selecionado && styles.opcaoTextoSelecionado]}>
                  {opcao}
                </Text>
                {selecionado && <Feather name="check" size={16} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
      </View>

      <TouchableOpacity
        style={[styles.button, !podeContinuar && styles.buttonDisabled]}
        onPress={avancar}
        disabled={!podeContinuar || enviando}
      >
        {enviando ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.buttonText}>
            {indice === perguntas.length - 1 ? "Concluir" : "Continuar"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
  stepLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600", marginBottom: 6 },
  title: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 20 },
  content: { flex: 1, gap: 10 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  opcao: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  opcaoSelecionada: { borderColor: colors.primary, backgroundColor: "#EAF3E4" },
  opcaoTexto: { fontSize: 14, color: colors.textPrimary },
  opcaoTextoSelecionado: { color: colors.primary, fontWeight: "600" },
  button: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.background, fontWeight: "600", fontSize: 15 },
});