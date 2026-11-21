import React, { useEffect, useMemo, useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import { ALIMENTOS, Alimento, nutrientes, normalizar } from "../data/alimentos";
import { filtrarAlimentos } from "../utils/buscaAlimentos";
import type { ItemPrato } from "../utils/refeicoes";
import type { AlimentoReconhecido } from "../services/api";

type Origem = "catalogo" | "ia";
type Linha = {
  chave: string;
  /** Alimento já resolvido: do catálogo (valores verificados) ou criado a partir da estimativa da IA. */
  alimento: Alimento;
  origem: Origem;
  gramas: number;
  incluido: boolean;
};

const ROTULO_FONTE: Record<string, string> = { taco: "TACO", usda: "USDA", estimado: "estimado" };

/** O alimento do catálogo que corresponde ao nome que a IA deu, ou null (a IA ainda pode ter razão). */
export function acharNoCatalogo(nome: string, catalogo: Alimento[]): Alimento | null {
  const n = normalizar(nome);
  const igual = catalogo.find((x) => normalizar(x.nome) === n);
  if (igual) return igual;
  return filtrarAlimentos(catalogo, nome, null)[0] ?? null;
}

function deIA(a: AlimentoReconhecido, i: number): Alimento {
  return {
    id: `foto-${Date.now()}-${i}`, nome: a.nome, categoria: "pratos", porcaoPadrao: 100,
    kcal: a.calorias_100g, proteina: a.proteina_100g, carbo: a.carboidratos_100g, gordura: a.gordura_100g,
    personalizado: true,
  };
}

/**
 * Depois que a IA reconhece o prato, a pessoa confere cada alimento:
 * "Está certo" (já vale), "Editar" (troca o nome, achando no catálogo, e a quantidade)
 * ou remove o que a IA errou. Nada vai para a refeição sem essa conferência.
 */
export default function ConfirmarReconhecimento({ visivel, fotoUri, reconhecidos, confianca, catalogo, aoSalvar, aoAdicionar, aoCancelar }: {
  visivel: boolean;
  fotoUri?: string;
  reconhecidos: AlimentoReconhecido[];
  confianca: "baixa" | "media" | "alta";
  catalogo: Alimento[];
  aoSalvar: (itens: ItemPrato[]) => void;
  aoAdicionar: (itens: ItemPrato[]) => void;
  aoCancelar: () => void;
}) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [texto, setTexto] = useState("");

  // Cada vez que chega um reconhecimento novo, monta as linhas já tentando achar o alimento no catálogo.
  useEffect(() => {
    if (!visivel) return;
    setLinhas(reconhecidos.map((a, i) => {
      const achado = acharNoCatalogo(a.nome, catalogo);
      return {
        chave: `l${i}-${Date.now()}`,
        alimento: achado ?? deIA(a, i),
        origem: achado ? "catalogo" : "ia",
        gramas: 100, // ponto de partida: a pessoa ajusta quanto comeu
        incluido: true,
      } as Linha;
    }));
    setEditando(null);
  }, [visivel, reconhecidos]); // eslint-disable-line react-hooks/exhaustive-deps

  const atualizar = (chave: string, parte: Partial<Linha>) => setLinhas((l) => l.map((x) => (x.chave === chave ? { ...x, ...parte } : x)));
  const incluidas = linhas.filter((l) => l.incluido);
  const kcalTotal = incluidas.reduce((s, l) => s + nutrientes(l.alimento, l.gramas).kcal, 0);

  const paraItens = (): ItemPrato[] =>
    incluidas.map((l) => (l.origem === "catalogo" && !l.alimento.personalizado
      ? { alimentoId: l.alimento.id, gramas: l.gramas }
      : { alimentoId: l.alimento.id, gramas: l.gramas, personalizado: l.alimento }));

  const sugestoes = useMemo(() => (editando && texto.trim().length >= 2 ? filtrarAlimentos(catalogo, texto, null).slice(0, 6) : []), [editando, texto, catalogo]);

  function abrirEdicao(l: Linha) {
    setEditando(l.chave);
    setTexto(l.alimento.nome);
  }
  function escolher(a: Alimento) {
    if (!editando) return;
    atualizar(editando, { alimento: a, origem: "catalogo" });
    setEditando(null);
  }
  /** Mantém os valores da IA, só com o nome que a pessoa digitou. */
  function manterComNome() {
    const linha = linhas.find((l) => l.chave === editando);
    const nome = texto.trim();
    if (!linha || nome.length < 2) return;
    atualizar(linha.chave, { alimento: { ...linha.alimento, nome, personalizado: true }, origem: "ia" });
    setEditando(null);
  }
  function mudarGramas(chave: string, g: number) {
    atualizar(chave, { gramas: Math.min(2000, Math.max(1, Math.round(g))) });
  }

  const baixa = confianca === "baixa";

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={aoCancelar}>
      <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.topo, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={aoCancelar} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Cancelar"><Feather name="x" size={22} color={colors.textPrimary} /></TouchableOpacity>
          <Text style={styles.titulo}>Confira o seu prato</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.cabecalho}>
            {!!fotoUri && <Image source={{ uri: fotoUri }} style={styles.foto} />}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.pergunta}>{linhas.length === 1 ? "Eu vi 1 alimento. Está correto?" : `Eu vi ${linhas.length} alimentos. Estão corretos?`}</Text>
              <Text style={styles.sub}>Confirme o que está certo e edite o que não estiver. Só entra na refeição o que você aceitar.</Text>
            </View>
          </View>

          <View style={[styles.faixa, baixa ? { backgroundColor: colors.avisoFundo } : { backgroundColor: colors.sucessoFundo }]}>
            <Feather name={baixa ? "alert-circle" : "check-circle"} size={14} color={baixa ? colors.avisoTexto : colors.sucessoTexto} />
            <Text style={[styles.faixaTxt, { color: baixa ? colors.avisoTexto : colors.sucessoTexto }]}>
              {baixa ? "Não tenho certeza: confira cada item com atenção." : confianca === "media" ? "Confiança média. Vale conferir os alimentos." : "Alimentos bem nítidos no prato."}
            </Text>
          </View>

          {linhas.map((l, i) => {
            const n = nutrientes(l.alimento, l.gramas);
            const abrindo = editando === l.chave;
            return (
              <View key={l.chave} style={[styles.card, !l.incluido && { opacity: 0.45 }]}>
                <View style={styles.linhaTopo}>
                  <View style={styles.indice}><Text style={styles.indiceTxt}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nome}>{l.alimento.nome}</Text>
                    <View style={styles.fonteLinha}>
                      <View style={[styles.fonte, l.origem === "catalogo" ? { backgroundColor: colors.sucessoFundo } : { backgroundColor: colors.avisoFundo }]}>
                        <Text style={[styles.fonteTxt, { color: l.origem === "catalogo" ? colors.sucessoTexto : colors.avisoTexto }]}>
                          {l.origem === "catalogo" ? `✓ Catálogo${l.alimento.fonte ? ` · ${ROTULO_FONTE[l.alimento.fonte] ?? ""}` : ""}` : "Estimativa da IA"}
                        </Text>
                      </View>
                      <Text style={styles.kcal}>{n.kcal} kcal</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => atualizar(l.chave, { incluido: !l.incluido })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={l.incluido ? "Não é isso: remover" : "Voltar a incluir"}>
                    <Feather name={l.incluido ? "trash-2" : "rotate-ccw"} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {l.incluido && !abrindo && (
                  <>
                    <View style={styles.qtd}>
                      <Text style={styles.qtdRot}>Quanto você comeu?</Text>
                      <View style={styles.stepper}>
                        <TouchableOpacity style={styles.passo} onPress={() => mudarGramas(l.chave, l.gramas - 10)} accessibilityLabel="Diminuir 10 gramas"><Feather name="minus" size={16} color={colors.textPrimary} /></TouchableOpacity>
                        <TextInput value={String(l.gramas)} onChangeText={(t) => mudarGramas(l.chave, Number(t.replace(/\D/g, "")) || 1)} keyboardType="number-pad" style={styles.gramas} selectTextOnFocus />
                        <Text style={styles.un}>g</Text>
                        <TouchableOpacity style={styles.passo} onPress={() => mudarGramas(l.chave, l.gramas + 10)} accessibilityLabel="Aumentar 10 gramas"><Feather name="plus" size={16} color={colors.textPrimary} /></TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.editar} onPress={() => abrirEdicao(l)} accessibilityRole="button">
                      <Feather name="edit-2" size={14} color={colors.primary} /><Text style={styles.editarTxt}>Não é isso? Editar</Text>
                    </TouchableOpacity>
                  </>
                )}

                {abrindo && (
                  <View style={{ gap: 8 }}>
                    <Text style={styles.qtdRot}>Qual é o alimento?</Text>
                    <TextInput value={texto} onChangeText={setTexto} placeholder="Digite o nome (ex.: arroz, frango grelhado)" placeholderTextColor={colors.textSecondary} style={styles.campo} autoFocus />
                    {sugestoes.map((s) => (
                      <TouchableOpacity key={s.id} style={styles.sugestao} onPress={() => escolher(s)}>
                        <Text style={styles.sugestaoNome}>{s.nome}</Text>
                        <Text style={styles.sugestaoInfo}>{s.kcal} kcal/100 g{s.fonte ? ` · ${ROTULO_FONTE[s.fonte]}` : ""}</Text>
                      </TouchableOpacity>
                    ))}
                    {texto.trim().length >= 2 && sugestoes.length === 0 && <Text style={styles.sub}>Não achei no catálogo.</Text>}
                    <TouchableOpacity style={styles.manter} onPress={manterComNome} disabled={texto.trim().length < 2}>
                      <Text style={styles.manterTxt}>Manter com este nome (valores da IA)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditando(null)}><Text style={[styles.sub, { textAlign: "center" }]}>Cancelar edição</Text></TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
          {linhas.length > 0 && incluidas.length === 0 && <Text style={styles.sub}>Você removeu todos os alimentos. Cancele para marcar à mão, ou volte a incluir algum.</Text>}
          <Text style={styles.aviso}>Os alimentos do catálogo usam valores verificados na TACO ou USDA. A estimativa da IA é aproximada.</Text>
        </ScrollView>

        <View style={[styles.rodape, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={[styles.primario, incluidas.length === 0 && { opacity: 0.4 }]} disabled={incluidas.length === 0} onPress={() => aoSalvar(paraItens())} accessibilityRole="button">
            <Feather name="check" size={18} color={colors.textoSobreMarca} />
            <Text style={styles.primarioTxt}>Está certo — salvar ({kcalTotal} kcal)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secundario} disabled={incluidas.length === 0} onPress={() => aoAdicionar(paraItens())}>
            <Text style={styles.secundarioTxt}>Só adicionar ao prato e continuar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.background },
  topo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  titulo: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },
  cabecalho: { flexDirection: "row", gap: 12, alignItems: "center" },
  foto: { width: 84, height: 84, borderRadius: 16 },
  pergunta: { fontSize: 17, fontWeight: "800", color: colors.textPrimary, lineHeight: 22 },
  sub: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  faixa: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 12 },
  faixaTxt: { flex: 1, fontSize: 12, fontWeight: "700" },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  linhaTopo: { flexDirection: "row", alignItems: "center", gap: 10 },
  indice: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.fundoSuave, alignItems: "center", justifyContent: "center" },
  indiceTxt: { fontSize: 12, fontWeight: "800", color: colors.primary },
  nome: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  fonteLinha: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  fonte: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  fonteTxt: { fontSize: 11, fontWeight: "700" },
  kcal: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  qtd: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qtdRot: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  passo: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.fundoSuave, alignItems: "center", justifyContent: "center" },
  gramas: { minWidth: 56, textAlign: "center", fontSize: 16, fontWeight: "800", color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 2 },
  un: { fontSize: 13, color: colors.textSecondary },
  editar: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  editarTxt: { fontSize: 13, fontWeight: "700", color: colors.primary },
  campo: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.background },
  sugestao: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 10, borderRadius: 12, backgroundColor: colors.fundoSuave },
  sugestaoNome: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  sugestaoInfo: { fontSize: 11, color: colors.textSecondary },
  manter: { paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  manterTxt: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  aviso: { fontSize: 11, color: colors.textSecondary, textAlign: "center", lineHeight: 16 },
  rodape: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  primario: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 16 },
  primarioTxt: { fontSize: 15, fontWeight: "800", color: colors.textoSobreMarca },
  secundario: { paddingVertical: 10, alignItems: "center" },
  secundarioTxt: { fontSize: 14, fontWeight: "700", color: colors.primary },
});
