import { useCores, useTema } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useCallback, useState, useMemo } from "react";
import { validarSenha } from "../utils/validacao";
import BarraInferior from "../components/BarraInferior";
import { useFeedback } from "../components/Feedback";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, LayoutAnimation, UIManager,
} from "react-native";
import { Feather } from "@expo/vector-icons";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sombra, degrade } from "../theme/colors";
import { alterarSenha, getConta, getProfile, saveProfile } from "../services/api";
import { encerrarSessao } from "../services/nutri";
import { calcularMetas, calcularMetaAguaMl, nivelDoPerfil, nivelPorRotulo, NIVEIS_ATIVIDADE, PerfilApi } from "../utils/nutricao";
import CampoSenha from "../components/CampoSenha";
import CardMeuNutricionista from "../components/CardMeuNutricionista";
import BarraTeclado, { ID_BARRA_TECLADO } from "../components/BarraTeclado";
import { interpretarNumero } from "../utils/numeros";
import {
  OPCOES_INTOLERANCIA, OPCOES_CONDICOES, OPCOES_GESTACAO, OPCOES_RITMO, OPCOES_ROTINA, OPCOES_DIAS_TREINO,
  OPCOES_DURACAO_TREINO, OPCOES_INTENSIDADE, REGRAS, chaveDe, curtoDe, rotuloDe, type OpcaoPerfil,
} from "../utils/camposPerfil";

type Chave =
  | "nome" | "idade" | "sexo" | "alturaCm" | "pesoKg" | "objetivo"
  | "vegano" | "intolerancias" | "preferenciaPreparo" | "tempoDisponivel"
  | "gestacao" | "gorduraPct" | "pesoMetaKg" | "ritmo" | "rotinaDiaria" | "diasTreino"
  | "duracaoTreino" | "intensidadeTreino" | "condicoesSaude";

type Campo = {
  chave: Chave;
  rotulo: string;
  icone: keyof typeof Feather.glyphMap;
  tipo: "texto" | "numero" | "selecao" | "intolerancias" | "condicoes";
  opcoes?: string[];
  /** Seleção cujo valor guardado é uma chave (e não o próprio texto). */
  lista?: OpcaoPerfil<any>[];
  /** Número que pode ficar em branco (vira "não informado"). */
  opcional?: boolean;
  /** Só aparece quando a pergunta faz sentido para este perfil. */
  mostrar?: (p: PerfilApi | null) => boolean;
};

const querMudarPeso = (p: PerfilApi | null) => p?.objetivo === "Emagrecer" || p?.objetivo === "Ganhar massa";
const treinaHoje = (p: PerfilApi | null) => (p?.dias_treino ?? 0) > 0;

const CAMPOS: Campo[] = [
  { chave: "nome", rotulo: "Nome", icone: "user", tipo: "texto" },
  { chave: "idade", rotulo: "Idade", icone: "calendar", tipo: "numero" },
  { chave: "sexo", rotulo: "Sexo", icone: "users", tipo: "selecao", opcoes: ["Masculino", "Feminino", "Outro"] },
  { chave: "alturaCm", rotulo: "Altura", icone: "maximize-2", tipo: "numero" },
  { chave: "pesoKg", rotulo: "Peso", icone: "activity", tipo: "numero" },
  { chave: "objetivo", rotulo: "Objetivo", icone: "target", tipo: "selecao", opcoes: ["Emagrecer", "Ganhar massa", "Manter o peso", "Comer mais saudável"] },
  { chave: "pesoMetaKg", rotulo: "Peso desejado", icone: "flag", tipo: "numero", opcional: true, mostrar: querMudarPeso },
  { chave: "ritmo", rotulo: "Ritmo", icone: "trending-up", tipo: "selecao", lista: OPCOES_RITMO, mostrar: querMudarPeso },
  { chave: "gorduraPct", rotulo: "Gordura corporal", icone: "percent", tipo: "numero", opcional: true },
  { chave: "gestacao", rotulo: "Gestação / amamentação", icone: "heart", tipo: "selecao", lista: OPCOES_GESTACAO, mostrar: (p) => p?.sexo === "Feminino" },
  { chave: "rotinaDiaria", rotulo: "Dia a dia", icone: "sun", tipo: "selecao", lista: OPCOES_ROTINA },
  { chave: "diasTreino", rotulo: "Treino por semana", icone: "zap", tipo: "selecao", lista: OPCOES_DIAS_TREINO },
  { chave: "duracaoTreino", rotulo: "Duração do treino", icone: "clock", tipo: "selecao", lista: OPCOES_DURACAO_TREINO, mostrar: treinaHoje },
  { chave: "intensidadeTreino", rotulo: "Intensidade do treino", icone: "activity", tipo: "selecao", lista: OPCOES_INTENSIDADE, mostrar: treinaHoje },
  { chave: "condicoesSaude", rotulo: "Condições de saúde", icone: "plus-square", tipo: "condicoes" },
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
    case "pesoMetaKg": return Number(p.peso_meta_kg) ? `${Number(p.peso_meta_kg).toLocaleString("pt-BR")} kg` : "Não informado";
    case "gorduraPct": return Number(p.gordura_pct) ? `${Number(p.gordura_pct).toLocaleString("pt-BR")}%` : "Não informado";
    case "ritmo": return curtoDe(OPCOES_RITMO, p.ritmo) ?? "Moderado";
    case "gestacao": return curtoDe(OPCOES_GESTACAO, p.gestacao) ?? "Não";
    case "rotinaDiaria": return curtoDe(OPCOES_ROTINA, p.rotina_diaria) ?? "Não informado";
    case "diasTreino": return curtoDe(OPCOES_DIAS_TREINO, p.dias_treino) ?? "Não informado";
    case "duracaoTreino": return curtoDe(OPCOES_DURACAO_TREINO, p.minutos_treino) ?? "—";
    case "intensidadeTreino": return curtoDe(OPCOES_INTENSIDADE, p.intensidade_treino) ?? "—";
    case "condicoesSaude": return p.condicoes_saude || "Nenhuma";
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
    case "pesoMetaKg": return Number(p.peso_meta_kg) ? String(Number(p.peso_meta_kg)).replace(".", ",") : "";
    case "gorduraPct": return Number(p.gordura_pct) ? String(Number(p.gordura_pct)).replace(".", ",") : "";
    default: return valorDoCampo(p, chave);
  }
}

/** Texto completo da opção escolhida hoje, para marcar a seleção ao abrir a edição. */
function rotuloAtual(p: PerfilApi | null, c: Campo): string {
  if (!c.lista || !p) return "";
  const bruto =
    c.chave === "ritmo" ? p.ritmo ?? "moderado"
    : c.chave === "gestacao" ? p.gestacao ?? "nao"
    : c.chave === "rotinaDiaria" ? p.rotina_diaria
    : c.chave === "diasTreino" ? p.dias_treino
    : c.chave === "duracaoTreino" ? p.minutos_treino
    : p.intensidade_treino;
  return rotuloDe(c.lista, bruto) ?? "";
}

export default function PerfilScreen({ navigation }: any) {
  const colors = useCores();
  const tema = useTema();
  const styles = useMemo(() => criarStyles(colors), [colors]);
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

  const camposVisiveis = CAMPOS.filter((c) => !c.mostrar || c.mostrar(perfil));
  const metas = calcularMetas(perfil);
  const metaAgua = calcularMetaAguaMl(perfil);
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [dadosAbertos, setDadosAbertos] = useState(false);
  function alternarDados() {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, "easeInEaseOut", "opacity"));
    setDadosAbertos((v) => !v);
  }
  const iniciais = (perfil?.nome ?? email ?? "?").trim().split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "?";

  // ───────────── edição de um campo ─────────────
  function abrirEdicao(c: Campo) {
    setCampo(c);
    setErro("");
    setTexto(valorParaEditar(perfil, c.chave));
    setEscolha(c.lista ? rotuloAtual(perfil, c) : c.tipo === "selecao" ? valorDoCampo(perfil, c.chave) : "");
    if (c.tipo === "condicoes") {
      setMarcadas(((perfil?.condicoes_saude ?? "") as string).split(",").map((x) => x.trim()).filter((x) => OPCOES_CONDICOES.includes(x)));
      setOutra("");
    }
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
      if (campo.opcional && !texto.trim()) {
        novo = undefined;
      } else {
        const r = interpretarNumero(texto, REGRAS[campo.chave as keyof typeof REGRAS]);
        if ("erro" in r) return setErro(r.erro);
        novo = r.valor;
        if (campo.chave === "pesoMetaKg") {
          const atual = Number(perfil.peso_kg);
          if (perfil.objetivo === "Emagrecer" && r.valor >= atual) return setErro(`Para emagrecer, o peso desejado precisa ser menor que o atual (${atual} kg).`);
          if (perfil.objetivo === "Ganhar massa" && r.valor <= atual) return setErro(`Para ganhar massa, o peso desejado precisa ser maior que o atual (${atual} kg).`);
        }
      }
    } else if (campo.tipo === "selecao") {
      if (!escolha || escolha === "—") return setErro("Escolha uma opção.");
      novo = campo.lista ? chaveDe(campo.lista, escolha) : campo.chave === "vegano" ? escolha === "Sim" : escolha;
    } else if (campo.tipo === "condicoes") {
      novo = marcadas.length ? marcadas.join(", ") : undefined;
    } else {
      const lista = [...marcadas.filter((m) => m !== "Outra"), ...(marcadas.includes("Outra") && outra.trim() ? [outra.trim()] : [])];
      if (marcadas.includes("Outra") && !outra.trim()) return setErro('Escreva qual é a "Outra" ou desmarque.');
      novo = lista.length ? lista.join(", ") : undefined;
    }

    const p: any = perfil;
    const numeroOuNulo = (v: unknown) => (v !== null && v !== undefined && v !== "" && Number(v) ? Number(v) : null);
    // O app reenvia o perfil inteiro a cada edição: os campos novos precisam ir junto,
    // senão editar o nome apagaria as respostas de treino, gestação etc.
    const dados: any = {
      nome: p.nome, idade: p.idade, sexo: p.sexo, alturaCm: p.altura_cm, pesoKg: Number(p.peso_kg),
      objetivo: p.objetivo, praticaExercicio: !!p.pratica_exercicio, nivelAtividade: nivelDoPerfil(perfil), intolerancias: p.intolerancias || undefined,
      vegano: !!p.vegano, preferenciaPreparo: p.preferencia_preparo, tempoDisponivel: p.tempo_disponivel,
      gestacao: p.gestacao ?? null, gorduraPct: numeroOuNulo(p.gordura_pct), pesoMetaKg: numeroOuNulo(p.peso_meta_kg),
      ritmo: p.ritmo ?? null, rotinaDiaria: p.rotina_diaria ?? null, diasTreino: p.dias_treino ?? null,
      minutosTreino: p.minutos_treino ?? null, intensidadeTreino: p.intensidade_treino ?? null,
      condicoesSaude: p.condicoes_saude ?? null,
    };
    const chaveNoEnvio = campo.chave === "duracaoTreino" ? "minutosTreino" : campo.chave;
    dados[chaveNoEnvio] = novo === undefined ? null : novo;
    if (campo.chave === "diasTreino") {
      const dias = Number(novo);
      dados.praticaExercicio = dias > 0;
      dados.nivelAtividade = nivelDoPerfil({ dias_treino: dias });
      if (dias === 0) { dados.minutosTreino = null; dados.intensidadeTreino = null; }
      else { dados.minutosTreino ??= 60; dados.intensidadeTreino ??= "moderada"; }
    }
    if (campo.chave === "objetivo" && !querMudarPeso({ objetivo: String(novo) })) { dados.pesoMetaKg = null; dados.ritmo = null; }
    // Sem rotina informada (perfil antigo) o cálculo seguiria o nível antigo; ao tocar em treino, preenche a rotina padrão.
    if (campo.chave === "diasTreino" && !dados.rotinaDiaria) dados.rotinaDiaria = "sentado";
    // Perfil antigo: ao informar só a rotina, traz o treino do nível antigo para o cálculo detalhado valer.
    if (campo.chave === "rotinaDiaria" && dados.diasTreino == null) {
      const d = ({ sedentario: 0, leve: 2, moderado: 4, intenso: 5, muito_intenso: 7 } as const)[nivelDoPerfil(perfil)];
      dados.diasTreino = d;
      dados.praticaExercicio = d > 0;
      if (d > 0) { dados.minutosTreino ??= 60; dados.intensidadeTreino ??= "moderada"; }
    }

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
    await encerrarSessao();
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
            <View style={[styles.card, { overflow: "hidden" }]}>
              <TouchableOpacity
                style={[styles.linha, dadosAbertos && styles.linhaDivisor]}
                activeOpacity={0.7}
                onPress={alternarDados}
                accessibilityRole="button"
                accessibilityState={{ expanded: dadosAbertos }}
                accessibilityLabel="Dados pessoais"
              >
                <View style={styles.icone}><Feather name="user" size={16} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.valor}>Dados pessoais</Text>
                  <Text style={styles.rotulo} numberOfLines={1}>
                    {dadosAbertos ? "Toque em um dado para editar" : [perfil?.nome, perfil?.idade ? `${perfil.idade} anos` : null].filter(Boolean).join(" · ") || "Toque para ver"}
                  </Text>
                </View>
                <Feather name={dadosAbertos ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              {dadosAbertos && camposVisiveis.map((c, i) => (
                <TouchableOpacity
                  key={c.chave}
                  style={[styles.linha, i < camposVisiveis.length - 1 && styles.linhaDivisor]}
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
                <LinhaCalculo rotulo="Metabolismo basal" valor={`${metas.detalhes.tmb} kcal`} nota={`${metas.detalhes.metodoTmb}: ${metas.detalhes.metodoTmb.startsWith("Katch") ? "massa magra" : "sexo, idade, peso e altura"}`} />
                <LinhaCalculo rotulo={`× atividade (${metas.detalhes.nivel})`} valor={`${metas.detalhes.fator.toLocaleString("pt-BR")}`} nota={`Gasto diário: ${metas.detalhes.gastoTotal} kcal${metas.detalhes.gastoExercicio > 0 ? ` (treino: ~${metas.detalhes.gastoExercicio} kcal/dia)` : ""}`} />
                <LinhaCalculo
                  rotulo={`Objetivo: ${perfil?.objetivo ?? "—"}`}
                  valor={`${metas.detalhes.ajusteKcal > 0 ? "+" : ""}${metas.detalhes.ajusteKcal} kcal`}
                  nota={metas.detalhes.notaAjuste}
                />
                {metas.detalhes.semanasParaMeta !== null && (
                  <LinhaCalculo
                    rotulo="Prazo estimado"
                    valor={`~${metas.detalhes.semanasParaMeta} sem.`}
                    nota={`Até ${Number(perfil?.peso_meta_kg).toLocaleString("pt-BR")} kg, a ~${metas.detalhes.kgPorSemana.toLocaleString("pt-BR")} kg por semana`}
                  />
                )}
                <LinhaCalculo rotulo="Proteína" valor={`${metas.detalhes.proteinaPorKg.toLocaleString("pt-BR")} g/kg`} nota={`Sobre ${metas.detalhes.pesoBase} kg · IMC ${metas.detalhes.imc.toLocaleString("pt-BR")}`} />
                {metas.detalhes.avisos.map((a) => (
                  <Text key={a} style={styles.avisoCalc}>{a}</Text>
                ))}
              </View>
            )}
            <Text style={styles.nota}>Calculadas a partir dos seus dados e objetivo. São uma referência geral, não uma prescrição nutricional.</Text>

            <Text style={styles.secao}>Aparência</Text>
            <View style={[styles.card, styles.aparencia]}>
              {([
                { modo: "sistema", rotulo: "Automático", icone: "smartphone" },
                { modo: "claro", rotulo: "Claro", icone: "sun" },
                { modo: "escuro", rotulo: "Escuro", icone: "moon" },
              ] as const).map((o) => {
                const ativo = tema.modo === o.modo;
                return (
                  <TouchableOpacity
                    key={o.modo}
                    style={[styles.opcaoTema, ativo && styles.opcaoTemaAtiva]}
                    onPress={() => tema.definirModo(o.modo)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativo }}
                  >
                    <Feather name={o.icone} size={18} color={ativo ? colors.textoSobreMarca : colors.textSecondary} />
                    <Text style={[styles.opcaoTemaTxt, ativo && { color: colors.textoSobreMarca }]}>{o.rotulo}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.nota}>"Automático" acompanha o modo claro ou escuro do seu celular.</Text>

            <Text style={styles.secao}>Meu nutricionista</Text>
            <CardMeuNutricionista />

            <Text style={styles.secao}>Notificações</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.linha} activeOpacity={0.7} onPress={() => navigation.navigate("Lembretes")} accessibilityRole="button">
                <View style={styles.icone}><Feather name="bell" size={16} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.valor}>Lembretes e parabéns</Text>
                  <Text style={styles.rotulo}>Água, refeições, treino e conquistas</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

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
              <Feather name="log-out" size={16} color={colors.erroTexto} />
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
                      placeholder={campo.chave === "alturaCm" ? "Ex: 175 (em centímetros)" : campo.chave === "pesoKg" || campo.chave === "pesoMetaKg" ? "Ex: 70,5" : campo.chave === "gorduraPct" ? "Ex: 22 (deixe em branco para remover)" : "Ex: 28"}
                      placeholderTextColor={colors.textSecondary}
                    />
                  )}
                  {campo?.tipo === "selecao" && (
                    <View style={{ gap: 8 }}>
                      {(campo.lista ? campo.lista.map((x) => x.rotulo) : campo.opcoes!).map((o) => (
                        <TouchableOpacity key={o} style={[styles.opcao, escolha === o && styles.opcaoSel]} onPress={() => setEscolha(o)}>
                          <Text style={[styles.opcaoTxt, escolha === o && styles.opcaoTxtSel]}>{o}</Text>
                          {escolha === o && <Feather name="check" size={16} color={colors.primary} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {(campo?.tipo === "intolerancias" || campo?.tipo === "condicoes") && (
                    <View style={{ gap: 10 }}>
                      <Text style={styles.rotulo}>Marque todas que se aplicam. Sem nenhuma marcada, fica "Nenhuma".</Text>
                      <View style={styles.chips}>
                        {(campo.tipo === "condicoes" ? OPCOES_CONDICOES : OPCOES_INTOLERANCIA).map((o) => {
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
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
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
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  return (
    <View style={styles.meta}>
      <Text style={styles.metaValor}>{valor}</Text>
      <Text style={styles.metaRotulo}>{rotulo}</Text>
    </View>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
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
  icone: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.verdeSuave, alignItems: "center", justifyContent: "center" },
  rotulo: { fontSize: 12, color: colors.textSecondary },
  valor: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginTop: 1 },
  metas: { flexDirection: "row", flexWrap: "wrap", paddingVertical: 14, gap: 6 },
  meta: { width: "31%", alignItems: "center", paddingVertical: 8 },
  metaValor: { fontSize: 17, fontWeight: "800", color: colors.primary },
  metaRotulo: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  aparencia: { flexDirection: "row", gap: 8, padding: 8 },
  opcaoTema: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: 14 },
  opcaoTemaAtiva: { backgroundColor: colors.botao },
  opcaoTemaTxt: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  comoCalc: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  comoCalcTxt: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  avisoCalc: { fontSize: 12, lineHeight: 17, color: colors.avisoTexto, backgroundColor: colors.avisoFundo, borderRadius: 10, padding: 10 },
  nota: { fontSize: 11, color: colors.textSecondary, lineHeight: 16, marginTop: -4 },
  sair: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.erroBorda, marginTop: 8 },
  sairTxt: { color: colors.erroTexto, fontWeight: "700", fontSize: 15 },
  versao: { textAlign: "center", fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  folha: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, gap: 14 },
  folhaTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  folhaTitulo: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  input: { height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.surface },
  opcao: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, backgroundColor: colors.surface },
  opcaoSel: { borderColor: colors.primary, backgroundColor: colors.verdeSuave },
  opcaoTxt: { fontSize: 15, color: colors.textPrimary },
  opcaoTxtSel: { color: colors.primary, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipMarcado: { backgroundColor: colors.botao, borderColor: colors.primary },
  chipTxt: { fontSize: 14, color: colors.textPrimary },
  chipTxtMarcado: { color: "#fff", fontWeight: "600" },
  erro: { color: colors.erroTexto, fontSize: 13, lineHeight: 18 },
  botao: { height: 50, borderRadius: 14, backgroundColor: colors.botao, alignItems: "center", justifyContent: "center" },
  botaoTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
