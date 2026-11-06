import React, { useEffect, useMemo, useState } from "react";
import { useFeedback } from "../components/Feedback";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../theme/colors";
import BarraTeclado, { ID_BARRA_TECLADO } from "../components/BarraTeclado";
import { ALIMENTOS, CATEGORIAS, Alimento, Categoria, alimentoPorId, nutrientes } from "../data/alimentos";
import { carregarDia, salvarRefeicao, totaisDoRegistro, ItemPrato, EstimativaSalva } from "../utils/refeicoes";
import { interpretarNumero } from "../utils/numeros";
import { analisarPrato, descreverFalhaDeRede, getProfile } from "../services/api";
import { calcularMetas, PerfilApi } from "../utils/nutricao";
import { avaliarRefeicao } from "../utils/avaliacao";

const REGRA_GRAMAS = { artigoRotulo: "A quantidade", min: 1, max: 2000, unidade: "g", casas: 0 };

const CORES_AVALIACAO = {
  dentro: { fundo: "#E6F4EA", texto: "#1E5E34", icone: "check-circle" as const },
  acima: { fundo: "#FDECEA", texto: "#8E2B20", icone: "alert-triangle" as const },
  abaixo: { fundo: "#FFF4DC", texto: "#6B4500", icone: "alert-circle" as const },
};

export default function RefeicaoScreen({ navigation, route }: any) {
  const feedback = useFeedback();
  const insets = useSafeAreaInsets();
  const { chave, nome, icone, fracaoDaMeta } = route.params as {
    chave: string; nome: string; icone: keyof typeof Feather.glyphMap; fracaoDaMeta: number;
  };

  const [itens, setItens] = useState<ItemPrato[]>([]);
  const [fotoUri, setFotoUri] = useState<string | undefined>();
  const [estimativa, setEstimativa] = useState<EstimativaSalva | undefined>();
  const [perfil, setPerfil] = useState<PerfilApi | null>(null);
  const [kcalOutras, setKcalOutras] = useState(0);
  const [analisando, setAnalisando] = useState(false);
  const [erroAnalise, setErroAnalise] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("carboidratos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Alimento | null>(null);
  const [gramasTexto, setGramasTexto] = useState("");
  const [erroGramas, setErroGramas] = useState("");

  useEffect(() => {
    getProfile().then(setPerfil).catch(() => {}); // sem perfil, usa metas padrão
  }, []);

  useEffect(() => {
    carregarDia().then((dia) => {
      setKcalOutras(
        Object.entries(dia)
          .filter(([k]) => k !== chave)
          .reduce((soma, [, reg]) => soma + totaisDoRegistro(reg).kcal, 0),
      );
      if (dia[chave]) {
        setItens(dia[chave].itens);
        setFotoUri(dia[chave].fotoUri);
        setEstimativa(dia[chave].estimativa);
      }
    });
  }, [chave]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (termo) return ALIMENTOS.filter((x) => x.nome.toLowerCase().includes(termo));
    return ALIMENTOS.filter((x) => x.categoria === categoria);
  }, [busca, categoria]);

  const total = totaisDoRegistro({ itens, estimativa });
  const usandoEstimativa = itens.length === 0 && !!estimativa;
  const avaliacao = avaliarRefeicao({
    kcal: total.kcal,
    proteina: total.proteina,
    metas: calcularMetas(perfil),
    fracaoDaMeta,
    objetivo: perfil?.objetivo,
    kcalOutrasRefeicoes: kcalOutras,
    estimativa: usandoEstimativa,
  });
  const cor = avaliacao ? CORES_AVALIACAO[avaliacao.status] : null;
  const gramasDe = (id: string) => itens.find((i) => i.alimentoId === id)?.gramas;

  async function tirarFoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Câmera bloqueada", "Permita o uso da câmera nas configurações do celular para fotografar o prato.");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!r.canceled) novaFoto(r.assets[0].uri);
  }

  function novaFoto(uri: string) {
    setFotoUri(uri);
    setEstimativa(undefined);
    analisar(uri);
  }

  function removerFoto() {
    setFotoUri(undefined);
    setEstimativa(undefined);
    setErroAnalise("");
  }

  async function analisar(uri: string) {
    setAnalisando(true);
    setErroAnalise("");
    try {
      const r = await analisarPrato(uri);
      if (!r.eh_comida) {
        setErroAnalise("Não identificamos comida nesta foto. Tente outra ou marque os alimentos abaixo.");
        return;
      }
      setEstimativa({
        kcal: r.calorias,
        proteina: r.proteina_g,
        carbo: r.carboidratos_g,
        gordura: r.gordura_g,
        alimentos: r.alimentos.map((a) => ({ nome: a.nome, gramas: a.gramas_estimadas })),
        confianca: r.confianca,
      });
    } catch (e: any) {
      const status = e?.response?.status;
      setErroAnalise(
        status === 429
          ? "Muitas análises seguidas. Aguarde um pouco ou marque os alimentos abaixo."
          : e?.response?.data?.error ??
              (descreverFalhaDeRede(e) ? "Sem conexão com o servidor. Marque os alimentos abaixo." : "Não foi possível analisar a foto agora."),
      );
    } finally {
      setAnalisando(false);
    }
  }

  async function escolherDaGaleria() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (!r.canceled) novaFoto(r.assets[0].uri);
  }

  function abrirGramas(al: Alimento) {
    setEditando(al);
    setGramasTexto(String(gramasDe(al.id) ?? al.porcaoPadrao));
    setErroGramas("");
  }

  function ajustar(delta: number) {
    const atual = Number(gramasTexto.replace(",", ".")) || 0;
    setGramasTexto(String(Math.max(0, Math.round(atual + delta))));
    setErroGramas("");
  }

  function confirmarGramas() {
    if (!editando) return;
    const r = interpretarNumero(gramasTexto, REGRA_GRAMAS);
    if ("erro" in r) {
      setErroGramas(r.erro);
      return;
    }
    const id = editando.id;
    setItens((atual) =>
      atual.some((i) => i.alimentoId === id)
        ? atual.map((i) => (i.alimentoId === id ? { ...i, gramas: r.valor } : i))
        : [...atual, { alimentoId: id, gramas: r.valor }],
    );
    setEditando(null);
  }

  function removerEditando() {
    if (editando) setItens((atual) => atual.filter((i) => i.alimentoId !== editando.id));
    setEditando(null);
  }

  async function salvar() {
    if (itens.length === 0 && !estimativa) {
      Alert.alert("Nada registrado", "Tire uma foto do prato ou marque o que comeu.");
      return;
    }
    await salvarRefeicao(chave, { itens, fotoUri, estimativa, registradoEm: new Date().toISOString() });
    feedback.sucesso(`${nome} salvo!`, `${Math.round(total.kcal)} kcal registradas`, { atraso: 450 });
    navigation.goBack();
  }

  const previa = editando ? nutrientes(editando, Number(gramasTexto.replace(",", ".")) || 0) : null;

  return (
    <View style={styles.screen}>
      <View style={styles.topo}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar} accessibilityLabel="Voltar">
          <Feather name="arrow-left" size={20} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.topoIcone}>
          <Feather name={icone} size={16} color={colors.primary} />
        </View>
        <Text style={styles.titulo}>{nome}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: 120 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Foto do prato */}
        {fotoUri ? (
          <View style={styles.fotoCard}>
            <Image source={{ uri: fotoUri }} style={styles.fotoImg} />
            <TouchableOpacity style={styles.fotoTrocar} onPress={removerFoto}>
              <Feather name="x" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.cta} activeOpacity={0.85} onPress={tirarFoto}>
            <View style={styles.ctaIcone}>
              <Feather name="camera" size={22} color={colors.background} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitulo}>Fotografar o prato</Text>
              <Text style={styles.ctaSub}>Registre a refeição com uma foto</Text>
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={escolherDaGaleria} style={styles.galeria}>
          <Feather name="image" size={14} color={colors.primary} />
          <Text style={styles.galeriaTxt}>Escolher da galeria</Text>
        </TouchableOpacity>
        {analisando && (
          <View style={styles.analise}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.analiseTxt}>Analisando o prato…</Text>
          </View>
        )}
        {erroAnalise !== "" && !analisando && (
          <View style={styles.analiseErro}>
            <Text style={styles.analiseErroTxt}>{erroAnalise}</Text>
            {fotoUri && (
              <TouchableOpacity onPress={() => analisar(fotoUri)}>
                <Text style={styles.tentar}>Tentar de novo</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {estimativa && !analisando && (
          <View style={styles.estimativa}>
            <Text style={styles.estimativaTitulo}>Estimativa pela foto</Text>
            <Text style={styles.estimativaKcal}>≈ {Math.round(estimativa.kcal)} kcal</Text>
            <Text style={styles.estimativaMacros}>
              Proteína ≈ {Math.round(estimativa.proteina)} g · Carboidratos ≈ {Math.round(estimativa.carbo)} g · Gordura ≈ {Math.round(estimativa.gordura)} g
            </Text>
            {estimativa.alimentos.length > 0 && (
              <Text style={styles.estimativaLista}>
                Identificado: {estimativa.alimentos.map((a) => `${a.nome} (~${a.gramas} g)`).join(", ")}
              </Text>
            )}
            <View style={styles.avisoBox}>
              <Feather name="alert-circle" size={14} color="#8A5A00" />
              <Text style={styles.avisoBoxTxt}>
                Esta é uma informação aproximada, feita por IA a partir da foto
                {estimativa.confianca === "baixa" ? " (confiança baixa)" : ""}. Para um valor preciso, selecione os alimentos abaixo e informe as gramas.
              </Text>
            </View>
          </View>
        )}
        {fotoUri && !estimativa && !analisando && erroAnalise === "" && (
          <Text style={styles.aviso}>Foto anexada.</Text>
        )}

        {avaliacao && cor && !analisando && (
          <View style={[styles.avaliacao, { backgroundColor: cor.fundo }]}>
            <View style={styles.avaliacaoTopo}>
              <Feather name={cor.icone} size={18} color={cor.texto} />
              <Text style={[styles.avaliacaoTitulo, { color: cor.texto }]}>{avaliacao.titulo}</Text>
            </View>
            <Text style={[styles.avaliacaoTxt, { color: cor.texto }]}>{avaliacao.detalhe}</Text>
            <Text style={[styles.avaliacaoDia, { color: cor.texto }]}>{avaliacao.linhaDia}</Text>
          </View>
        )}

        {/* Seleção manual */}
        <Text style={styles.secao}>{estimativa ? "Quer um valor preciso? Marque o que comeu" : "Ou marque o que comeu"}</Text>
        <View style={styles.busca}>
          <Feather name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.buscaInput}
            placeholder="Buscar alimento"
            placeholderTextColor={colors.textSecondary}
            value={busca}
            onChangeText={setBusca}
            returnKeyType="search"
          />
          {busca !== "" && (
            <TouchableOpacity onPress={() => setBusca("")}>
              <Feather name="x" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {busca === "" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.abas}>
            {CATEGORIAS.map((c) => (
              <TouchableOpacity
                key={c.chave}
                onPress={() => setCategoria(c.chave)}
                style={[styles.aba, categoria === c.chave && styles.abaAtiva]}
              >
                <Text style={[styles.abaTxt, categoria === c.chave && styles.abaTxtAtiva]}>{c.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.grade}>
          {lista.length === 0 && <Text style={styles.vazio}>Nenhum alimento encontrado.</Text>}
          {lista.map((al) => {
            const g = gramasDe(al.id);
            const marcado = g !== undefined;
            return (
              <TouchableOpacity
                key={al.id}
                onPress={() => abrirGramas(al)}
                style={[styles.chip, marcado && styles.chipMarcado]}
                accessibilityLabel={`${al.nome}${marcado ? `, ${g} gramas` : ""}`}
              >
                {marcado && <Feather name="check" size={14} color="#fff" />}
                <Text style={[styles.chipTxt, marcado && styles.chipTxtMarcado]}>
                  {al.nome}
                  {marcado ? ` · ${g} g` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {itens.length > 0 && (
          <>
            <Text style={styles.secao}>No seu prato</Text>
            <View style={styles.card}>
              {itens.map((it, i) => {
                const al = alimentoPorId(it.alimentoId);
                if (!al) return null;
                const n = nutrientes(al, it.gramas);
                return (
                  <TouchableOpacity
                    key={it.alimentoId}
                    onPress={() => abrirGramas(al)}
                    style={[styles.linha, i < itens.length - 1 && styles.linhaDivisor]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.linhaNome}>{al.nome}</Text>
                      <Text style={styles.linhaInfo}>{it.gramas} g</Text>
                    </View>
                    <Text style={styles.linhaKcal}>{n.kcal} kcal</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: 28 + insets.bottom }]}>
        <View>
          <Text style={styles.rodapeKcal}>{usandoEstimativa ? "≈ " : ""}{Math.round(total.kcal)} kcal</Text>
          <Text style={styles.rodapeMacros}>
            P {Math.round(total.proteina)} g · C {Math.round(total.carbo)} g · G {Math.round(total.gordura)} g
          </Text>
          {avaliacao && cor && (
            <Text style={[styles.rodapeStatus, { color: cor.texto }]}>{avaliacao.titulo}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.salvar} onPress={salvar} activeOpacity={0.85}>
          <Text style={styles.salvarTxt}>Salvar refeição</Text>
        </TouchableOpacity>
      </View>

      {/* Quantidade em gramas */}
      <Modal visible={!!editando} transparent animationType="slide" onRequestClose={() => setEditando(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.fundoModal}>
              <TouchableWithoutFeedback>
                <View style={[styles.folha, { paddingBottom: 34 + insets.bottom }]}>
                  <View style={styles.folhaTopo}>
                    <Text style={styles.folhaTitulo}>{editando?.nome}</Text>
                    <TouchableOpacity onPress={() => setEditando(null)} accessibilityLabel="Fechar">
                      <Feather name="x" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.folhaPergunta}>Quantas gramas você colocou?</Text>

                  <View style={styles.ajuste}>
                    <TouchableOpacity style={styles.ajusteBtn} onPress={() => ajustar(-10)}>
                      <Feather name="minus" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.campoGramas}>
                      <TextInput
                        style={styles.gramasInput}
                        value={gramasTexto}
                        onChangeText={(t) => { setGramasTexto(t); setErroGramas(""); }}
                        keyboardType="decimal-pad"
                        inputAccessoryViewID={ID_BARRA_TECLADO}
                        maxLength={5}
                        selectTextOnFocus
                      />
                      <Text style={styles.gramasUn}>g</Text>
                    </View>
                    <TouchableOpacity style={styles.ajusteBtn} onPress={() => ajustar(10)}>
                      <Feather name="plus" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {editando && (
                    <TouchableOpacity onPress={() => { setGramasTexto(String(editando.porcaoPadrao)); setErroGramas(""); }}>
                      <Text style={styles.sugerida}>Usar porção comum: {editando.porcaoPadrao} g</Text>
                    </TouchableOpacity>
                  )}
                  {erroGramas !== "" && <Text style={styles.erro}>{erroGramas}</Text>}
                  {previa && !erroGramas && (
                    <Text style={styles.previa}>
                      ≈ {previa.kcal} kcal · P {previa.proteina} g · C {previa.carbo} g · G {previa.gordura} g
                    </Text>
                  )}

                  <TouchableOpacity style={styles.salvar} onPress={confirmarGramas} activeOpacity={0.85}>
                    <Text style={styles.salvarTxt}>{editando && gramasDe(editando.id) !== undefined ? "Atualizar" : "Adicionar ao prato"}</Text>
                  </TouchableOpacity>
                  {editando && gramasDe(editando.id) !== undefined && (
                    <TouchableOpacity onPress={removerEditando} style={styles.remover}>
                      <Text style={styles.removerTxt}>Remover do prato</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
        <BarraTeclado />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topo: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  voltar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  topoIcone: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#EAF3E4", alignItems: "center", justifyContent: "center" },
  titulo: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  conteudo: { padding: 20, paddingBottom: 120 },
  cta: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.primary, borderRadius: 18, padding: 18 },
  ctaIcone: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  ctaTitulo: { color: colors.background, fontSize: 17, fontWeight: "700" },
  ctaSub: { color: "rgba(250,249,244,0.8)", fontSize: 13, marginTop: 2 },
  fotoCard: { borderRadius: 18, overflow: "hidden" },
  fotoImg: { width: "100%", height: 200 },
  fotoTrocar: { position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  galeria: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 10 },
  galeriaTxt: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  aviso: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  secao: { fontSize: 17, fontWeight: "700", color: colors.textPrimary, marginTop: 24, marginBottom: 10 },
  busca: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, height: 46 },
  buscaInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  abas: { gap: 8, paddingVertical: 12 },
  aba: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  abaAtiva: { backgroundColor: colors.primary, borderColor: colors.primary },
  abaTxt: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  abaTxtAtiva: { color: "#fff" },
  grade: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  vazio: { color: colors.textSecondary, paddingVertical: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipMarcado: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  chipTxt: { fontSize: 14, color: colors.textPrimary, fontWeight: "500" },
  chipTxtMarcado: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16 },
  linha: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  linhaDivisor: { borderBottomWidth: 1, borderBottomColor: colors.border },
  linhaNome: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  linhaInfo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  linhaKcal: { fontSize: 14, fontWeight: "700", color: colors.primary },
  analise: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
  analiseTxt: { color: colors.textSecondary, fontSize: 14 },
  analiseErro: { backgroundColor: "#FDECEA", borderRadius: 12, padding: 12, marginTop: 6, gap: 6 },
  analiseErroTxt: { color: "#8E2B20", fontSize: 13, lineHeight: 18 },
  tentar: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  estimativa: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 6, gap: 4 },
  estimativaTitulo: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.6 },
  estimativaKcal: { fontSize: 26, fontWeight: "800", color: colors.textPrimary },
  estimativaMacros: { fontSize: 13, color: colors.textPrimary },
  estimativaLista: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: 2 },
  avisoBox: { flexDirection: "row", gap: 8, backgroundColor: "#FFF4DC", borderRadius: 10, padding: 10, marginTop: 8 },
  avisoBoxTxt: { flex: 1, fontSize: 12, lineHeight: 17, color: "#6B4500" },
  avaliacao: { borderRadius: 14, padding: 14, marginTop: 12, gap: 6 },
  avaliacaoTopo: { flexDirection: "row", alignItems: "center", gap: 8 },
  avaliacaoTitulo: { fontSize: 15, fontWeight: "800", flex: 1 },
  avaliacaoTxt: { fontSize: 13, lineHeight: 19 },
  avaliacaoDia: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  rodapeStatus: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  rodape: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  rodapeKcal: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  rodapeMacros: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  salvar: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 22, alignItems: "center" },
  salvarTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
  fundoModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  folha: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34, gap: 12 },
  folhaTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  folhaTitulo: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  folhaPergunta: { fontSize: 14, color: colors.textSecondary },
  ajuste: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginVertical: 6 },
  ajusteBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EAF3E4", alignItems: "center", justifyContent: "center" },
  campoGramas: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 4, minWidth: 120, borderBottomWidth: 2, borderBottomColor: colors.primary, paddingBottom: 4 },
  gramasInput: { fontSize: 36, fontWeight: "800", color: colors.textPrimary, textAlign: "center", minWidth: 80 },
  gramasUn: { fontSize: 18, fontWeight: "600", color: colors.textSecondary },
  sugerida: { textAlign: "center", color: colors.primary, fontWeight: "600", fontSize: 13 },
  erro: { textAlign: "center", color: "#C0392B", fontSize: 13 },
  previa: { textAlign: "center", color: colors.textSecondary, fontSize: 13 },
  remover: { alignItems: "center", paddingVertical: 6 },
  removerTxt: { color: "#C0392B", fontWeight: "600", fontSize: 14 },
});
