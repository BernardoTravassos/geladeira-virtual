import React, { useCallback, useState } from "react";
import { validarSenha } from "../utils/validacao";
import BarraInferior from "../components/BarraInferior";
import { useFeedback } from "../components/Feedback";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, sombra, degrade } from "../theme/colors";
import { alterarSenha, getConta, getProfile, saveProfile } from "../services/api";
import { calcularMetas, calcularMetaAguaMl, nivelDoPerfil, nivelPorRotulo, NIVEIS_ATIVIDADE, PerfilApi } from "../utils/nutricao";
import CampoSenha from "../components/CampoSenha";
import BarraTeclado, { ID_BARRA_TECLADO } from "../components/BarraTeclado";
import { interpretarNumero } from "../utils/numeros";
import { OPCOES_INTOLERANCIA, REGRAS } from "../utils/camposPerfil";

type Chave =
  | "nome" | "idade" | "sexo" | "alturaCm" | "pesoKg" | "objetivo"
  | "nivelAtividade" | "vegano" | "intolerancias" | "preferenciaPreparo" | "tempoDisponivel";

type Campo = {
  chave: Chave;
  rotulo: string;
  icone: keyof typeof Feather.glyphMap;
  tipo: "texto" | "numero" | "selecao" | "intolerancias";
  opcoes?: string[];
};

const CAMPOS: Campo[] = [
  { chave: "nome", rotulo: "Nome", icone: "user", tipo: "texto" },
  { chave: "idade", rotulo: "Idade", icone: "calendar", tipo: "numero" },
  { chave: "sexo", rotulo: "Sexo", icone: "users", tipo: "selecao", opcoes: ["Masculino", "Feminino", "Outro"] },
  { chave: "alturaCm", rotulo: "Altura", icone: "maximize-2", tipo: "numero" },
  { chave: "pesoKg", rotulo: "Peso", icone: "activity", tipo: "numero" },
  { chave: "objetivo", rotulo: "Objetivo", icone: "target", tipo: "selecao", opcoes: ["Emagrecer", "Ganhar massa", "Manter o peso", "Comer mais saudável"] },
  { chave: "nivelAtividade", rotulo: "Atividade física", icone: "zap", tipo: "selecao", opcoes: NIVEIS_ATIVIDADE.map((n) => n.rotulo) },
  { chave: "vegano", rotulo: "Vegano", icone: "feather", tipo: "selecao", opcoes: ["Sim", "Não"] },
  { chave: "intolerancias", rotulo: "Intolerâncias", icone: "alert-circle", tipo: "intolerancias" },
  { chave: "preferenciaPreparo", rotulo: "Preparo", icone: "clock", tipo: "selecao", opcoes: ["Prático", "Elaborado"] },
  { chave: "tempoDisponivel", rotulo: "Tempo para cozinhar", icone: "watch", tipo: "selecao", opcoes: ["Pouco tempo", "Tempo razoável", "Bastante tempo"] },
];

const simNao = (b?: boolean) => (b ? "Sim" : "Não");

function valorDoCampo(p: PerfilApi | null, chave: Chave): string {
  if (!p) return "—";
  const peso = Number(p.peso_kg);
  switch (chave) {
    case "nome": return p.nome || "—";
    case "idade": return p.idade ? `${p.idade} anos` : "—";
    case "sexo": return p.sexo || "—";
    case "alturaCm": return p.altura_cm ? `${p.altura_cm} cm` : "—";
    case "pesoKg": return peso ? `${peso.toLocaleString("pt-BR")} kg` : "—";
    case "objetivo": return p.objetivo || "—";
    case "nivelAtividade": return NIVEIS_ATIVIDADE.find((n) => n.chave === nivelDoPerfil(p))?.curto ?? "—";
    case "vegano": return simNao((p as any).vegano);
    case "intolerancias": return (p as any).intolerancias || "Nenhuma";
    case "preferenciaPreparo": return (p as any).preferencia_preparo || "—";
    case "tempoDisponivel": return p.tempo_disponivel || "—";
  }
}

/** Valor "cru" para preencher o editor. */
function valorParaEditar(p: PerfilApi | null, chave: Chave): string {
  if (!p) return "";
  switch (chave) {
    case "nome": return p.nome ?? "";
    case "idade": return p.idade ? String(p.idade) : "";
    case "alturaCm": return p.altura_cm ? String(p.altura_cm) : "";
    case "pesoKg": return Number(p.peso_kg) ? String(Number(p.peso_kg)).replace(".", ",") : "";
    default: return valorDoCampo(p, chave);
  }
}

export default function PerfilScreen({ navigation }: any) {
  const feedback = useFeedback();
  const insets = useSafeAreaInsets();
  const [perfil, setPerfil] = useState<PerfilApi | null>(null);
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(true);

  const [campo, setCampo] = useState<Campo | null>(null);
  const [texto, setTexto] = useState("");
  const [escolha, setEscolha] = useState("");
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [outra, setOutra] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [senhaAberta, setSenhaAberta] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erroSenha, setErroSenha] = useState("");

  useFocusEffect(
    useCallback(() => {
      Promise.allSettled([getProfile(), getConta()]).then(([p, c]) => {
        if (p.status === "fulfilled") setPerfil(p.value);
        if (c.status === "fulfilled") setEmail(c.value.email);
        setCarregando(false);
      });
    }, []),
  );

  const metas = calcularMetas(perfil);
  const metaAgua = calcularMetaAguaMl(perfil);
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const iniciais = (perfil?.nome ?? email ?? "?").trim().split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "?";

  // ───────────── edição de um campo ─────────────
  function abrirEdicao(c: Campo) {
    setCampo(c);
    setErro("");
    setTexto(valorParaEditar(perfil, c.chave));
    setEscolha(
      c.chave === "nivelAtividade"
        ? NIVEIS_ATIVIDADE.find((n) => n.chave === nivelDoPerfil(perfil))?.rotulo ?? ""
        : c.tipo === "selecao" ? valorDoCampo(perfil, c.chave) : "",
    );
    if (c.tipo === "intolerancias") {
      const atuais = ((perfil as any)?.intolerancias ?? "").split(",").map((x: string) => x.trim()).filter(Boolean);
      const conhecidas = atuais.filter((x: string) => OPCOES_INTOLERANCIA.includes(x));
      const extras = atuais.filter((x: string) => !OPCOES_INTOLERANCIA.includes(x));
      setMarcadas(extras.length ? [...conhecidas, "Outra"] : conhecidas);
      setOutra(extras.join(", "));
    }
  }

  async function salvarCampo() {
    if (!campo || !perfil) return;
    setErro("");

    let novo: string | number | boolean | undefined;
    if (campo.tipo === "texto") {
      if (!texto.trim()) return setErro("Preencha este campo.");
      novo = texto.trim().slice(0, 80);
    } else if (campo.tipo === "numero") {
      const r = interpretarNumero(texto, REGRAS[campo.chave as "idade" | "alturaCm" | "pesoKg"]);
      if ("erro" in r) return setErro(r.erro);
      novo = r.valor;
    } else if (campo.tipo === "selecao") {
      if (!escolha || escolha === "—") return setErro("Escolha uma opção.");
      novo = campo.chave === "vegano" ? escolha === "Sim" : campo.chave === "nivelAtividade" ? nivelPorRotulo(escolha)?.chave : escolha;
    } else {
      const lista = [...marcadas.filter((m) => m !== "Outra"), ...(marcadas.includes("Outra") && outra.trim() ? [outra.trim()] : [])];
      if (marcadas.includes("Outra") && !outra.trim()) return setErro('Escreva qual é a "Outra" ou desmarque.');
      novo = lista.length ? lista.join(", ") : undefined;
    }

    const p: any = perfil;
    const dados = {
      nome: p.nome, idade: p.idade, sexo: p.sexo, alturaCm: p.altura_cm, pesoKg: Number(p.peso_kg),
      objetivo: p.objetivo, praticaExercicio: !!p.pratica_exercicio, nivelAtividade: nivelDoPerfil(perfil), intolerancias: p.intolerancias || undefined,
      vegano: !!p.vegano, preferenciaPreparo: p.preferencia_preparo, tempoDisponivel: p.tempo_disponivel,
      [campo.chave]: novo,
    };
    // O booleano antigo acompanha o nível (o backend o mantém coerente).
    if (campo.chave === "nivelAtividade") dados.praticaExercicio = novo !== "sedentario";

    setSalvando(true);
    try {
      await saveProfile(dados);
      setPerfil(await getProfile());
      setCampo(null);
      feedback.sucesso("Dados atualizados!", `${campo.rotulo} salvo(a) com sucesso`);
    } catch (e: any) {
      setErro(e?.response?.data?.error || "Não foi possível salvar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  // ───────────── troca de senha ─────────────
  function abrirSenha() {
    setSenhaAtual(""); setNovaSenha(""); setConfirmacao(""); setErroSenha("");
    setSenhaAberta(true);
  }

  async function confirmarSenha() {
    if (!senhaAtual) return setErroSenha("Digite a senha atual.");
    const erroForca = validarSenha(novaSenha);
    if (erroForca) return setErroSenha(erroForca);
    if (novaSenha !== confirmacao) return setErroSenha("A confirmação não é igual à nova senha.");
    if (novaSenha === senhaAtual) return setErroSenha("A nova senha precisa ser diferente da atual.");

    setSalvando(true);
    setErroSenha("");
    try {
      await alterarSenha(senhaAtual, novaSenha);
      setSenhaAberta(false);
      feedback.sucesso("Senha alterada!", "Em outros aparelhos, será preciso entrar de novo.", { duracao: 2600 });
    } catch (e: any) {
      setErroSenha(e?.response?.data?.error || "Não foi possível alterar a senha. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function sair() {
    await AsyncStorage.multiRemove(["@geladeira:token", "@geladeira:wizardDone"]);
    navigation.replace("Login");
  }

  function confirmarSaida() {
    Alert.alert("Sair da conta", "Você precisará entrar de novo para usar o app.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: sair },
    ]);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={degrade.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.decoracao} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar} accessibilityLabel="Voltar">
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{iniciais}</Text>
          </View>
          <Text style={styles.nome}>{perfil?.nome || "Seu perfil"}</Text>
          {!!email && <Text style={styles.email}>{email}</Text>}
        </LinearGradient>

        {carregando ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.corpo}>
            <Text style={styles.secao}>Dados pessoais</Text>
            <View style={styles.card}>
              {CAMPOS.map((c, i) => (
                <TouchableOpacity
                  key={c.chave}
                  style={[styles.linha, i < CAMPOS.length - 1 && styles.linhaDivisor]}
                  activeOpacity={0.7}
                  onPress={() => abrirEdicao(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${c.rotulo}`}
                >
                  <View style={styles.icone}><Feather name={c.icone} size={16} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rotulo}>{c.rotulo}</Text>
                    <Text style={styles.valor} numberOfLines={2}>{valorDoCampo(perfil, c.chave)}</Text>
                  </View>
                  <Feather name="edit-2" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.secao}>Suas metas diárias</Text>
            <View style={[styles.card, styles.metas]}>
              <Meta valor={`${metas.calorias}`} rotulo="kcal" />
              <Meta valor={`${metas.proteina} g`} rotulo="proteína" />
              <Meta valor={`${metas.carboidrato} g`} rotulo="carboidrato" />
              <Meta valor={`${metas.gordura} g`} rotulo="gordura" />
              <Meta valor={`${(metaAgua / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`} rotulo="água" />
            </View>
            <TouchableOpacity onPress={() => setDetalhesAbertos((v) => !v)} style={styles.comoCalc} accessibilityRole="button">
              <Feather name={detalhesAbertos ? "chevron-up" : "info"} size={14} color={colors.primary} />
              <Text style={styles.comoCalcTxt}>{detalhesAbertos ? "Ocultar o cálculo" : "Como calculamos?"}</Text>
            </TouchableOpacity>
            {detalhesAbertos && (
              <View style={[styles.card, { paddingVertical: 14, gap: 8 }]}>
                <LinhaCalculo rotulo="Metabolismo basal" valor={`${metas.detalhes.tmb} kcal`} nota="Mifflin-St Jeor: sexo, idade, peso e altura" />
                <LinhaCalculo rotulo={`× atividade (${metas.detalhes.nivel})`} valor={`${metas.detalhes.fator.toLocaleString("pt-BR")}`} nota={`Gasto diário: ${metas.detalhes.gastoTotal} kcal`} />
                <LinhaCalculo
                  rotulo={`Objetivo: ${perfil?.objetivo ?? "—"}`}
                  valor={`${metas.detalhes.ajusteKcal > 0 ? "+" : ""}${metas.detalhes.ajusteKcal} kcal`}
                  nota={metas.detalhes.ajusteKcal < 0 ? "Déficit de ~20% do gasto (máx. 750 kcal)" : metas.detalhes.ajusteKcal > 0 ? "Superávit de ~10% do gasto" : "Sem ajuste"}
                />
                <LinhaCalculo rotulo="Proteína" valor={`${metas.detalhes.proteinaPorKg.toLocaleString("pt-BR")} g/kg`} nota={`Sobre ${metas.detalhes.pesoBase} kg · IMC ${metas.detalhes.imc.toLocaleString("pt-BR")}`} />
                {metas.detalhes.avisos.map((a) => (
                  <Text key={a} style={styles.avisoCalc}>{a}</Text>
                ))}
              </View>
            )}
            <Text style={styles.nota}>Calculadas a partir dos seus dados e objetivo. São uma referência geral, não uma prescrição nutricional.</Text>

            <Text style={styles.secao}>Dispositivos</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.linha} activeOpacity={0.7} onPress={() => navigation.navigate("Smartwatch")} accessibilityRole="button">
                <View style={styles.icone}><Feather name="watch" size={16} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.valor}>Smartwatch e treinos</Text>
                  <Text style={styles.rotulo}>Passos, calorias gastas e treinos</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.secao}>Segurança</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.linha} activeOpacity={0.7} onPress={abrirSenha} accessibilityRole="button">
                <View style={styles.icone}><Feather name="lock" size={16} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.valor}>Alterar senha</Text>
                  <Text style={styles.rotulo}>Troque sua senha quando quiser</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.sair} onPress={confirmarSaida} activeOpacity={0.8}>
              <Feather name="log-out" size={16} color="#C0392B" />
              <Text style={styles.sairTxt}>Sair da conta</Text>
            </TouchableOpacity>
            <Text style={styles.versao}>Geladeira Virtual · versão de testes</Text>
          </View>
        )}
      </ScrollView>

      {/* Editar um campo */}
      <Modal visible={!!campo} transparent animationType="slide" onRequestClose={() => setCampo(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.fundo}>
              <TouchableWithoutFeedback>
                <View style={[styles.folha, { paddingBottom: 28 + insets.bottom }]}>
                  <View style={styles.folhaTopo}>
                    <Text style={styles.folhaTitulo}>{campo?.rotulo}</Text>
                    <TouchableOpacity onPress={() => setCampo(null)} accessibilityLabel="Fechar"><Feather name="x" size={20} color={colors.textSecondary} /></TouchableOpacity>
                  </View>

                  {campo?.tipo === "texto" && (
                    <TextInput style={styles.input} value={texto} onChangeText={setTexto} placeholder="Seu nome" placeholderTextColor={colors.textSecondary} maxLength={80} />
                  )}
                  {campo?.tipo === "numero" && (
                    <TextInput
                      style={styles.input}
                      value={texto}
                      onChangeText={(t) => { setTexto(t); setErro(""); }}
                      keyboardType="decimal-pad"
                      inputAccessoryViewID={ID_BARRA_TECLADO}
                      placeholder={campo.chave === "alturaCm" ? "Ex: 175 (em centímetros)" : campo.chave === "pesoKg" ? "Ex: 70,5" : "Ex: 28"}
                      placeholderTextColor={colors.textSecondary}
                    />
                  )}
                  {campo?.tipo === "selecao" && (
                    <View style={{ gap: 8 }}>
                      {campo.opcoes!.map((o) => (
                        <TouchableOpacity key={o} style={[styles.opcao, escolha === o && styles.opcaoSel]} onPress={() => setEscolha(o)}>
                          <Text style={[styles.opcaoTxt, escolha === o && styles.opcaoTxtSel]}>{o}</Text>
                          {escolha === o && <Feather name="check" size={16} color={colors.primary} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {campo?.tipo === "intolerancias" && (
                    <View style={{ gap: 10 }}>
                      <Text style={styles.rotulo}>Marque todas que se aplicam. Sem nenhuma marcada, fica "Nenhuma".</Text>
                      <View style={styles.chips}>
                        {OPCOES_INTOLERANCIA.map((o) => {
                          const m = marcadas.includes(o);
                          return (
                            <TouchableOpacity key={o} style={[styles.chip, m && styles.chipMarcado]} onPress={() => setMarcadas((a) => (a.includes(o) ? a.filter((x) => x !== o) : [...a, o]))}>
                              {m && <Feather name="check" size={14} color="#fff" />}
                              <Text style={[styles.chipTxt, m && styles.chipTxtMarcado]}>{o}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {marcadas.includes("Outra") && (
                        <TextInput style={styles.input} value={outra} onChangeText={setOutra} placeholder="Qual outra? Ex: milho" placeholderTextColor={colors.textSecondary} maxLength={60} />
                      )}
                    </View>
                  )}

                  {!!erro && <Text style={styles.erro}>{erro}</Text>}
                  <TouchableOpacity style={styles.botao} onPress={salvarCampo} disabled={salvando} activeOpacity={0.85}>
                    {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTxt}>Salvar</Text>}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
        <BarraTeclado />
      </Modal>

      {/* Alterar senha */}
      <Modal visible={senhaAberta} transparent animationType="slide" onRequestClose={() => setSenhaAberta(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.fundo}>
              <TouchableWithoutFeedback>
                <View style={[styles.folha, { paddingBottom: 28 + insets.bottom }]}>
                  <View style={styles.folhaTopo}>
                    <Text style={styles.folhaTitulo}>Alterar senha</Text>
                    <TouchableOpacity onPress={() => setSenhaAberta(false)} accessibilityLabel="Fechar"><Feather name="x" size={20} color={colors.textSecondary} /></TouchableOpacity>
                  </View>
                  <CampoSenha placeholder="Senha atual" textContentType="password" value={senhaAtual} onChangeText={(t) => { setSenhaAtual(t); setErroSenha(""); }} />
                  <CampoSenha placeholder="Nova senha (8+ caracteres e 1 maiúscula)" textContentType="newPassword" value={novaSenha} onChangeText={(t) => { setNovaSenha(t); setErroSenha(""); }} />
                  <CampoSenha placeholder="Confirmar nova senha" textContentType="newPassword" value={confirmacao} onChangeText={(t) => { setConfirmacao(t); setErroSenha(""); }} />
                  {!!erroSenha && <Text style={styles.erro}>{erroSenha}</Text>}
                  <TouchableOpacity style={styles.botao} onPress={confirmarSenha} disabled={salvando} activeOpacity={0.85}>
                    {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTxt}>Alterar senha</Text>}
                  </TouchableOpacity>
                  <Text style={styles.rotulo}>Ao trocar, os outros aparelhos conectados serão desconectados.</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
      <BarraInferior ativa="Perfil" />
    </View>
  );
}

function LinhaCalculo({ rotulo, valor, nota }: { rotulo: string; valor: string; nota: string }) {
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <Text style={styles.valor}>{rotulo}</Text>
        <Text style={[styles.valor, { color: colors.primary }]}>{valor}</Text>
      </View>
      <Text style={styles.rotulo}>{nota}</Text>
    </View>
  );
}

function Meta({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaValor}>{valor}</Text>
      <Text style={styles.metaRotulo}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { paddingTop: 54, paddingBottom: 30, alignItems: "center", borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: "hidden" },
  decoracao: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)", top: -70, right: -60 },
  voltar: { position: "absolute", left: 20, top: 54, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 3, borderColor: "rgba(255,255,255,0.5)", alignItems: "center", justifyContent: "center", marginTop: 8 },
  avatarTxt: { fontSize: 30, fontWeight: "800", color: "#fff" },
  nome: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 12 },
  email: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  corpo: { padding: 20, gap: 12 },
  secao: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, marginTop: 6 },
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, ...sombra },
  linha: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  linhaDivisor: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icone: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#EAF3E4", alignItems: "center", justifyContent: "center" },
  rotulo: { fontSize: 12, color: colors.textSecondary },
  valor: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginTop: 1 },
  metas: { flexDirection: "row", flexWrap: "wrap", paddingVertical: 14, gap: 6 },
  meta: { width: "31%", alignItems: "center", paddingVertical: 8 },
  metaValor: { fontSize: 17, fontWeight: "800", color: colors.primary },
  metaRotulo: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  comoCalc: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  comoCalcTxt: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  avisoCalc: { fontSize: 12, lineHeight: 17, color: "#6B4500", backgroundColor: "#FFF4DC", borderRadius: 10, padding: 10 },
  nota: { fontSize: 11, color: colors.textSecondary, lineHeight: 16, marginTop: -4 },
  sair: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#F0C4BF", marginTop: 8 },
  sairTxt: { color: "#C0392B", fontWeight: "700", fontSize: 15 },
  versao: { textAlign: "center", fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  folha: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, gap: 14 },
  folhaTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  folhaTitulo: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  input: { height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.surface },
  opcao: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, backgroundColor: colors.surface },
  opcaoSel: { borderColor: colors.primary, backgroundColor: "#EAF3E4" },
  opcaoTxt: { fontSize: 15, color: colors.textPrimary },
  opcaoTxtSel: { color: colors.primary, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipMarcado: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { fontSize: 14, color: colors.textPrimary },
  chipTxtMarcado: { color: "#fff", fontWeight: "600" },
  erro: { color: "#C0392B", fontSize: 13, lineHeight: 18 },
  botao: { height: 50, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  botaoTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
