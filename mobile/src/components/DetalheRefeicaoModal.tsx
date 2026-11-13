import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Easing,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCores } from "../theme/tema";
import { sombra } from "../theme/colors";
import type { Cores } from "../theme/colors";
import type { OrientacaoRefeicao } from "../mocks/orientacaoNutricionista";
import { AlimentoDaFoto, detalharFoto, detalharItem, detalharRefeicao, formatarQuantidade, ItemDetalhado, ItemPlano, MicroValor } from "../utils/refeicaoDetalhe";
import { ALIMENTOS, palavrasDaBusca } from "../data/alimentos";
import { filtrarAlimentos } from "../utils/buscaAlimentos";
import { buscarNoServidor } from "../utils/catalogoServidor";
import BarraTeclado, { ID_BARRA_TECLADO } from "./BarraTeclado";

if (Platform.OS === "android") {
  // @ts-ignore — só existe na arquitetura antiga; na nova a chamada é ignorada.
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const COR_PROT = "#3F63B8";
const COR_CARBO = "#D98324";
const COR_GORD = "#D6455D";

type Props = {
  refeicao: OrientacaoRefeicao | null;
  /** A refeição já foi alterada em relação ao plano original. */
  editada: boolean;
  metaCalorias: number;
  onFechar: () => void;
  onSalvar: (chave: string, itens: ItemPlano[]) => void;
  onRestaurar: (chave: string) => void;
  /** O que a pessoa registrou nesta refeição hoje (null = ainda não registrou). */
  registro?: {
    kcal: number;
    /** "foto": cards dos alimentos reconhecidos pela IA; "itens": o que foi marcado (ou o plano registrado). */
    origem: "foto" | "itens";
    itens: ItemPlano[];
    fotoAlimentos?: AlimentoDaFoto[];
    fotoUri?: string;
  } | null;
  onRegistrarComoPlano?: (chave: string) => void;
  /** Abre a tela de refeição com o prato do plano já montado, para ajustar. */
  onAjustar?: (chave: string) => void;
  /** Abre a tela de refeição já com a câmera, para fotografar o prato. */
  onFotografar?: (chave: string) => void;
  /** Abre a tela de refeição para ver ou editar o que foi registrado. */
  onVerRegistro?: (chave: string) => void;
};

/** Detalhe de uma refeição do plano: cada alimento com ilustração, macros e vitaminas, e edição. */
export default function DetalheRefeicaoModal({ refeicao, editada, metaCalorias, onFechar, onSalvar, onRestaurar, registro, onRegistrarComoPlano, onAjustar, onFotografar, onVerRegistro }: Props) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const entrada = useRef(new Animated.Value(0)).current;
  const { height: alturaTela } = useWindowDimensions();

  const [editando, setEditando] = useState(false);
  const [menuEditar, setMenuEditar] = useState(false); // escolha: ajustar alimentos ou fotografar
  const [rascunho, setRascunho] = useState<ItemPlano[]>([]);
  const [adicionando, setAdicionando] = useState(false);
  const [busca, setBusca] = useState("");
  const [ordemServidor, setOrdemServidor] = useState<string[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [versao, setVersao] = useState(0);

  const chave = refeicao?.chave;

  useEffect(() => {
    if (!refeicao) return;
    entrada.setValue(0);
    Animated.timing(entrada, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [chave, entrada]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ao abrir outra refeição (ou fechar), a edição começa do zero.
  useEffect(() => {
    setEditando(false);
    setMenuEditar(false);
    setAdicionando(false);
    setBusca("");
  }, [chave]);

  // Busca no servidor enquanto a pessoa procura um alimento para adicionar.
  useEffect(() => {
    const termo = busca.trim();
    if (!adicionando || termo.length < 2) {
      setOrdemServidor(null);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    let cancelado = false;
    const t = setTimeout(async () => {
      const ids = await buscarNoServidor(termo);
      if (cancelado) return;
      setOrdemServidor(ids);
      setVersao((v) => v + 1);
      setBuscando(false);
    }, 400);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [busca, adicionando]);

  const itensAtuais = editando ? rascunho : refeicao?.itens ?? [];
  // O plano da nutricionista (para comparar) e o que é EXIBIDO nos cards: o plano, ou — se a pessoa
  // já registrou a refeição — o que ela comeu de verdade (alimentos da foto ou os marcados).
  const planoDet = useMemo(() => (refeicao ? detalharRefeicao(refeicao.itens) : null), [refeicao]);
  const mostrandoRegistro = !editando && !!registro;
  const det = useMemo(() => {
    if (!refeicao) return null;
    if (mostrandoRegistro && registro) {
      return registro.origem === "foto" && registro.fotoAlimentos?.length
        ? detalharFoto(registro.fotoAlimentos)
        : detalharRefeicao(registro.itens);
    }
    return detalharRefeicao(itensAtuais);
  }, [refeicao, mostrandoRegistro, registro, itensAtuais]);

  const resultados = useMemo(
    () => (adicionando && palavrasDaBusca(busca).length > 0 ? filtrarAlimentos(ALIMENTOS, busca, ordemServidor).slice(0, 8) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adicionando, busca, ordemServidor, versao],
  );

  function iniciarEdicao() {
    if (!refeicao) return;
    setRascunho(refeicao.itens.map((i) => ({ ...i })));
    setEditando(true);
  }

  function cancelarEdicao() {
    setEditando(false);
    setAdicionando(false);
    setBusca("");
  }

  function mudarGramas(id: string, gramas: number) {
    // A medida caseira ("2 ovos") deixa de valer quando a quantidade muda.
    setRascunho((r) => r.map((i) => (i.alimentoId === id ? { alimentoId: id, gramas } : i)));
  }

  function ajustar(id: string, atual: number, sinal: 1 | -1) {
    const passo = atual >= 100 ? 10 : 5;
    mudarGramas(id, Math.max(0, Math.min(2000, atual + sinal * passo)));
  }

  function remover(id: string) {
    // O cartão já saiu de cena (ver CartaoEditavel); aqui os de baixo sobem suavemente.
    LayoutAnimation.configureNext(LayoutAnimation.create(240, "easeInEaseOut", "opacity"));
    setRascunho((r) => r.filter((i) => i.alimentoId !== id));
  }

  function adicionar(id: string, porcao: number) {
    LayoutAnimation.configureNext(LayoutAnimation.create(240, "easeInEaseOut", "opacity"));
    setRascunho((r) => (r.some((i) => i.alimentoId === id) ? r : [...r, { alimentoId: id, gramas: porcao }]));
    setAdicionando(false);
    setBusca("");
  }

  function salvar() {
    if (!refeicao) return;
    if (rascunho.length === 0) {
      Alert.alert("Refeição vazia", "Deixe pelo menos um alimento na refeição.");
      return;
    }
    if (rascunho.some((i) => !(i.gramas > 0))) {
      Alert.alert("Quantidade faltando", "Informe quantos gramas de cada alimento.");
      return;
    }
    onSalvar(refeicao.chave, rascunho);
    cancelarEdicao();
  }

  function restaurar() {
    if (!refeicao) return;
    Alert.alert("Restaurar plano original?", "Os alimentos desta refeição voltam como a nutricionista definiu.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Restaurar", style: "destructive", onPress: () => onRestaurar(refeicao.chave) },
    ]);
  }

  function pedirFechar() {
    if (!editando) return onFechar();
    Alert.alert("Descartar alterações?", "Você editou esta refeição e ainda não salvou.", [
      { text: "Continuar editando", style: "cancel" },
      { text: "Descartar", style: "destructive", onPress: () => { cancelarEdicao(); onFechar(); } },
    ]);
  }

  return (
    <Modal visible={!!refeicao} transparent animationType="fade" onRequestClose={pedirFechar} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.fundo, adicionando && { justifyContent: "flex-start", paddingTop: insets.top + 12 }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={adicionando ? () => { setAdicionando(false); setBusca(""); } : pedirFechar} accessibilityLabel="Fechar" />

        {/* Buscar alimento: fica no TOPO da tela, longe do teclado, para a pessoa ver o que digita. */}
        {refeicao && det && adicionando && (
          <View style={[styles.buscador, sombra]}>
            <View style={styles.buscaLinha}>
              <TouchableOpacity onPress={() => { setAdicionando(false); setBusca(""); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Voltar">
                <Feather name="arrow-left" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar alimento (ex.: arroz, nutella)"
                placeholderTextColor={colors.textSecondary}
                style={styles.buscaInput}
                autoFocus
                autoCorrect={false}
                returnKeyType="search"
              />
              {busca !== "" && (
                <TouchableOpacity onPress={() => setBusca("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Limpar busca">
                  <Feather name="x-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={{ maxHeight: alturaTela * 0.36 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {resultados.map((a) => (
                <TouchableOpacity key={a.id} onPress={() => adicionar(a.id, a.porcaoPadrao)} style={styles.resultado} accessibilityRole="button">
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemNome} numberOfLines={1}>{a.nome}</Text>
                    <Text style={styles.itemQtd}>{a.kcal} kcal por 100 g</Text>
                  </View>
                  <Feather name="plus-circle" size={20} color={colors.primary} />
                </TouchableOpacity>
              ))}
              {busca.trim().length < 2 && <Text style={styles.vazio}>Digite o nome do alimento.</Text>}
              {busca.trim().length >= 2 && resultados.length === 0 && (
                <Text style={styles.vazio}>{buscando ? "Procurando..." : `Não achamos "${busca.trim()}".`}</Text>
              )}
            </ScrollView>
          </View>
        )}

        {refeicao && det && !adicionando && (
          <Animated.View style={[styles.painel, sombra, { opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
            <View style={styles.topo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>{refeicao.nome}</Text>
                <Text style={styles.sub}>
                  {refeicao.horario} · {itensAtuais.length} {itensAtuais.length === 1 ? "alimento" : "alimentos"}
                  {editando ? " · editando" : editada ? " · editada" : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={pedirFechar} style={styles.fechar} accessibilityLabel="Fechar">
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {!editando && registro && (
                <View style={styles.registrado}>
                  <Feather name="check-circle" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.registradoTitulo}>Você registrou {registro.kcal} kcal</Text>
                    <Text style={styles.registradoSub}>
                      {Math.abs(registro.kcal - (planoDet?.total.kcal ?? 0)) < 1
                        ? "Igual ao plano."
                        : `${registro.kcal > (planoDet?.total.kcal ?? 0) ? "+" : "−"}${Math.abs(registro.kcal - (planoDet?.total.kcal ?? 0))} kcal em relação ao plano (${planoDet?.total.kcal ?? 0}).`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Totais da refeição (acompanham a edição em tempo real) */}
              <View style={styles.totais}>
                <View style={styles.kcalBloco}>
                  <Text style={styles.kcalValor}>{det.total.kcal}</Text>
                  <Text style={styles.kcalRotulo}>kcal</Text>
                  <Text style={styles.kcalPct}>{Math.round((det.total.kcal / metaCalorias) * 100)}% da meta do dia</Text>
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <Macro nome="Proteína" valor={det.total.proteina} cor={COR_PROT} styles={styles} />
                  <Macro nome="Carboidrato" valor={det.total.carbo} cor={COR_CARBO} styles={styles} />
                  <Macro nome="Gordura" valor={det.total.gordura} cor={COR_GORD} styles={styles} />
                </View>
              </View>
              <BarraProporcao proteina={det.total.proteina} carbo={det.total.carbo} gordura={det.total.gordura} styles={styles} />

              <Text style={styles.secao}>
                {mostrandoRegistro ? (registro?.origem === "foto" ? "O que você comeu · reconhecido pela foto" : "O que você comeu") : "Indicação do seu nutricionista"}
              </Text>

              {mostrandoRegistro && registro?.origem === "foto" && registro.fotoUri && (
                <Image source={{ uri: registro.fotoUri }} style={styles.fotoPrato} accessibilityLabel="Foto do prato" />
              )}

              {mostrandoRegistro && planoDet && planoDet.itens.length > 0 && (
                <View style={styles.planoRef}>
                  <Feather name="clipboard" size={14} color={colors.textSecondary} style={{ marginTop: 1 }} />
                  <Text style={styles.planoRefTxt}>
                    <Text style={{ fontWeight: "800" }}>Plano da nutricionista ({planoDet.total.kcal} kcal): </Text>
                    {planoDet.itens.map((i) => i.alimento.nome.split(",")[0].trim()).join(", ")}
                  </Text>
                </View>
              )}

              {editando ? (
                <>
                  {rascunho.map((it) => {
                    const d = detalharItem(it);
                    if (!d) return null;
                    return (
                      <CartaoEditavel
                        key={it.alimentoId}
                        item={it}
                        d={d}
                        styles={styles}
                        colors={colors}
                        onGramas={mudarGramas}
                        onAjustar={ajustar}
                        onRemover={remover}
                      />
                    );
                  })}

                  <TouchableOpacity onPress={() => setAdicionando(true)} style={styles.adicionar} accessibilityRole="button">
                    <Feather name="plus" size={16} color={colors.primary} />
                    <Text style={styles.adicionarTxt}>Adicionar alimento</Text>
                  </TouchableOpacity>
                </>
              ) : (
                det.itens.map((it) => (
                  <View key={it.alimento.id} style={styles.item}>
                    <View style={styles.itemTopo}>
                      <View style={styles.ilustracao}>
                        <Text style={styles.emoji}>{it.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemNome}>{it.alimento.nome}</Text>
                        <Text style={styles.itemQtd}>
                          {it.gramas} g{it.medida ? ` · ${it.medida}` : ""}
                        </Text>
                      </View>
                      <Text style={styles.itemKcal}>{it.macros.kcal} kcal</Text>
                    </View>
                    <View style={styles.chips}>
                      <Chip texto={`Prot ${formatarQuantidade(it.macros.proteina)} g`} cor={COR_PROT} styles={styles} />
                      <Chip texto={`Carb ${formatarQuantidade(it.macros.carbo)} g`} cor={COR_CARBO} styles={styles} />
                      <Chip texto={`Gord ${formatarQuantidade(it.macros.gordura)} g`} cor={COR_GORD} styles={styles} />
                    </View>
                    {it.micros.length > 0 && (
                      <View style={styles.micros}>
                        {it.micros.slice(0, 4).map((m) => (
                          <View key={m.chave} style={styles.micro}>
                            <Text style={styles.microNome}>{m.rotulo}</Text>
                            <Text style={styles.microValor}>
                              {formatarQuantidade(m.valor)} {m.unidade} <Text style={styles.microVd}>· {m.vd}% VD</Text>
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}

              {/* Vitaminas e minerais somados */}
              {det.micros.length > 0 && (
                <>
                  <Text style={styles.secao}>Vitaminas e minerais da refeição</Text>
                  <View style={styles.cartao}>
                    {det.micros.slice(0, 8).map((m, i, lista) => (
                      <LinhaMicro key={m.chave} m={m} ultimo={i === lista.length - 1} styles={styles} colors={colors} />
                    ))}
                  </View>
                </>
              )}

              {!editando && (
                <>
                  <View style={styles.dica}>
                    <Feather name="message-circle" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dicaTitulo}>Dica da nutricionista</Text>
                      <Text style={styles.dicaTxt}>{refeicao.dica}</Text>
                    </View>
                  </View>

                  <Text style={styles.secao}>Trocas permitidas</Text>
                  <View style={styles.cartao}>
                    {refeicao.trocas.map((t, i) => (
                      <View key={t} style={[styles.troca, i < refeicao.trocas.length - 1 && styles.divisor]}>
                        <Feather name="repeat" size={14} color={colors.primary} />
                        <Text style={styles.trocaTxt}>{t}</Text>
                      </View>
                    ))}
                  </View>

                  {editada && (
                    <TouchableOpacity onPress={restaurar} style={styles.restaurar} accessibilityRole="button">
                      <Feather name="rotate-ccw" size={14} color={colors.textSecondary} />
                      <Text style={styles.restaurarTxt}>Restaurar plano original desta refeição</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.aviso}>
                    Valores aproximados, calculados por 100 g de cada alimento. O VD é o valor diário de referência de um adulto. Marca e modo de preparo mudam os números.
                  </Text>
                </>
              )}
            </ScrollView>

            {!editando && onRegistrarComoPlano && menuEditar && (
              <View style={[styles.menuEditar, { paddingBottom: 12 + insets.bottom }]}>
                <Text style={styles.menuTitulo}>Como você quer editar?</Text>
                <TouchableOpacity
                  onPress={() => { setMenuEditar(false); onAjustar?.(refeicao.chave); }}
                  style={styles.opcao}
                  accessibilityRole="button"
                >
                  <View style={styles.opcaoIcone}>
                    <Feather name="edit-3" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.opcaoTitulo}>Ajustar o que comi</Text>
                    <Text style={styles.opcaoSub}>Começa pelo prato do plano</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setMenuEditar(false); onFotografar?.(refeicao.chave); }}
                  style={styles.opcao}
                  accessibilityRole="button"
                >
                  <View style={styles.opcaoIcone}>
                    <Feather name="camera" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.opcaoTitulo}>Fotografar o prato</Text>
                    <Text style={styles.opcaoSub}>Estimamos as calorias pela foto</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setMenuEditar(false); iniciarEdicao(); }}
                  style={styles.opcao}
                  accessibilityRole="button"
                >
                  <View style={styles.opcaoIcone}>
                    <Feather name="sliders" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.opcaoTitulo}>Mudar o plano</Text>
                    <Text style={styles.opcaoSub}>Troca alimentos e quantidades desta refeição</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMenuEditar(false)} style={styles.restaurar} accessibilityRole="button">
                  <Text style={styles.restaurarTxt}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}

            {!editando && onRegistrarComoPlano && !menuEditar && (
              <View style={[styles.rodape, { paddingBottom: 12 + insets.bottom }]}>
                {registro ? (
                  <TouchableOpacity onPress={() => onVerRegistro?.(refeicao.chave)} style={styles.botaoPri} accessibilityRole="button">
                    <Text style={styles.botaoPriTxt} numberOfLines={1}>Ver ou editar o registro</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity onPress={() => setMenuEditar(true)} style={styles.botaoEditar} accessibilityRole="button" accessibilityLabel="Editar: ajustar o que comi, fotografar o prato ou mudar o plano">
                      <Feather name="edit-3" size={15} color={colors.primary} />
                      <Text style={styles.botaoEditarTxt} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onRegistrarComoPlano(refeicao.chave)} style={styles.botaoPri} accessibilityRole="button">
                      <Feather name="check" size={16} color="#fff" />
                      <Text style={styles.botaoPriTxt} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Registrar como no plano</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {editando && (
              <View style={[styles.rodape, { paddingBottom: 12 + insets.bottom }]}>
                <TouchableOpacity onPress={cancelarEdicao} style={styles.botaoSec} accessibilityRole="button">
                  <Text style={styles.botaoSecTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={salvar} style={styles.botaoPri} accessibilityRole="button">
                  <Text style={styles.botaoPriTxt}>Salvar alterações</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}
        <BarraTeclado />
      </KeyboardAvoidingView>
    </Modal>
  );
}

type Estilos = ReturnType<typeof criarStyles>;

/**
 * Cartão de um alimento em edição. Ao tocar na lixeira ele desliza para o lado e some
 * (em vez de desaparecer de repente); só então é removido da lista.
 */
function CartaoEditavel({ item, d, styles, colors, onGramas, onAjustar, onRemover }: {
  item: ItemPlano;
  d: ItemDetalhado;
  styles: Estilos;
  colors: Cores;
  onGramas: (id: string, gramas: number) => void;
  onAjustar: (id: string, atual: number, sinal: 1 | -1) => void;
  onRemover: (id: string) => void;
}) {
  const saida = useRef(new Animated.Value(0)).current;
  const entrou = useRef(new Animated.Value(0)).current;
  const saindo = useRef(false);

  // Entrada: o cartão recém-adicionado aparece subindo e clareando.
  useEffect(() => {
    Animated.timing(entrou, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [entrou]);

  function remover() {
    if (saindo.current) return; // evita toque duplo
    saindo.current = true;
    Animated.timing(saida, { toValue: 1, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onRemover(item.alimentoId));
  }

  return (
    <Animated.View
      style={[
        styles.item,
        {
          opacity: Animated.multiply(entrou, saida.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })),
          transform: [
            { translateX: saida.interpolate({ inputRange: [0, 1], outputRange: [0, -90] }) },
            { translateY: entrou.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            { scale: saida.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) },
          ],
        },
      ]}
    >
      <View style={styles.itemTopo}>
        <View style={styles.ilustracao}>
          <Text style={styles.emoji}>{d.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemNome}>{d.alimento.nome}</Text>
          <Text style={styles.itemQtd}>
            {d.macros.kcal} kcal · P {formatarQuantidade(d.macros.proteina)} · C {formatarQuantidade(d.macros.carbo)} · G {formatarQuantidade(d.macros.gordura)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={remover}
          style={styles.lixo}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${d.alimento.nome}`}
        >
          <Feather name="trash-2" size={16} color={COR_GORD} />
        </TouchableOpacity>
      </View>
      <View style={styles.quantidade}>
        <TouchableOpacity onPress={() => onAjustar(item.alimentoId, item.gramas, -1)} style={styles.passo} accessibilityLabel="Diminuir quantidade">
          <Feather name="minus" size={16} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.campoGramas}>
          <TextInput
            value={item.gramas > 0 ? String(item.gramas) : ""}
            onChangeText={(t) => onGramas(item.alimentoId, parseInt(t.replace(/\D/g, ""), 10) || 0)}
            keyboardType="number-pad"
            maxLength={4}
            style={styles.campoGramasInput}
            inputAccessoryViewID={ID_BARRA_TECLADO}
            accessibilityLabel={`Gramas de ${d.alimento.nome}`}
            selectTextOnFocus
          />
          <Text style={styles.gramasUn}>g</Text>
        </View>
        <TouchableOpacity onPress={() => onAjustar(item.alimentoId, item.gramas, 1)} style={styles.passo} accessibilityLabel="Aumentar quantidade">
          <Feather name="plus" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function Macro({ nome, valor, cor, styles }: { nome: string; valor: number; cor: string; styles: Estilos }) {
  return (
    <View style={styles.macroLinha}>
      <View style={[styles.ponto, { backgroundColor: cor }]} />
      <Text style={styles.macroNome}>{nome}</Text>
      <Text style={styles.macroValor}>{formatarQuantidade(valor)} g</Text>
    </View>
  );
}

function Chip({ texto, cor, styles }: { texto: string; cor: string; styles: Estilos }) {
  return (
    <View style={[styles.chip, { borderColor: cor }]}>
      <Text style={[styles.chipTxt, { color: cor }]}>{texto}</Text>
    </View>
  );
}

/** Faixa que mostra de onde vêm as calorias: proteína e carbo = 4 kcal/g, gordura = 9 kcal/g. */
function BarraProporcao({ proteina, carbo, gordura, styles }: { proteina: number; carbo: number; gordura: number; styles: Estilos }) {
  const p = proteina * 4, c = carbo * 4, g = gordura * 9;
  const t = p + c + g || 1;
  const pct = (x: number) => Math.round((x / t) * 100);
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.barra}>
        <View style={{ flex: p, backgroundColor: COR_PROT }} />
        <View style={{ flex: c, backgroundColor: COR_CARBO }} />
        <View style={{ flex: g, backgroundColor: COR_GORD }} />
      </View>
      <Text style={styles.barraLegenda}>
        Calorias vindas de: proteína {pct(p)}% · carboidrato {pct(c)}% · gordura {pct(g)}%
      </Text>
    </View>
  );
}

function LinhaMicro({ m, ultimo, styles, colors }: { m: MicroValor; ultimo: boolean; styles: Estilos; colors: Cores }) {
  return (
    <View style={[styles.linhaMicro, !ultimo && styles.divisor]}>
      <View style={{ flex: 1 }}>
        <View style={styles.linhaMicroTopo}>
          <Text style={styles.microNome}>
            {m.rotulo} <Text style={styles.tipo}>· {m.tipo}</Text>
          </Text>
          <Text style={styles.microValor}>
            {formatarQuantidade(m.valor)} {m.unidade} <Text style={styles.microVd}>· {m.vd}% VD</Text>
          </Text>
        </View>
        <View style={styles.trilho}>
          <View style={[styles.preenchido, { width: `${Math.min(m.vd, 100)}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>
    </View>
  );
}

const criarStyles = (colors: Cores) =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: "rgba(27,27,27,0.5)", justifyContent: "flex-end" },
    painel: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "90%", overflow: "hidden" },
    topo: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    titulo: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
    sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    fechar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.fundoSuave, alignItems: "center", justifyContent: "center" },
    totais: { flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14 },
    kcalBloco: { alignItems: "center", minWidth: 96 },
    kcalValor: { fontSize: 36, fontWeight: "800", color: colors.primary },
    kcalRotulo: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginTop: -4 },
    kcalPct: { fontSize: 10, color: colors.textSecondary, marginTop: 4, textAlign: "center" },
    macroLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
    ponto: { width: 9, height: 9, borderRadius: 5 },
    macroNome: { flex: 1, fontSize: 13, color: colors.textPrimary },
    macroValor: { fontSize: 14, fontWeight: "800", color: colors.textPrimary },
    barra: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: colors.border },
    barraLegenda: { fontSize: 11, color: colors.textSecondary },
    secao: { fontSize: 12, fontWeight: "800", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: -6 },
    item: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, gap: 10 },
    itemTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
    ilustracao: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.verdeSuave, alignItems: "center", justifyContent: "center" },
    emoji: { fontSize: 30 },
    itemNome: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
    itemQtd: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    itemKcal: { fontSize: 14, fontWeight: "800", color: colors.textPrimary },
    lixo: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.fundoSuave, alignItems: "center", justifyContent: "center" },
    quantidade: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
    passo: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.verdeSuave, alignItems: "center", justifyContent: "center" },
    campoGramas: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 110, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 12 },
    campoGramasInput: { fontSize: 20, fontWeight: "800", color: colors.textPrimary, minWidth: 54, textAlign: "center", padding: 0 },
    gramasUn: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
    adicionar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.primaryLight },
    adicionarTxt: { fontSize: 14, fontWeight: "700", color: colors.primary },
    buscador: { marginHorizontal: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 10, gap: 4 },
    buscaLinha: { flexDirection: "row", alignItems: "center", gap: 10, height: 44, paddingHorizontal: 8 },
    buscaInput: { flex: 1, fontSize: 15, color: colors.textPrimary, padding: 0 },
    resultado: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: colors.border },
    vazio: { fontSize: 12, color: colors.textSecondary, textAlign: "center", paddingVertical: 10 },
    chips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    chipTxt: { fontSize: 11, fontWeight: "700" },
    micros: { gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
    micro: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    microNome: { fontSize: 12, color: colors.textPrimary, fontWeight: "600" },
    microValor: { fontSize: 12, color: colors.textPrimary, fontWeight: "700" },
    microVd: { color: colors.textSecondary, fontWeight: "500" },
    tipo: { color: colors.textSecondary, fontWeight: "500", fontSize: 11 },
    cartao: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 14 },
    linhaMicro: { paddingVertical: 10 },
    linhaMicroTopo: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 6 },
    trilho: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" },
    preenchido: { height: "100%", borderRadius: 3 },
    divisor: { borderBottomWidth: 1, borderBottomColor: colors.border },
    dica: { flexDirection: "row", gap: 10, backgroundColor: colors.verdeSuave, borderRadius: 14, padding: 12 },
    dicaTitulo: { fontSize: 12, fontWeight: "800", color: colors.primary },
    dicaTxt: { fontSize: 13, lineHeight: 19, color: colors.textPrimary, marginTop: 2 },
    troca: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11 },
    trocaTxt: { flex: 1, fontSize: 13, color: colors.textPrimary },
    fotoPrato: { width: "100%", height: 170, borderRadius: 16 },
    planoRef: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 12, backgroundColor: colors.fundoSuave },
    planoRefTxt: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
    registrado: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.verdeSuave, borderRadius: 14, padding: 12 },
    registradoTitulo: { fontSize: 14, fontWeight: "800", color: colors.primary },
    registradoSub: { fontSize: 12, color: colors.textPrimary, marginTop: 2 },
    menuEditar: { gap: 8, paddingHorizontal: 16, paddingTop: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
    menuTitulo: { fontSize: 13, fontWeight: "800", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
    opcao: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    opcaoIcone: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.verdeSuave, alignItems: "center", justifyContent: "center" },
    opcaoTitulo: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
    opcaoSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    restaurar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
    restaurarTxt: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    aviso: { fontSize: 11, lineHeight: 16, color: colors.textSecondary, textAlign: "center" },
    rodape: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
    botaoSec: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: 10 },
    botaoSecTxt: { flexShrink: 1, fontSize: 15, fontWeight: "700", color: colors.textPrimary },
    botaoEditar: { flex: 1, height: 48, borderRadius: 14, backgroundColor: colors.verdeSuave, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: 10 },
    botaoEditarTxt: { flexShrink: 1, fontSize: 15, fontWeight: "800", color: colors.primary },
    botaoPri: { flex: 2, height: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: 10 },
    botaoPriTxt: { flexShrink: 1, fontSize: 15, fontWeight: "800", color: "#fff" },
  });
