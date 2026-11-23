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
import {
  REGRAS,
  OPCOES_INTOLERANCIA,
  OPCOES_CONDICOES,
  OPCOES_GESTACAO,
  OPCOES_RITMO,
  OPCOES_ROTINA,
  OPCOES_DIAS_TREINO,
  OPCOES_DURACAO_TREINO,
  OPCOES_INTENSIDADE,
  chaveDe,
} from "../utils/camposPerfil";
import { nivelDoPerfil } from "../utils/nutricao";

type Pergunta = {
  chave: string;
  titulo: string;
  tipo: "texto" | "numero" | "selecao" | "intolerancia" | "condicoes";
  /** Perguntas condicionais: só aparecem quando isto devolve true. */
  mostrar?: (r: Record<string, string>) => boolean;
  /** Texto de apoio abaixo do título: por que a pergunta importa. */
  dica?: string;
  opcoes?: string[];
  opcional?: boolean;
  placeholder?: string;
  /** Só para tipo "numero". As faixas têm que bater com as do backend (PerfilRequest.cs). */
  regra?: RegraNumero;
};


const querMudarPeso = (r: Record<string, string>) => r.objetivo === "Emagrecer" || r.objetivo === "Ganhar massa";
const treina = (r: Record<string, string>) => !!r.diasTreino && r.diasTreino !== OPCOES_DIAS_TREINO[0].rotulo;

const perguntas: Pergunta[] = [
  { chave: "nome", titulo: "Qual é o seu nome?", tipo: "texto", placeholder: "Seu nome" },
  {
    chave: "idade",
    titulo: "Qual é a sua idade?",
    tipo: "numero",
    placeholder: "Ex: 28",
    regra: REGRAS.idade,
  },
  {
    chave: "sexo",
    titulo: "Qual é o seu sexo?",
    tipo: "selecao",
    opcoes: ["Masculino", "Feminino", "Outro"],
    dica: "Usado na equação do metabolismo, que muda entre homens e mulheres.",
  },
  {
    chave: "gestacao",
    titulo: "Você está grávida ou amamentando?",
    tipo: "selecao",
    opcoes: OPCOES_GESTACAO.map((o) => o.rotulo),
    mostrar: (r) => r.sexo === "Feminino",
    dica: "Nessas fases o corpo precisa de mais calorias e nutrientes, e a meta muda.",
  },
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
    chave: "gorduraPct",
    titulo: "Sabe seu percentual de gordura?",
    tipo: "numero",
    opcional: true,
    placeholder: "Ex: 22 (opcional)",
    regra: REGRAS.gorduraPct,
    dica: "Vem de bioimpedância ou avaliação física. Se não souber, pode pular: o cálculo funciona sem.",
  },
  {
    chave: "objetivo",
    titulo: "Qual é o seu objetivo?",
    tipo: "selecao",
    opcoes: ["Emagrecer", "Ganhar massa", "Manter o peso", "Comer mais saudável"],
  },
  {
    chave: "pesoMetaKg",
    titulo: "Qual peso você quer alcançar (kg)?",
    tipo: "numero",
    placeholder: "Ex: 65",
    regra: REGRAS.pesoMetaKg,
    mostrar: querMudarPeso,
    dica: "Com ele estimamos em quanto tempo você chega lá.",
  },
  {
    chave: "ritmo",
    titulo: "Em que ritmo você quer chegar lá?",
    tipo: "selecao",
    opcoes: OPCOES_RITMO.map((o) => o.rotulo),
    mostrar: querMudarPeso,
    dica: "Quanto mais acelerado, maior o corte (ou acréscimo) de calorias. O moderado é o mais fácil de manter.",
  },
  {
    chave: "rotinaDiaria",
    titulo: "Como é o seu dia a dia, fora do treino?",
    tipo: "selecao",
    opcoes: OPCOES_ROTINA.map((o) => o.rotulo),
    dica: "Quem passa o dia em pé gasta mais do que quem passa sentado, mesmo sem treinar.",
  },
  {
    chave: "diasTreino",
    titulo: "Quantos dias por semana você treina?",
    tipo: "selecao",
    opcoes: OPCOES_DIAS_TREINO.map((o) => o.rotulo),
  },
  {
    chave: "duracaoTreino",
    titulo: "Quanto dura cada treino?",
    tipo: "selecao",
    opcoes: OPCOES_DURACAO_TREINO.map((o) => o.rotulo),
    mostrar: treina,
  },
  {
    chave: "intensidadeTreino",
    titulo: "Qual a intensidade do treino?",
    tipo: "selecao",
    opcoes: OPCOES_INTENSIDADE.map((o) => o.rotulo),
    mostrar: treina,
  },
  {
    chave: "condicoes",
    titulo: "Tem alguma condição de saúde?",
    tipo: "condicoes",
    dica: "Ajuda a deixar a meta mais segura e a avisar o que precisa de acompanhamento.",
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
  // Condições de saúde: mesma ideia, "Sim"/"Não" em respostas.condicoes.
  const [condMarcadas, setCondMarcadas] = useState<string[]>([]);

  // Só as perguntas que valem para as respostas dadas até aqui.
  const lista = useMemo(() => perguntas.filter((p) => !p.mostrar || p.mostrar(respostas)), [respostas]);
  const pergunta = lista[Math.min(indice, lista.length - 1)];
  const respostaAtual = respostas[pergunta.chave] || "";
  const intoleranciasEscolhidas = [
    ...marcadas.filter((m) => m !== "Outra"),
    ...(marcadas.includes("Outra") && outraIntolerancia.trim() ? [outraIntolerancia.trim()] : []),
  ];
  const podeContinuar =
    pergunta.tipo === "intolerancia"
      ? respostaAtual === "Não" || (respostaAtual === "Sim" && intoleranciasEscolhidas.length > 0)
      : pergunta.tipo === "condicoes"
        ? respostaAtual === "Não" || (respostaAtual === "Sim" && condMarcadas.length > 0)
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

  function alternarCondicao(opcao: string) {
    setCondMarcadas((prev) => (prev.includes(opcao) ? prev.filter((o) => o !== opcao) : [...prev, opcao]));
  }

  function responderTemCondicao(valor: "Sim" | "Não") {
    atualizarResposta(valor);
    if (valor === "Não") setCondMarcadas([]);
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
    if (pergunta.tipo === "numero" && pergunta.regra && !(pergunta.opcional && !respostaAtual.trim())) {
      const resultado = interpretarNumero(respostaAtual, pergunta.regra);
      if ("erro" in resultado) {
        Keyboard.dismiss();
        Alert.alert("Confira o valor", resultado.erro);
        return;
      }
      // O peso desejado precisa ir na direção do objetivo.
      if (pergunta.chave === "pesoMetaKg") {
        const atual = numeroDe("pesoKg");
        if (respostas.objetivo === "Emagrecer" && resultado.valor >= atual) {
          Alert.alert("Confira o valor", `Para emagrecer, o peso desejado precisa ser menor que o atual (${atual} kg).`);
          return;
        }
        if (respostas.objetivo === "Ganhar massa" && resultado.valor <= atual) {
          Alert.alert("Confira o valor", `Para ganhar massa, o peso desejado precisa ser maior que o atual (${atual} kg).`);
          return;
        }
      }
    }

    if (indice < lista.length - 1) {
      setIndice(indice + 1);
      return;
    }

    setEnviando(true);
    try {
      const dias = (chaveDe(OPCOES_DIAS_TREINO, respostas.diasTreino) as number | undefined) ?? 0;
      const mudaPeso = querMudarPeso(respostas);
      await saveProfile({
        nome: respostas.nome,
        idade: numeroDe("idade"),
        sexo: respostas.sexo,
        alturaCm: numeroDe("alturaCm"),
        pesoKg: numeroDe("pesoKg"),
        objetivo: respostas.objetivo,
        praticaExercicio: dias > 0,
        // Resumo derivado dos dias de treino (apps antigos e telas de resumo leem este campo).
        nivelAtividade: nivelDoPerfil({ dias_treino: dias }),
        gestacao: respostas.sexo === "Feminino" ? (chaveDe(OPCOES_GESTACAO, respostas.gestacao) as string) ?? "nao" : null,
        gorduraPct: respostas.gorduraPct?.trim() ? numeroDe("gorduraPct") : null,
        pesoMetaKg: mudaPeso ? numeroDe("pesoMetaKg") : null,
        ritmo: mudaPeso ? (chaveDe(OPCOES_RITMO, respostas.ritmo) as string) ?? "moderado" : null,
        rotinaDiaria: chaveDe(OPCOES_ROTINA, respostas.rotinaDiaria) as string,
        diasTreino: dias,
        minutosTreino: dias > 0 ? (chaveDe(OPCOES_DURACAO_TREINO, respostas.duracaoTreino) as number) : null,
        intensidadeTreino: dias > 0 ? (chaveDe(OPCOES_INTENSIDADE, respostas.intensidadeTreino) as string) : null,
        condicoesSaude: condMarcadas.length ? condMarcadas.join(", ") : null,
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
                  { width: `${((indice + 1) / lista.length) * 100}%` },
                ]}
              />
            </View>
          </View>

          <Text style={styles.stepLabel}>
            Pergunta {indice + 1} de {lista.length}
          </Text>
          <Text style={styles.title}>{pergunta.titulo}</Text>
          {!!pergunta.dica && <Text style={styles.dica}>{pergunta.dica}</Text>}

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

            {pergunta.tipo === "condicoes" && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 10 }}
              >
                {(["Não", "Sim"] as const).map((opcao) => {
                  const selecionado = respostaAtual === opcao;
                  return (
                    <TouchableOpacity
                      key={opcao}
                      style={[styles.opcao, selecionado && styles.opcaoSelecionada]}
                      onPress={() => responderTemCondicao(opcao)}
                    >
                      <Text style={[styles.opcaoTexto, selecionado && styles.opcaoTextoSelecionado]}>
                        {opcao === "Não" ? "Não, nenhuma" : "Sim"}
                      </Text>
                      {selecionado && <Feather name="check" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
                {respostaAtual === "Sim" && (
                  <View style={{ gap: 10, marginTop: 6 }}>
                    <Text style={styles.subtitulo}>Qual(is)? Pode marcar mais de uma.</Text>
                    <View style={styles.chips}>
                      {OPCOES_CONDICOES.map((opcao) => {
                        const marcada = condMarcadas.includes(opcao);
                        return (
                          <TouchableOpacity
                            key={opcao}
                            style={[styles.chip, marcada && styles.chipMarcado]}
                            onPress={() => alternarCondicao(opcao)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: marcada }}
                          >
                            {marcada && <Feather name="check" size={14} color="#fff" />}
                            <Text style={[styles.chipTexto, marcada && styles.chipTextoMarcado]}>{opcao}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {pergunta.tipo === "selecao" && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 10 }}
              >
                {pergunta.opcoes?.map((opcao) => {
                  const selecionado = respostaAtual === opcao;
                  return (
                    <TouchableOpacity
                      key={opcao}
                      style={[styles.opcao, selecionado && styles.opcaoSelecionada]}
                      onPress={() => atualizarResposta(opcao)}
                    >
                      <Text style={[styles.opcaoTexto, selecionado && styles.opcaoTextoSelecionado, { flex: 1 }]}>
                        {opcao}
                      </Text>
                      {selecionado && <Feather name="check" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
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
                {indice === lista.length - 1
                  ? "Concluir"
                  : pergunta.opcional && !respostaAtual.trim()
                    ? "Pular"
                    : "Continuar"}
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
  dica: { fontSize: 13, color: colors.textSecondary, marginTop: -12, marginBottom: 16, lineHeight: 18 },
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