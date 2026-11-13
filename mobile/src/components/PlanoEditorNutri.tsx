import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated, Easing, FlatList, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import { sombra } from "../theme/colors";
import { ORIENTACAO_NUTRICIONISTA as base } from "../mocks/orientacaoNutricionista";
import { ALIMENTOS, palavrasDaBusca } from "../data/alimentos";
import { filtrarAlimentos } from "../utils/buscaAlimentos";
import { aplicarEdicoes, carregarEdicoes, restaurarEdicao, salvarEdicao, type Edicoes } from "../utils/planoNutri";
import { detalharItem, detalharRefeicao, type ItemPlano } from "../utils/refeicaoDetalhe";

type Props = {
  pacienteId: string;
  pacienteNome: string;
  /** Avisa que o plano foi gravado (a tela mostra a confirmação). */
  aoSalvar?: (mensagem: string) => void;
};

const COR_REFEICAO: Record<string, string> = {
  cafe: "#F2A93B", "lanche-manha": "#7BB661", almoco: "#E0674F", "lanche-tarde": "#5FA8D3", jantar: "#7E6BC4", ceia: "#4E7D9B",
};

/**
 * Editor do plano de refeições feito pelo nutricionista: ele escolhe, para cada refeição, os alimentos e as
 * quantidades que o paciente vai ver na Home dele em "Indicação do seu nutricionista".
 * Cada mudança é gravada na hora. Para o paciente "1" (quem usa este aparelho) ela já aparece na Home.
 */
export default function PlanoEditorNutri({ pacienteId, pacienteNome, aoSalvar }: Props) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [edicoes, setEdicoes] = useState<Edicoes>({});
  const [aberta, setAberta] = useState<string | null>("almoco");
  const [adicionandoEm, setAdicionandoEm] = useState<string | null>(null);

  useEffect(() => {
    carregarEdicoes(pacienteId).then(setEdicoes);
  }, [pacienteId]);

  const plano = useMemo(() => aplicarEdicoes(base.refeicoes, edicoes), [edicoes]);
  const primeiroNome = pacienteNome.split(" ")[0];

  async function gravar(chave: string, itens: ItemPlano[], msg: string) {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, "easeInEaseOut", "opacity"));
    setEdicoes(await salvarEdicao(chave, itens, pacienteId));
    aoSalvar?.(msg);
  }

  const trocarGramas = (chave: string, itens: ItemPlano[], i: number, delta: number) =>
    gravar(chave, itens.map((it, j) => (j === i ? { ...it, gramas: Math.max(5, it.gramas + delta), medida: undefined } : it)), "Quantidade atualizada");
  const remover = (chave: string, itens: ItemPlano[], i: number) => gravar(chave, itens.filter((_, j) => j !== i), "Alimento removido");

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.aviso}>
        <Feather name="send" size={15} color={colors.primary} />
        <Text style={styles.avisoTxt}>
          O que você definir aqui aparece para {primeiroNome} em <Text style={{ fontWeight: "800" }}>Indicação do seu nutricionista</Text>, em cada refeição. Ela pode ajustar tirando uma foto do que comeu de verdade.
        </Text>
      </View>

      {plano.map((r) => {
        const cor = COR_REFEICAO[r.chave] ?? colors.primary;
        const det = detalharRefeicao(r.itens);
        const editada = !!edicoes[r.chave];
        const aberto = aberta === r.chave;
        return (
          <View key={r.chave} style={[styles.card, sombra]}>
            <TouchableOpacity
              style={styles.topo}
              activeOpacity={0.8}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.create(220, "easeInEaseOut", "opacity"));
                setAberta(aberto ? null : r.chave);
              }}
            >
              <View style={[styles.faixa, { backgroundColor: cor }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>
                  {r.nome} <Text style={styles.hora}>· {r.horario}</Text>
                </Text>
                <Text style={styles.resumo}>
                  {r.itens.length} {r.itens.length === 1 ? "alimento" : "alimentos"} · {Math.round(det.total.kcal)} kcal · P {Math.round(det.total.proteina)}g · C {Math.round(det.total.carbo)}g · G {Math.round(det.total.gordura)}g
                </Text>
              </View>
              {editada && (
                <View style={styles.etiqueta}>
                  <Text style={styles.etiquetaTxt}>personalizado</Text>
                </View>
              )}
              <Feather name={aberto ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {aberto && (
              <View style={styles.corpo}>
                {r.itens.map((it, i) => {
                  const d = detalharItem(it);
                  if (!d) return null;
                  return (
                    <View key={`${it.alimentoId}-${i}`} style={styles.item}>
                      <Text style={styles.emoji}>{d.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemNome} numberOfLines={1}>{d.alimento.nome}</Text>
                        <Text style={styles.itemInfo}>
                          {Math.round(d.macros.kcal)} kcal · P {Math.round(d.macros.proteina)} · C {Math.round(d.macros.carbo)} · G {Math.round(d.macros.gordura)}
                        </Text>
                      </View>
                      <View style={styles.stepper}>
                        <TouchableOpacity hitSlop={8} onPress={() => trocarGramas(r.chave, r.itens, i, -10)} accessibilityLabel="Diminuir 10 gramas">
                          <Feather name="minus" size={15} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.gramas}>{it.gramas} g</Text>
                        <TouchableOpacity hitSlop={8} onPress={() => trocarGramas(r.chave, r.itens, i, 10)} accessibilityLabel="Aumentar 10 gramas">
                          <Feather name="plus" size={15} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity hitSlop={8} onPress={() => remover(r.chave, r.itens, i)} accessibilityLabel={`Remover ${d.alimento.nome}`}>
                        <Feather name="x" size={17} color="#D6455D" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {r.itens.length === 0 && <Text style={styles.vazio}>Nenhum alimento nesta refeição.</Text>}

                <View style={styles.acoes}>
                  <TouchableOpacity style={styles.adicionar} onPress={() => setAdicionandoEm(r.chave)} activeOpacity={0.85}>
                    <Feather name="plus-circle" size={16} color={colors.primary} />
                    <Text style={styles.adicionarTxt}>Adicionar alimento</Text>
                  </TouchableOpacity>
                  {editada && (
                    <TouchableOpacity
                      style={styles.restaurar}
                      onPress={async () => {
                        LayoutAnimation.configureNext(LayoutAnimation.create(200, "easeInEaseOut", "opacity"));
                        setEdicoes(await restaurarEdicao(r.chave, pacienteId));
                        aoSalvar?.("Plano padrão restaurado");
                      }}
                    >
                      <Feather name="rotate-ccw" size={14} color={colors.textSecondary} />
                      <Text style={styles.restaurarTxt}>Padrão</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        );
      })}

      <BuscaAlimento
        visivel={adicionandoEm !== null}
        aoFechar={() => setAdicionandoEm(null)}
        aoEscolher={(alimentoId, gramas, medida) => {
          const chave = adicionandoEm!;
          const itens = plano.find((x) => x.chave === chave)!.itens;
          setAdicionandoEm(null);
          gravar(chave, [...itens, { alimentoId, gramas, medida }], "Alimento adicionado ao plano");
        }}
      />
    </View>
  );
}

function BuscaAlimento({ visivel, aoFechar, aoEscolher }: { visivel: boolean; aoFechar: () => void; aoEscolher: (id: string, gramas: number, medida?: string) => void }) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [gramas, setGramas] = useState("100");
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visivel) {
      setBusca(""); setEscolhido(null);
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visivel, fade]);

  const resultados = useMemo(
    () => (palavrasDaBusca(busca).length > 0 ? filtrarAlimentos(ALIMENTOS, busca, null).slice(0, 30) : []),
    [busca],
  );
  const alimento = escolhido ? ALIMENTOS.find((a) => a.id === escolhido) : null;

  const escolher = useCallback((id: string) => {
    const a = ALIMENTOS.find((x) => x.id === id);
    setEscolhido(id);
    setGramas(String(a?.porcaoPadrao ?? 100));
  }, []);

  return (
    <Modal visible={visivel} transparent animationType="none" onRequestClose={aoFechar} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View style={[styles.fundo, { opacity: fade }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={aoFechar} />
          <View style={styles.folha}>
            <View style={styles.folhaTopo}>
              <Text style={styles.folhaTitulo}>Adicionar alimento</Text>
              <TouchableOpacity onPress={aoFechar} hitSlop={10}><Feather name="x" size={20} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <View style={styles.busca}>
              <Feather name="search" size={16} color={colors.textSecondary} />
              <TextInput style={styles.buscaInput} placeholder="Buscar (ex.: arroz, acarajé, frango)" placeholderTextColor={colors.textSecondary} value={busca} onChangeText={setBusca} autoFocus autoCorrect={false} />
            </View>

            {alimento ? (
              <View style={styles.escolhido}>
                <Text style={styles.itemNome}>{alimento.nome}</Text>
                <Text style={styles.itemInfo}>{Math.round(alimento.kcal)} kcal por 100 g · P {alimento.proteina} · C {alimento.carbo} · G {alimento.gordura}</Text>
                <View style={styles.linhaGramas}>
                  <Text style={styles.rotuloGramas}>Quantidade</Text>
                  <TextInput style={styles.campoGramas} keyboardType="number-pad" value={gramas} onChangeText={(t) => setGramas(t.replace(/\D/g, ""))} maxLength={4} />
                  <Text style={styles.rotuloGramas}>g</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity style={[styles.btn, styles.btnSec]} onPress={() => setEscolhido(null)}><Text style={styles.btnSecTxt}>Voltar</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.btnPri]} onPress={() => aoEscolher(alimento.id, Math.max(5, Number(gramas) || 100), undefined)}>
                    <Text style={styles.btnPriTxt}>Adicionar ao plano</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <FlatList
                data={resultados}
                keyExtractor={(a) => a.id}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 340 }}
                ListEmptyComponent={<Text style={styles.vazio}>{busca ? "Nada encontrado." : "Digite para buscar entre os mais de 900 alimentos."}</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultado} onPress={() => escolher(item.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemNome} numberOfLines={1}>{item.nome}</Text>
                      <Text style={styles.itemInfo}>{Math.round(item.kcal)} kcal/100 g · P {item.proteina} · C {item.carbo} · G {item.gordura}</Text>
                    </View>
                    <Feather name="plus" size={17} color={colors.primary} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const criarStyles = (colors: Cores) =>
  StyleSheet.create({
    aviso: { flexDirection: "row", gap: 10, backgroundColor: colors.verdeSuave, borderRadius: 14, padding: 12, alignItems: "flex-start" },
    avisoTxt: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.textPrimary },
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: "hidden" },
    topo: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingLeft: 0 },
    faixa: { width: 5, alignSelf: "stretch", borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    nome: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
    hora: { fontWeight: "500", fontSize: 12, color: colors.textSecondary },
    resumo: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
    etiqueta: { backgroundColor: colors.verdeSuave, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
    etiquetaTxt: { fontSize: 9, fontWeight: "800", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.4 },
    corpo: { paddingHorizontal: 14, paddingBottom: 14, gap: 2, borderTopWidth: 1, borderTopColor: colors.border },
    item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    emoji: { fontSize: 24, width: 32, textAlign: "center" },
    itemNome: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
    itemInfo: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    stepper: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.verdeSuave, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
    gramas: { fontSize: 12, fontWeight: "800", color: colors.textPrimary, minWidth: 42, textAlign: "center" },
    vazio: { fontSize: 12, color: colors.textSecondary, textAlign: "center", paddingVertical: 14 },
    acoes: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
    adicionar: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, height: 42, borderRadius: 12, backgroundColor: colors.verdeSuave },
    adicionarTxt: { fontSize: 13, fontWeight: "800", color: colors.primary },
    restaurar: { flexDirection: "row", alignItems: "center", gap: 5, height: 42, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    restaurarTxt: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
    fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    folha: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 28, gap: 12 },
    folhaTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    folhaTitulo: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },
    busca: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, height: 46, backgroundColor: colors.background },
    buscaInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
    resultado: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
    escolhido: { gap: 10, paddingVertical: 4 },
    linhaGramas: { flexDirection: "row", alignItems: "center", gap: 10 },
    rotuloGramas: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
    campoGramas: { width: 90, height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 12, textAlign: "center", fontSize: 18, fontWeight: "800", color: colors.textPrimary },
    btn: { flex: 1, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    btnPri: { backgroundColor: colors.botao },
    btnPriTxt: { color: colors.textoSobreMarca, fontWeight: "800", fontSize: 14 },
    btnSec: { borderWidth: 1, borderColor: colors.border },
    btnSecTxt: { color: colors.textSecondary, fontWeight: "700", fontSize: 14 },
  });
