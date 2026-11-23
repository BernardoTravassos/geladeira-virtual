import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import { ALIMENTOS, Alimento, nutrientes, normalizar } from "../data/alimentos";
import { filtrarAlimentos } from "../utils/buscaAlimentos";
import { buscarNoServidor } from "../utils/catalogoServidor";
import type { ItemPrato } from "../utils/refeicoes";
import type { AlimentoReconhecido } from "../services/api";

type Origem = "catalogo" | "ia" | "rotulo" | "vazio";
type Linha = {
  chave: string;
  /** O alimento já resolvido: do catálogo (valores verificados), lido do rótulo, estimado pela IA ou ainda em branco. */
  alimento: Alimento;
  origem: Origem;
  marca?: string;
  gramas: number;
  incluido: boolean;
  /** A quantidade inicial é uma estimativa da IA (a pessoa ajusta). */
  gramasIA?: boolean;
  /** Produto de marca achado no banco do servidor, oferecido como troca. */
  sugestaoBanco?: Alimento | null;
};

const ROTULO_FONTE: Record<string, string> = { taco: "TACO", usda: "USDA", estimado: "estimado" };
/** Quantidade inicial: a estimativa da IA, se veio; senão a porção típica do catálogo; senão 100 g. */
const gramasIniciais = (a: AlimentoReconhecido, doCatalogo?: Alimento | null) => {
  if (typeof a.gramas_estimadas === "number" && a.gramas_estimadas > 0) return { gramas: Math.min(1000, Math.max(5, Math.round(a.gramas_estimadas))), gramasIA: true };
  if (doCatalogo?.porcaoPadrao && doCatalogo.porcaoPadrao <= 300) return { gramas: doCatalogo.porcaoPadrao, gramasIA: false };
  return { gramas: 100, gramasIA: false };
};
const NAO_IDENTIFICADO = "alimento nao identificado";

/** O alimento do catálogo que corresponde ao nome que a IA deu, ou null (a IA ainda pode ter razão). */
export function acharNoCatalogo(nome: string, catalogo: Alimento[]): Alimento | null {
  const n = normalizar(nome);
  const igual = catalogo.find((x) => normalizar(x.nome) === n);
  if (igual) return igual;
  return filtrarAlimentos(catalogo, nome, null)[0] ?? null;
}

const deIA = (a: AlimentoReconhecido, i: number): Alimento => ({
  id: `foto-${Date.now()}-${i}`, nome: a.nome, categoria: "pratos", porcaoPadrao: 100,
  kcal: a.calorias_100g, proteina: a.proteina_100g, carbo: a.carboidratos_100g, gordura: a.gordura_100g,
  personalizado: true,
});

const embranco = (): Alimento => ({ id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, nome: "", categoria: "pratos", porcaoPadrao: 100, kcal: 0, proteina: 0, carbo: 0, gordura: 0, personalizado: true });
const naoIdentificado = (a: AlimentoReconhecido) => a.certeza === "baixa" || normalizar(a.nome).startsWith(NAO_IDENTIFICADO);

/**
 * Depois que a IA reconhece a foto, a pessoa confere cada alimento:
 * "Está certo" (já vale), "Editar" (troca o nome, achando no catálogo e nos produtos de mercado,
 * e a quantidade) ou remove o que a IA errou. Se a IA não souber o que é, ela avisa e pede
 * para a pessoa dizer. Nada vai para a refeição sem essa conferência.
 */
export default function ConfirmarReconhecimento({ visivel, fotoUri, reconhecidos, confianca, meus, aoSalvar, aoAdicionar, aoCancelar }: {
  visivel: boolean;
  fotoUri?: string;
  reconhecidos: AlimentoReconhecido[];
  confianca: "baixa" | "media" | "alta";
  /** Alimentos criados pela pessoa (o catálogo do app é lido daqui de dentro, para pegar o que a busca no servidor acrescentar). */
  meus: Alimento[];
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
  const [ordem, setOrdem] = useState<string[] | null>(null);
  const [versao, setVersao] = useState(0);
  const semResultado = reconhecidos.length === 0;

  const catalogo = useMemo(() => [...ALIMENTOS, ...meus], [meus, versao]); // eslint-disable-line react-hooks/exhaustive-deps
  const catalogoRef = useRef(catalogo);
  catalogoRef.current = catalogo;

  // Chegou um reconhecimento novo: monta as linhas. O que a IA não soube dizer abre já em edição.
  useEffect(() => {
    if (!visivel) return;
    let vivo = true;
    const base: Linha[] = semResultado
      ? [{ chave: `l0-${Date.now()}`, alimento: embranco(), origem: "vazio", gramas: 100, incluido: true }]
      : reconhecidos.map((a, i) => {
          const chave = `l${i}-${Date.now()}`;
          if (naoIdentificado(a)) return { chave, alimento: embranco(), origem: "vazio", gramas: 100, incluido: true } as Linha;
          if (a.valores_do_rotulo) return { chave, alimento: deIA(a, i), origem: "rotulo", marca: a.marca || undefined, ...gramasIniciais(a), incluido: true } as Linha;
          if (a.marca) return { chave, alimento: deIA(a, i), origem: "ia", marca: a.marca, ...gramasIniciais(a), incluido: true } as Linha;
          const achado = acharNoCatalogo(a.nome, catalogoRef.current);
          return { chave, alimento: achado ?? deIA(a, i), origem: achado ? "catalogo" : "ia", ...gramasIniciais(a, achado), incluido: true } as Linha;
        });
    setLinhas(base);
    setTexto("");
    setOrdem(null);
    const primeiroVazio = base.find((l) => l.origem === "vazio");
    setEditando(primeiroVazio ? primeiroVazio.chave : null);

    // Produto de marca sem rótulo legível: procura no banco do servidor (inclui produtos de mercado) e oferece a troca.
    (async () => {
      for (const l of base) {
        if (!vivo || !l.marca || l.origem !== "ia") continue;
        const ids = await buscarNoServidor(l.alimento.nome);
        if (!vivo || !ids) continue;
        setVersao((v) => v + 1);
        const marca = normalizar(l.marca);
        const todos = [...ALIMENTOS, ...meus];
        const achado = filtrarAlimentos(todos, l.alimento.nome, ids).find((x) => normalizar(x.nome).includes(marca)) ?? null;
        if (achado) setLinhas((atual) => atual.map((x) => (x.chave === l.chave ? { ...x, sugestaoBanco: achado } : x)));
      }
    })();
    return () => { vivo = false; };
  }, [visivel, reconhecidos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Busca no servidor enquanto a pessoa digita o nome (espera ela parar de digitar).
  useEffect(() => {
    if (!editando || texto.trim().length < 2) { setOrdem(null); return; }
    let cancelado = false;
    const t = setTimeout(async () => {
      const ids = await buscarNoServidor(texto.trim());
      if (cancelado) return;
      setOrdem(ids);
      setVersao((v) => v + 1);
    }, 400);
    return () => { cancelado = true; clearTimeout(t); };
  }, [texto, editando]);

  const atualizar = (chave: string, parte: Partial<Linha>) => setLinhas((l) => l.map((x) => (x.chave === chave ? { ...x, ...parte } : x)));
  const incluidas = linhas.filter((l) => l.incluido);
  const faltaNome = incluidas.some((l) => l.origem === "vazio");
  const kcalTotal = incluidas.reduce((s, l) => s + nutrientes(l.alimento, l.gramas).kcal, 0);
  const podeConfirmar = incluidas.length > 0 && !faltaNome;
  const qtdNaoReconhecidos = reconhecidos.filter(naoIdentificado).length;

  const paraItens = (): ItemPrato[] =>
    incluidas.map((l) => (l.origem === "catalogo" && !l.alimento.personalizado
      ? { alimentoId: l.alimento.id, gramas: l.gramas }
      : { alimentoId: l.alimento.id, gramas: l.gramas, personalizado: l.alimento }));

  const sugestoes = useMemo(
    () => (editando && texto.trim().length >= 2 ? filtrarAlimentos(catalogo, texto, ordem).slice(0, 8) : []),
    [editando, texto, catalogo, ordem],
  );

  function abrirEdicao(l: Linha) {
    setEditando(l.chave);
    setTexto(l.origem === "vazio" ? "" : l.alimento.nome);
    setOrdem(null);
  }
  function escolher(a: Alimento) {
    if (!editando) return;
    atualizar(editando, { alimento: a, origem: "catalogo", marca: undefined, sugestaoBanco: null });
    setEditando(null);
  }
  /** Mantém os valores da IA, só com o nome que a pessoa digitou. */
  function manterComNome() {
    const linha = linhas.find((l) => l.chave === editando);
    const nome = texto.trim();
    if (!linha || linha.origem === "vazio" || nome.length < 2) return;
    atualizar(linha.chave, { alimento: { ...linha.alimento, nome, personalizado: true }, origem: linha.origem === "rotulo" ? "rotulo" : "ia" });
    setEditando(null);
  }
  function adicionarLinha() {
    const nova: Linha = { chave: `n-${Date.now()}`, alimento: embranco(), origem: "vazio", gramas: 100, incluido: true };
    setLinhas((l) => [...l, nova]);
    setEditando(nova.chave);
    setTexto("");
    setOrdem(null);
  }
  function removerLinha(l: Linha) {
    if (l.origem === "vazio") setLinhas((x) => x.filter((y) => y.chave !== l.chave));
    else atualizar(l.chave, { incluido: !l.incluido });
    if (editando === l.chave) setEditando(null);
  }
  function mudarGramas(chave: string, g: number) {
    atualizar(chave, { gramas: Math.min(2000, Math.max(1, Math.round(g))), gramasIA: false });
  }

  const baixa = confianca === "baixa";
  const aviso = semResultado
    ? { tipo: "aviso" as const, texto: "Não consegui reconhecer o que tem na foto. Diga abaixo qual é o alimento." }
    : qtdNaoReconhecidos > 0
      ? { tipo: "aviso" as const, texto: `Não reconheci ${qtdNaoReconhecidos === 1 ? "um dos itens" : `${qtdNaoReconhecidos} itens`}. Diga qual é o alimento no cartão amarelo.` }
      : baixa
        ? { tipo: "aviso" as const, texto: "Não tenho certeza: confira cada item com atenção." }
        : { tipo: "ok" as const, texto: confianca === "media" ? "Confiança média. Vale conferir os alimentos." : "Alimentos bem nítidos no prato." };
  const nReconhecidos = linhas.filter((l) => l.origem !== "vazio").length;

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
              <Text style={styles.pergunta}>
                {semResultado ? "Não consegui reconhecer" : nReconhecidos === 1 ? "Eu vi 1 alimento. Está correto?" : `Eu vi ${nReconhecidos} alimentos. Estão corretos?`}
              </Text>
              <Text style={styles.sub}>{semResultado ? "Diga o que é e eu coloco no seu prato." : "Confirme o que está certo e edite o que não estiver. Só entra na refeição o que você aceitar."}</Text>
            </View>
          </View>

          <View style={[styles.faixa, { backgroundColor: aviso.tipo === "aviso" ? colors.avisoFundo : colors.sucessoFundo }]}>
            <Feather name={aviso.tipo === "aviso" ? "alert-circle" : "check-circle"} size={14} color={aviso.tipo === "aviso" ? colors.avisoTexto : colors.sucessoTexto} />
            <Text style={[styles.faixaTxt, { color: aviso.tipo === "aviso" ? colors.avisoTexto : colors.sucessoTexto }]}>{aviso.texto}</Text>
          </View>

          {linhas.map((l, i) => {
            const n = nutrientes(l.alimento, l.gramas);
            const abrindo = editando === l.chave;
            const vazio = l.origem === "vazio";
            return (
              <View key={l.chave} style={[styles.card, vazio && { borderColor: colors.avisoTexto, backgroundColor: colors.avisoFundo }, !l.incluido && { opacity: 0.45 }]}>
                <View style={styles.linhaTopo}>
                  <View style={styles.indice}><Text style={styles.indiceTxt}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nome}>{vazio ? "Alimento não identificado" : l.alimento.nome}</Text>
                    {!vazio && !!l.marca && <Text style={styles.marca}>Marca: {l.marca}</Text>}
                    {!vazio && (
                      <View style={styles.fonteLinha}>
                        <View style={[styles.fonte, l.origem === "ia" ? { backgroundColor: colors.avisoFundo } : { backgroundColor: colors.sucessoFundo }]}>
                          <Text style={[styles.fonteTxt, { color: l.origem === "ia" ? colors.avisoTexto : colors.sucessoTexto }]}>
                            {l.origem === "rotulo" ? "✓ Valores do rótulo" : l.origem === "catalogo" ? `✓ Catálogo${l.alimento.fonte ? ` · ${ROTULO_FONTE[l.alimento.fonte] ?? ""}` : ""}` : "Estimativa da IA"}
                          </Text>
                        </View>
                        <Text style={styles.kcal}>{n.kcal} kcal</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removerLinha(l)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={vazio ? "Remover este item" : l.incluido ? "Não é isso: remover" : "Voltar a incluir"}>
                    <Feather name={!vazio && !l.incluido ? "rotate-ccw" : "trash-2"} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {vazio && !abrindo && (
                  <TouchableOpacity style={styles.manter} onPress={() => abrirEdicao(l)}><Text style={styles.manterTxt}>Dizer qual é o alimento</Text></TouchableOpacity>
                )}

                {l.incluido && !vazio && !abrindo && (
                  <>
                    {!!l.sugestaoBanco && (
                      <TouchableOpacity style={styles.banco} onPress={() => atualizar(l.chave, { alimento: l.sugestaoBanco!, origem: "catalogo", sugestaoBanco: null })} accessibilityRole="button">
                        <Feather name="search" size={14} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bancoTxt}>Achei esse produto no banco: {l.sugestaoBanco.nome}</Text>
                          <Text style={styles.sugestaoInfo}>{l.sugestaoBanco.kcal} kcal/100 g · toque para usar os valores dele</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    <View style={styles.qtd}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.qtdRot}>Quanto você comeu?</Text>
                        {l.gramasIA && <Text style={styles.dicaGramas}>Estimado pela IA: ajuste se precisar</Text>}
                      </View>
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
                    <Text style={styles.qtdRot}>{vazio ? "Qual é o alimento? (pode ser pela marca)" : "Qual é o alimento?"}</Text>
                    <TextInput value={texto} onChangeText={setTexto} placeholder="Ex.: arroz, frango grelhado, chocolate Lacta" placeholderTextColor={colors.textSecondary} style={styles.campo} autoFocus />
                    {sugestoes.map((s) => (
                      <TouchableOpacity key={s.id} style={styles.sugestao} onPress={() => escolher(s)}>
                        <Text style={styles.sugestaoNome}>{s.nome}</Text>
                        <Text style={styles.sugestaoInfo}>{s.kcal} kcal/100 g{s.fonte ? ` · ${ROTULO_FONTE[s.fonte]}` : ""}</Text>
                      </TouchableOpacity>
                    ))}
                    {texto.trim().length >= 2 && sugestoes.length === 0 && (
                      <Text style={styles.sub}>Não achei nada com esse nome. Tente outras palavras, ou cancele e use "Criar alimento" na tela da refeição.</Text>
                    )}
                    {!vazio && (
                      <TouchableOpacity style={styles.manter} onPress={manterComNome} disabled={texto.trim().length < 2}>
                        <Text style={styles.manterTxt}>Manter com este nome (valores da IA)</Text>
                      </TouchableOpacity>
                    )}
                    {(!vazio || linhas.length > 1) && <TouchableOpacity onPress={() => setEditando(null)}><Text style={[styles.sub, { textAlign: "center" }]}>Fechar</Text></TouchableOpacity>}
                  </View>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={styles.adicionar} onPress={adicionarLinha} accessibilityRole="button">
            <Feather name="plus" size={16} color={colors.primary} /><Text style={styles.adicionarTxt}>Faltou algum alimento? Adicionar</Text>
          </TouchableOpacity>
          {linhas.length > 0 && incluidas.length === 0 && <Text style={styles.sub}>Você removeu todos os alimentos. Cancele para marcar à mão, ou volte a incluir algum.</Text>}
          <Text style={styles.aviso}>Alimentos do catálogo usam valores verificados na TACO ou USDA. Estimativas da IA são aproximadas; os valores do rótulo vêm da embalagem.</Text>
        </ScrollView>

        <View style={[styles.rodape, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {faltaNome && <Text style={styles.dicaRodape}>Diga qual é o alimento do cartão amarelo, ou remova-o, para continuar.</Text>}
          <TouchableOpacity style={[styles.primario, !podeConfirmar && { opacity: 0.4 }]} disabled={!podeConfirmar} onPress={() => aoSalvar(paraItens())} accessibilityRole="button">
            <Feather name="check" size={18} color={colors.textoSobreMarca} />
            <Text style={styles.primarioTxt}>Está certo — salvar ({kcalTotal} kcal)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secundario} disabled={!podeConfirmar} onPress={() => aoAdicionar(paraItens())}>
            <Text style={[styles.secundarioTxt, !podeConfirmar && { opacity: 0.4 }]}>Só adicionar ao prato e continuar</Text>
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
  marca: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  fonteLinha: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  fonte: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  fonteTxt: { fontSize: 11, fontWeight: "700" },
  kcal: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  banco: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, backgroundColor: colors.fundoSuave },
  bancoTxt: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  qtd: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qtdRot: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  passo: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.fundoSuave, alignItems: "center", justifyContent: "center" },
  gramas: { minWidth: 56, textAlign: "center", fontSize: 16, fontWeight: "800", color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 2 },
  un: { fontSize: 13, color: colors.textSecondary },
  dicaGramas: { fontSize: 11, color: colors.avisoTexto, marginTop: 2 },
  editar: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  editarTxt: { fontSize: 13, fontWeight: "700", color: colors.primary },
  campo: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.background },
  sugestao: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 10, borderRadius: 12, backgroundColor: colors.fundoSuave },
  sugestaoNome: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  sugestaoInfo: { fontSize: 11, color: colors.textSecondary },
  manter: { paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  manterTxt: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  adicionar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: colors.primary },
  adicionarTxt: { fontSize: 13, fontWeight: "700", color: colors.primary },
  aviso: { fontSize: 11, color: colors.textSecondary, textAlign: "center", lineHeight: 16 },
  rodape: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  dicaRodape: { fontSize: 12, color: colors.avisoTexto, textAlign: "center", fontWeight: "700" },
  primario: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 16 },
  primarioTxt: { fontSize: 15, fontWeight: "800", color: colors.textoSobreMarca },
  secundario: { paddingVertical: 10, alignItems: "center" },
  secundarioTxt: { fontSize: 14, fontWeight: "700", color: colors.primary },
});
