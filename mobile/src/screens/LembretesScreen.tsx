import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import { sombra } from "../theme/colors";
import { useFeedback } from "../components/Feedback";
import {
  carregarPreferencias, enviarTeste, formatarHora, lembretesDisponiveis, pedirPermissao, PADRAO, salvarPreferencias, type Preferencias,
} from "../utils/lembretes";

const INTERVALOS = [1, 2, 3, 4];

export default function LembretesScreen({ navigation }: any) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();
  const [prefs, setPrefs] = useState<Preferencias>(PADRAO);
  const disponivel = lembretesDisponiveis();

  useFocusEffect(useCallback(() => { carregarPreferencias().then(setPrefs); }, []));

  /** Liga ou desliga um tipo. Ao ligar o primeiro, pede a permissão do sistema. */
  async function alternar(tipo: keyof Preferencias, ligar: boolean) {
    if (ligar && !(await pedirPermissao())) return;
    const novo = { ...prefs, [tipo]: { ...prefs[tipo], ativo: ligar } } as Preferencias;
    setPrefs(novo);
    salvarPreferencias(novo);
  }

  function mudar<K extends keyof Preferencias>(tipo: K, campos: Partial<Preferencias[K]>) {
    const novo = { ...prefs, [tipo]: { ...prefs[tipo], ...campos } } as Preferencias;
    setPrefs(novo);
    salvarPreferencias(novo);
  }

  const passo = (min: number, delta: number) => Math.min(Math.max(min + delta, 0), 23 * 60 + 30);

  async function testar() {
    const r = await enviarTeste();
    if (r.ok) feedback.sucesso("Teste agendado!", r.detalhe, { duracao: 3200 });
    else feedback.erro("Não foi possível", r.detalhe);
  }

  return (
    <View style={styles.tela}>
      <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: 36 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topo}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar} accessibilityLabel="Voltar">
            <Feather name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo}>Lembretes</Text>
            <Text style={styles.sub}>Avisos no seu celular para você não esquecer</Text>
          </View>
        </View>

        {!disponivel && (
          <View style={styles.aviso}>
            <Feather name="alert-circle" size={16} color="#B4600F" />
            <Text style={styles.avisoTxt}>Esta versão do app ainda não tem notificações. Instale a versão mais recente para usar os lembretes.</Text>
          </View>
        )}

        <View style={[styles.card, sombra, !disponivel && { opacity: 0.5 }]} pointerEvents={disponivel ? "auto" : "none"}>
          <Linha icone="droplet" cor="#35A7E8" titulo="Beber água" sub="Avisa de tempos em tempos e para quando você bate a meta" ligado={prefs.agua.ativo} aoAlternar={(v: boolean) => alternar("agua", v)} styles={styles} colors={colors} />
          {prefs.agua.ativo && (
            <View style={styles.detalhe}>
              <Text style={styles.rotulo}>A cada</Text>
              <View style={styles.chips}>
                {INTERVALOS.map((h) => (
                  <TouchableOpacity key={h} style={[styles.chip, prefs.agua.intervaloH === h && styles.chipAtivo]} onPress={() => mudar("agua", { intervaloH: h })}>
                    <Text style={[styles.chipTxt, prefs.agua.intervaloH === h && styles.chipTxtAtivo]}>{h} h</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Relogio rotulo="Das" minutos={prefs.agua.inicio} aoMudar={(d) => mudar("agua", { inicio: Math.min(passo(prefs.agua.inicio, d), prefs.agua.fim - 60) })} styles={styles} colors={colors} />
              <Relogio rotulo="Até" minutos={prefs.agua.fim} aoMudar={(d) => mudar("agua", { fim: Math.max(passo(prefs.agua.fim, d), prefs.agua.inicio + 60) })} styles={styles} colors={colors} />
            </View>
          )}

          <View style={styles.sep} />
          <Linha icone="coffee" cor="#F2A93B" titulo="Hora das refeições" sub="Nos horários do seu plano; some se você já registrou" ligado={prefs.refeicoes.ativo} aoAlternar={(v: boolean) => alternar("refeicoes", v)} styles={styles} colors={colors} />

          <View style={styles.sep} />
          <Linha icone="zap" cor="#7E6BC4" titulo="Treino" sub="Um aviso por dia, só se você ainda não treinou" ligado={prefs.treino.ativo} aoAlternar={(v: boolean) => alternar("treino", v)} styles={styles} colors={colors} />
          {prefs.treino.ativo && (
            <View style={styles.detalhe}>
              <Relogio rotulo="Às" minutos={prefs.treino.hora} aoMudar={(d) => mudar("treino", { hora: passo(prefs.treino.hora, d) })} styles={styles} colors={colors} />
            </View>
          )}

          <View style={styles.sep} />
          <Linha icone="activity" cor="#E0674F" titulo="Pesar" sub="Toda segunda-feira, às 8h" ligado={prefs.pesar.ativo} aoAlternar={(v: boolean) => alternar("pesar", v)} styles={styles} colors={colors} />

          <View style={styles.sep} />
          <Linha icone="award" cor={colors.primary} titulo="Parabéns" sub="Meta de água batida e sequência de dias registrando" ligado={prefs.parabens.ativo} aoAlternar={(v: boolean) => alternar("parabens", v)} styles={styles} colors={colors} />
        </View>

        <TouchableOpacity style={[styles.teste, !disponivel && { opacity: 0.5 }]} onPress={testar} disabled={!disponivel} activeOpacity={0.85}>
          <Feather name="bell" size={16} color={colors.primary} />
          <Text style={styles.testeTxt}>Enviar uma notificação de teste</Text>
        </TouchableOpacity>
        <Text style={styles.nota}>Os lembretes são agendados no seu celular, sem internet. Abra o app de vez em quando para eles se manterem atualizados.</Text>
      </ScrollView>
    </View>
  );
}

function Linha({ icone, cor, titulo, sub, ligado, aoAlternar, styles, colors }: any) {
  return (
    <View style={styles.linha}>
      <View style={[styles.icone, { backgroundColor: cor + "22" }]}><Feather name={icone} size={17} color={cor} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linhaTitulo}>{titulo}</Text>
        <Text style={styles.linhaSub}>{sub}</Text>
      </View>
      <Switch value={ligado} onValueChange={aoAlternar} trackColor={{ false: colors.border, true: colors.primaryLight }} thumbColor="#fff" />
    </View>
  );
}

function Relogio({ rotulo, minutos, aoMudar, styles, colors }: { rotulo: string; minutos: number; aoMudar: (delta: number) => void; styles: any; colors: Cores }) {
  return (
    <View style={styles.relogio}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity hitSlop={10} onPress={() => aoMudar(-30)} accessibilityLabel="30 minutos antes"><Feather name="minus" size={16} color={colors.primary} /></TouchableOpacity>
        <Text style={styles.hora}>{formatarHora(minutos)}</Text>
        <TouchableOpacity hitSlop={10} onPress={() => aoMudar(30)} accessibilityLabel="30 minutos depois"><Feather name="plus" size={16} color={colors.primary} /></TouchableOpacity>
      </View>
    </View>
  );
}

const criarStyles = (colors: Cores) =>
  StyleSheet.create({
    tela: { flex: 1, backgroundColor: colors.background },
    conteudo: { padding: 20, paddingTop: 52, gap: 14 },
    topo: { flexDirection: "row", alignItems: "center", gap: 14 },
    voltar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    titulo: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
    sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    aviso: { flexDirection: "row", gap: 10, backgroundColor: "#FFF1DC", borderRadius: 14, padding: 12, alignItems: "flex-start" },
    avisoTxt: { flex: 1, fontSize: 12, lineHeight: 17, color: "#7A4308" },
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16 },
    linha: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
    icone: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    linhaTitulo: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
    linhaSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 15 },
    sep: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
    detalhe: { marginTop: 12, marginLeft: 50, gap: 10, backgroundColor: colors.background, borderRadius: 14, padding: 12 },
    rotulo: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
    chips: { flexDirection: "row", gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipTxt: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
    chipTxtAtivo: { color: "#fff" },
    relogio: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    stepper: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.verdeSuave, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
    hora: { fontSize: 14, fontWeight: "800", color: colors.textPrimary, minWidth: 48, textAlign: "center" },
    teste: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 14, backgroundColor: colors.verdeSuave },
    testeTxt: { fontSize: 14, fontWeight: "800", color: colors.primary },
    nota: { fontSize: 11, color: colors.textSecondary, lineHeight: 16, textAlign: "center" },
  });
