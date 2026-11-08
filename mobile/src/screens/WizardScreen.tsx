import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useState, useMemo } from "react";
import { useFeedback } from "../components/Feedback";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { saveProfile } from "../services/api";
import BarraTeclado, { ID_BARRA_TECLADO } from "../components/BarraTeclado";
import { interpretarNumero, type RegraNumero } from "../utils/numeros";
import { REGRAS, OPCOES_INTOLERANCIA } from "../utils/camposPerfil";
import { NIVEIS_ATIVIDADE, nivelPorRotulo } from "../utils/nutricao";

type Pergunta = {
  chave: string;
  titulo: string;
  tipo: "texto" | "numero" | "selecao" | "intolerancia";
  opcoes?: string[];
  opcional?: boolean;
  placeholder?: string;
  /** Só para tipo "numero". As faixas têm que bater com as do backend (PerfilRequest.cs). */
  regra?: RegraNumero;
};


const perguntas: Pergunta[] = [
  { chave: "nome", titulo: "Qual é o seu nome?", tipo: "texto", placeholder: "Seu nome" },
  {
    chave: "idade",
    titulo: "Qual é a sua idade?",
    tipo: "numero",
    placeholder: "Ex: 28",
    regra: REGRAS.idade,
  },
  { chave: "sexo", titulo: "Qual é o seu sexo?", tipo: "selecao", opcoes: ["Masculino", "Feminino", "Outro"] },
  {
    chave: "alturaCm",
    titulo: "Qual é a sua altura (cm)?",
    tipo: "numero",
    placeholder: "Ex: 175 (em centímetros)",
    regra: REGRAS.alturaCm,
  },
  {
    chave: "pesoKg",
    titulo: "Qual é o seu peso (kg)?",
    tipo: "numero",
    placeholder: "Ex: 70,5",
    regra: REGRAS.pesoKg,
  },
  {
    chave: "objetivo",
    titulo: "Qual é o seu objetivo?",
    tipo: "selecao",
    opcoes: ["Emagrecer", "Ganhar massa", "Manter o peso", "Comer mais saudável"],
  },
  {
    chave: "nivelAtividade",
    titulo: "Qual é o seu nível de atividade física?",
    tipo: "selecao",
    opcoes: NIVEIS_ATIVIDADE.map((n) => n.rotulo),
  },
  { chave: "vegano", titulo: "Você é vegano?", tipo: "selecao", opcoes: ["Sim", "Não"] },
  {
    chave: "intolerancias",
    titulo: "Alguma intolerância alimentar?",
    tipo: "intolerancia",
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
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const feedback = useFeedback();
  const insets = useSafeAreaInsets();
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  // Intolerância: a resposta "Sim"/"Não" fica em respostas.intolerancias; o que
  // foi marcado (pode ser mais de uma) e o texto de "Outra" ficam à parte.
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [outraIntolerancia, setOutraIntolerancia] = useState("");

  const pergunta = perguntas[indice];
  const respostaAtual = respostas[pergunta.chave] || "";
  const intoleranciasEscolhidas = [
    ...marcadas.filter((m) => m !== "Outra"),
    ...(marcadas.includes("Outra") && outraIntolerancia.trim() ? [outraIntolerancia.trim()] : []),
  ];
  const podeContinuar =
    pergunta.tipo === "intolerancia"
      ? respostaAtual === "Não" || (respostaAtual === "Sim" && intoleranciasEscolhidas.length > 0)
      : pergunta.opcional || respostaAtual.trim().length > 0;

  function alternarIntolerancia(opcao: string) {
    setMarcadas((prev) => (prev.includes(opcao) ? prev.filter((o) => o !== opcao) : [...prev, opcao]));
  }

  function responderTemIntolerancia(valor: "Sim" | "Não") {
    atualizarResposta(valor);
    if (valor === "Não") {
      setMarcadas([]);
      setOutraIntolerancia("");
    }
  }

  function atualizarResposta(valor: string) {
    setRespostas((prev) => ({ ...prev, [pergunta.chave]: valor }));
  }

  /** Valor já validado e normalizado (vírgula → ponto, arredondado) de uma resposta numérica. */
  function numeroDe(chave: string): number {
    const regra = perguntas.find((p) => p.chave === chave)?.regra;
    const resultado = regra ? interpretarNumero(respostas[chave] ?? "", regra) : null;
    if (!resultado || "erro" in resultado) throw new Error(`Resposta numérica inválida: ${chave}`);
    return resultado.valor;
  }

  async function avancar() {
    if (!podeContinuar) return;

    // Valida AGORA, não na última pergunta: descobrir depois de responder
    // tudo que a idade estava errada obrigava a pessoa a voltar e refazer.
    if (pergunta.tipo === "numero" && pergunta.regra) {
      const resultado = interpretarNumero(respostaAtual, pergunta.regra);
      if ("erro" in resultado) {
        Keyboard.dismiss();
        Alert.alert("Confira o valor", resultado.erro);
        return;
      }
    }

    if (indice < perguntas.length - 1) {
      setIndice(indice + 1);
      return;
    }

    setEnviando(true);
    try {
      await saveProfile({
        nome: respostas.nome,
        idade: numeroDe("idade"),
        sexo: respostas.sexo,
        alturaCm: numeroDe("alturaCm"),
        pesoKg: numeroDe("pesoKg"),
        objetivo: respostas.objetivo,
        praticaExercicio: nivelPorRotulo(respostas.nivelAtividade)?.chave !== "sedentario",
        nivelAtividade: nivelPorRotulo(respostas.nivelAtividade)?.chave,
        intolerancias: intoleranciasEscolhidas.length ? intoleranciasEscolhidas.join(", ") : undefined,
        vegano: respostas.vegano === "Sim",
        preferenciaPreparo: respostas.preferenciaPreparo,
        tempoDisponivel: respostas.tempoDisponivel,
      });

      await AsyncStorage.setItem("@geladeira:wizardDone", "true");
      feedback.sucesso("Perfil salvo!", "Tudo pronto para você começar.", { atraso: 450 });
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
    <KeyboardAvoidingView
      style={styles.raiz}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Tocar fora do campo fecha o teclado. Os botões de dentro seguem funcionando. */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[styles.container, { paddingBottom: 24 + insets.bottom }]}>
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
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
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
                keyboardType="decimal-pad"
                inputAccessoryViewID={ID_BARRA_TECLADO}
                value={respostaAtual}
                onChangeText={atualizarResposta}
              />
            )}

            {pergunta.tipo === "intolerancia" && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 10 }}
              >
                {(["Sim", "Não"] as const).map((opcao) => {
                  const selecionado = respostaAtual === opcao;
                  return (
                    <TouchableOpacity
                      key={opcao}
                      style={[styles.opcao, selecionado && styles.opcaoSelecionada]}
                      onPress={() => responderTemIntolerancia(opcao)}
                    >
                      <Text style={[styles.opcaoTexto, selecionado && styles.opcaoTextoSelecionado]}>{opcao}</Text>
                      {selecionado && <Feather name="check" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}

                {respostaAtual === "Sim" && (
                  <View style={{ gap: 10, marginTop: 6 }}>
                    <Text style={styles.subtitulo}>Qual(is)? Pode marcar mais de uma.</Text>
                    <View style={styles.chips}>
                      {OPCOES_INTOLERANCIA.map((opcao) => {
                        const marcada = marcadas.includes(opcao);
                        return (
                          <TouchableOpacity
                            key={opcao}
                            style={[styles.chip, marcada && styles.chipMarcado]}
                            onPress={() => alternarIntolerancia(opcao)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: marcada }}
                          >
                            {marcada && <Feather name="check" size={14} color="#fff" />}
                            <Text style={[styles.chipTexto, marcada && styles.chipTextoMarcado]}>{opcao}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {marcadas.includes("Outra") && (
                      <TextInput
                        style={styles.input}
                        placeholder="Qual outra? Ex: milho"
                        placeholderTextColor={colors.textSecondary}
                        maxLength={60}
                        value={outraIntolerancia}
                        onChangeText={setOutraIntolerancia}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    )}
                  </View>
                )}
              </ScrollView>
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
              <ActivityIndicator color={colors.textoSobreMarca} />
            ) : (
              <Text style={styles.buttonText}>
                {indice === perguntas.length - 1 ? "Concluir" : "Continuar"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
      <BarraTeclado />
    </KeyboardAvoidingView>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.botao, borderRadius: 3 },
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
  opcaoSelecionada: { borderColor: colors.primary, backgroundColor: colors.verdeSuave },
  opcaoTexto: { fontSize: 14, color: colors.textPrimary },
  opcaoTextoSelecionado: { color: colors.primary, fontWeight: "600" },
  button: {
    height: 48,
    backgroundColor: colors.botao,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  subtitulo: { fontSize: 13, color: colors.textSecondary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipMarcado: { backgroundColor: colors.botao, borderColor: colors.primary },
  chipTexto: { fontSize: 14, color: colors.textPrimary },
  chipTextoMarcado: { color: "#fff", fontWeight: "600" },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.textoSobreMarca, fontWeight: "600", fontSize: 15 },
});