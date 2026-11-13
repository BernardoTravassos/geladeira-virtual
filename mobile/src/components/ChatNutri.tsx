import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCores } from "../theme/tema";
import { sombra } from "../theme/colors";
import type { Cores } from "../theme/colors";
import { ORIENTACAO_NUTRICIONISTA } from "../mocks/orientacaoNutricionista";
import { responderAssistente, SUGESTOES_ASSISTENTE, ContextoAssistente } from "../utils/assistente";

/**
 * ⚠️ MENSAGENS DE DEMONSTRAÇÃO: ficam só neste aparelho (AsyncStorage) e a
 * nutricionista não recebe nada. Quando o vínculo existir, `enviar` troca o
 * armazenamento local por um POST na API e a lista vira um GET.
 */
const CHAVE = "@geladeira:chatNutri";
const CHAVE_BOT = "@geladeira:chatBot";
const CHAVE_POS = "@geladeira:posChatNutri";

const TAM = 52; // diâmetro do botão
const MARGEM = 12; // distância da borda quando ele "gruda" num lado
const TAM_X = 64; // diâmetro do alvo "X"
// Distância do centro do X até o fim da tela: acima da barra inferior e do botão da câmera.
const X_DO_RODAPE = 200;

// Se o usuário arrastou o botão até o X, ele some até o app ser aberto de novo.
// Fica fora do componente para continuar escondido ao navegar entre telas.
let ocultoNaSessao = false;

type Aba = "nutri" | "bot";
type Mensagem = { id: string; de: "eu" | "nutri" | "bot"; texto: string; quando: string };

const BOAS_VINDAS_BOT: Mensagem[] = [
  { id: "b1", de: "bot", texto: "Oi! Eu sou o assistente da Geladeira Virtual. Respondo dúvidas rápidas sobre alimentação. Não substituo a sua nutricionista. 🥗", quando: "agora" },
];

const INICIAIS: Mensagem[] = [
  { id: "m1", de: "nutri", texto: "Oi, Bernardo! Ajustei seu plano esta semana. Dá uma olhada na orientação aqui na Home.", quando: "ter 10:12" },
  { id: "m2", de: "eu", texto: "Oi, doutora! Posso trocar a banana da ceia por uma maçã?", quando: "ter 10:40" },
  { id: "m3", de: "nutri", texto: "Pode sim! Só mantenha o copo de leite. Qualquer dúvida, é só chamar.", quando: "ter 11:05" },
];

function agora() {
  const d = new Date();
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const CONTEXTO_PADRAO: ContextoAssistente = {
  calorias: ORIENTACAO_NUTRICIONISTA.metas.calorias,
  proteina: ORIENTACAO_NUTRICIONISTA.metas.proteina,
  aguaMl: ORIENTACAO_NUTRICIONISTA.metas.aguaMl,
};

export default function ChatNutri({ contexto = CONTEXTO_PADRAO }: { contexto?: ContextoAssistente }) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>(INICIAIS);
  const [texto, setTexto] = useState("");
  const [aba, setAba] = useState<Aba>("nutri");
  const [mensagensBot, setMensagensBot] = useState<Mensagem[]>(BOAS_VINDAS_BOT);
  const [digitando, setDigitando] = useState(false);
  const lista = useRef<FlatList<Mensagem>>(null);
  const entrada = useRef(new Animated.Value(0)).current;

  // ---- Botão arrastável ----
  const { width: W, height: H } = useWindowDimensions();
  const geo = useRef({ W, H, topo: insets.top + 8, base: insets.bottom });
  geo.current = { W, H, topo: insets.top + 8, base: insets.bottom };
  const inicial = { x: W - TAM - MARGEM, y: H - (116 + insets.bottom) - TAM };
  const pos = useRef({ ...inicial });
  const pan = useRef(new Animated.ValueXY(inicial)).current;
  const [oculto, setOculto] = useState(ocultoNaSessao);
  const [arrastando, setArrastando] = useState(false);
  const [sobreX, setSobreX] = useState(false);
  const sobreXRef = useRef(false);
  const alvo = useRef(new Animated.Value(0)).current;
  const comeco = useRef({ x: 0, y: 0 });
  const movido = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_POS)
      .then((v) => {
        if (!v) return;
        const { lado, y } = JSON.parse(v);
        const g = geo.current;
        const x = lado === "esq" ? MARGEM : g.W - TAM - MARGEM;
        const yy = Math.min(Math.max(y, g.topo), g.H - TAM - g.base - 8);
        pos.current = { x, y: yy };
        pan.setValue({ x, y: yy });
      })
      .catch(() => {});
  }, [pan]);

  const resp = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        comeco.current = { ...pos.current };
        movido.current = false;
      },
      onPanResponderMove: (_, g) => {
        // Movimentos minúsculos continuam sendo um toque.
        if (!movido.current && Math.hypot(g.dx, g.dy) < 6) return;
        if (!movido.current) {
          movido.current = true;
          setArrastando(true);
          Animated.spring(alvo, { toValue: 1, friction: 7, useNativeDriver: true }).start();
        }
        const l = geo.current;
        const x = Math.min(Math.max(comeco.current.x + g.dx, 0), l.W - TAM);
        const y = Math.min(Math.max(comeco.current.y + g.dy, l.topo), l.H - TAM - l.base - 8);
        pos.current = { x, y };
        pan.setValue({ x, y });
        const distancia = Math.hypot(x + TAM / 2 - l.W / 2, y + TAM / 2 - (l.H - l.base - X_DO_RODAPE));
        const sobre = distancia < 64;
        if (sobre !== sobreXRef.current) {
          sobreXRef.current = sobre;
          setSobreX(sobre);
        }
      },
      onPanResponderRelease: () => finalizar(),
      onPanResponderTerminate: () => finalizar(),
    }),
  ).current;

  function finalizar() {
    if (!movido.current) {
      setAberto(true); // foi só um toque
      return;
    }
    setArrastando(false);
    Animated.timing(alvo, { toValue: 0, duration: 160, useNativeDriver: true }).start();
    if (sobreXRef.current) {
      sobreXRef.current = false;
      setSobreX(false);
      ocultoNaSessao = true;
      setOculto(true);
      return;
    }
    // Gruda na borda mais próxima, como os "chat heads".
    const g = geo.current;
    const lado = pos.current.x + TAM / 2 < g.W / 2 ? "esq" : "dir";
    const x = lado === "esq" ? MARGEM : g.W - TAM - MARGEM;
    pos.current = { x, y: pos.current.y };
    Animated.spring(pan.x, { toValue: x, friction: 8, useNativeDriver: true }).start();
    AsyncStorage.setItem(CHAVE_POS, JSON.stringify({ lado, y: pos.current.y })).catch(() => {});
  }

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((v) => v && setMensagens(JSON.parse(v)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_BOT)
      .then((v) => v && setMensagensBot(JSON.parse(v)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!aberto) return;
    entrada.setValue(0);
    Animated.timing(entrada, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [aberto, entrada]);

  const rolarAoFim = useCallback(() => setTimeout(() => lista.current?.scrollToEnd({ animated: true }), 80), []);

  function enviar(textoDireto?: string) {
    const t = (textoDireto ?? texto).trim();
    if (!t || digitando) return;
    const minha: Mensagem = { id: `m${Date.now()}`, de: "eu", texto: t, quando: `hoje ${agora()}` };
    setTexto("");

    if (aba === "nutri") {
      const proximas = [...mensagens, minha];
      setMensagens(proximas);
      AsyncStorage.setItem(CHAVE, JSON.stringify(proximas)).catch(() => {});
      rolarAoFim();
      return;
    }

    const comPergunta = [...mensagensBot, minha];
    setMensagensBot(comPergunta);
    setDigitando(true);
    rolarAoFim();
    // Pequena pausa para parecer uma conversa; com a IA real, é o tempo da resposta.
    Promise.all([responderAssistente(t, contexto), new Promise((r) => setTimeout(r, 900))])
      .then(([resposta]) => {
        const final = [...comPergunta, { id: `b${Date.now()}`, de: "bot" as const, texto: resposta as string, quando: `hoje ${agora()}` }];
        setMensagensBot(final);
        AsyncStorage.setItem(CHAVE_BOT, JSON.stringify(final.slice(-60))).catch(() => {});
      })
      .catch(() => {
        setMensagensBot([...comPergunta, { id: `b${Date.now()}`, de: "bot", texto: "Não consegui responder agora. Tente de novo em instantes.", quando: `hoje ${agora()}` }]);
      })
      .finally(() => {
        setDigitando(false);
        rolarAoFim();
      });
  }

  function trocarAba(nova: Aba) {
    setAba(nova);
    rolarAoFim();
  }

  const n = ORIENTACAO_NUTRICIONISTA.nutricionista;

  return (
    <>
      {!oculto && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {/* Alvo "X": aparece enquanto o botão é arrastado */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.alvoX,
              sobreX && styles.alvoXAtivo,
              {
                left: W / 2 - TAM_X / 2,
                top: H - insets.bottom - X_DO_RODAPE - TAM_X / 2,
                opacity: alvo,
                transform: [{ scale: alvo.interpolate({ inputRange: [0, 1], outputRange: [0.5, sobreX ? 1.2 : 1] }) }],
              },
            ]}
          >
            <Feather name="x" size={26} color="#fff" />
          </Animated.View>

          <Animated.View
            {...resp.panHandlers}
            style={[styles.fab, sombra, arrastando && { opacity: 0.9 }, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: arrastando ? 1.08 : 1 }] }]}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem para a nutricionista. Arraste para mover."
          >
            <Feather name="message-circle" size={24} color="#fff" />
          </Animated.View>
        </View>
      )}

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.fundo}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAberto(false)} accessibilityLabel="Fechar conversa" />
          <Animated.View
            style={[
              styles.popup,
              sombra,
              {
                marginBottom: Math.max(insets.bottom, 16) + 8,
                opacity: entrada,
                transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
              },
            ]}
          >
            <View style={styles.topo}>
              <View style={[styles.avatar, aba === "bot" && styles.avatarBot]}>
                {aba === "nutri" ? <Text style={styles.avatarTxt}>{n.iniciais}</Text> : <Feather name="cpu" size={20} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{aba === "nutri" ? n.nome : "Assistente Geladeira"}</Text>
                <Text style={styles.status}>{aba === "nutri" ? "Costuma responder em até 24 h" : "Respostas automáticas · dúvidas rápidas"}</Text>
              </View>
              <TouchableOpacity onPress={() => setAberto(false)} style={styles.fechar} accessibilityLabel="Fechar">
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.abas}>
              {(["nutri", "bot"] as Aba[]).map((k) => (
                <TouchableOpacity key={k} onPress={() => trocarAba(k)} style={[styles.aba, aba === k && styles.abaAtiva]} accessibilityRole="tab" accessibilityState={{ selected: aba === k }}>
                  <Feather name={k === "nutri" ? "user" : "cpu"} size={13} color={aba === k ? "#fff" : colors.textSecondary} />
                  <Text style={[styles.abaTxt, aba === k && { color: "#fff" }]}>{k === "nutri" ? "Nutricionista" : "Assistente"}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              ref={lista}
              data={aba === "nutri" ? mensagens : mensagensBot}
              keyExtractor={(m) => m.id}
              style={styles.lista}
              contentContainerStyle={{ padding: 14, gap: 8 }}
              onContentSizeChange={() => lista.current?.scrollToEnd({ animated: false })}
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={
                aba === "bot" && digitando ? (
                  <View style={[styles.balao, styles.dela, { marginTop: 8 }]}>
                    <Text style={styles.balaoTxt}>digitando…</Text>
                  </View>
                ) : undefined
              }
              renderItem={({ item }) => (
                <View style={[styles.balao, item.de === "eu" ? styles.meu : styles.dela]}>
                  <Text style={[styles.balaoTxt, item.de === "eu" && { color: "#fff" }]}>{item.texto}</Text>
                  <Text style={[styles.quando, item.de === "eu" && { color: "rgba(255,255,255,0.75)" }]}>{item.quando}</Text>
                </View>
              )}
            />

            {aba === "bot" && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.sugestoes} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
                {SUGESTOES_ASSISTENTE.map((q) => (
                  <TouchableOpacity key={q} onPress={() => enviar(q)} style={styles.sugestao} disabled={digitando}>
                    <Text style={styles.sugestaoTxt}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.entrada}>
              <TextInput
                value={texto}
                onChangeText={setTexto}
                placeholder={aba === "nutri" ? "Escreva para a nutricionista..." : "Pergunte ao assistente..."}
                placeholderTextColor={colors.textSecondary}
                style={styles.campo}
                multiline
                maxLength={500}
                onFocus={rolarAoFim}
              />
              <TouchableOpacity
                onPress={() => enviar()}
                disabled={!texto.trim() || digitando}
                style={[styles.enviar, (!texto.trim() || digitando) && { opacity: 0.4 }]}
                accessibilityRole="button"
                accessibilityLabel="Enviar"
              >
                <Feather name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const criarStyles = (colors: Cores) =>
  StyleSheet.create({
    fab: { position: "absolute", left: 0, top: 0, width: TAM, height: TAM, borderRadius: TAM / 2, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    alvoX: { position: "absolute", width: TAM_X, height: TAM_X, borderRadius: TAM_X / 2, backgroundColor: "rgba(27,27,27,0.75)", alignItems: "center", justifyContent: "center" },
    alvoXAtivo: { backgroundColor: "#D6455D" },
    fundo: { flex: 1, backgroundColor: "rgba(27,27,27,0.45)", justifyContent: "flex-end", paddingHorizontal: 14 },
    popup: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: "hidden", maxHeight: "75%", minHeight: 360 },
    topo: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    avatarBot: { backgroundColor: "#3F63B8" },
    abas: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingTop: 10 },
    aba: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.fundoSuave },
    abaAtiva: { backgroundColor: colors.primary },
    abaTxt: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
    sugestoes: { flexGrow: 0, paddingVertical: 8 },
    sugestao: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.verdeSuave, borderWidth: 1, borderColor: colors.border },
    sugestaoTxt: { fontSize: 12, fontWeight: "600", color: colors.primary },
    avatarTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },
    nome: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
    status: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    fechar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.fundoSuave, alignItems: "center", justifyContent: "center" },
    lista: { flexGrow: 1, flexShrink: 1 },
    balao: { maxWidth: "82%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, gap: 3 },
    meu: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    dela: { alignSelf: "flex-start", backgroundColor: colors.verdeSuave, borderBottomLeftRadius: 4 },
    balaoTxt: { fontSize: 14, lineHeight: 19, color: colors.textPrimary },
    quando: { fontSize: 10, color: colors.textSecondary, alignSelf: "flex-end" },
    entrada: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: colors.border },
    campo: { flex: 1, maxHeight: 100, minHeight: 40, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 14, color: colors.textPrimary },
    enviar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  });
