import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import BarraInferior from "../components/BarraInferior";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { formatarDuracao, modoSaude } from "../utils/saude";
import { serie } from "../theme/graficos";
import GraficoColunas from "../components/GraficoColunas";
import Medidor from "../components/Medidor";
import { getProfile } from "../services/api";
import { calcularMetas, calcularMetaAguaMl, PerfilApi } from "../utils/nutricao";
import { carregarHistorico, DiaResumo, PERIODOS, PeriodoHistorico } from "../utils/historico";

const REFEICOES = [
  { chave: "cafe", rotulo: "Café" },
  { chave: "almoco", rotulo: "Almoço" },
  { chave: "lanche", rotulo: "Lanche" },
  { chave: "jantar", rotulo: "Jantar" },
  { chave: "ceia", rotulo: "Ceia" },
];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const media = (valores: number[]) => (valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0);
const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

export default function HistoricoScreen({ navigation, route }: any) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [periodo, setPeriodo] = useState<PeriodoHistorico>(route.params?.periodo ?? "semana");
  const [perfil, setPerfil] = useState<PerfilApi | null>(null);
  // Guarda de qual período são os dias carregados. Sem isso, ao trocar de aba
  // a tela montava o painel com o período NOVO e os dias do período ANTIGO.
  const [carregado, setCarregado] = useState<{ periodo: PeriodoHistorico; dias: DiaResumo[] } | null>(null);
  const dias = carregado?.periodo === periodo ? carregado.dias : null;

  useEffect(() => {
    getProfile().then(setPerfil).catch(() => {});
  }, []);

  const metas = calcularMetas(perfil);
  const metaAgua = calcularMetaAguaMl(perfil);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      carregarHistorico(periodo, metas.calorias, metaAgua, Number(perfil?.peso_kg) || 70).then((d) => ativo && setCarregado({ periodo, dias: d }));
      return () => { ativo = false; };
    }, [periodo, metas.calorias, metaAgua, perfil?.peso_kg]),
  );

  const painel = useMemo(() => {
    if (!dias) return null;
    // Hoje ainda está em andamento (um café da manhã = 300 kcal "no dia"), então
    // as MÉDIAS e a contagem de dias usam só os dias completos. O gráfico mostra
    // tudo, inclusive hoje. Se só existir hoje, as contas usam hoje mesmo.
    const completos = periodo === "dia" ? dias : dias.slice(0, -1);
    const registradosTodos = dias.filter((d) => d.registrado);
    const completosRegistrados = completos.filter((d) => d.registrado);
    const statsSemHoje = periodo !== "dia" && completosRegistrados.length > 0;
    const registrados = statsSemHoje ? completosRegistrados : registradosTodos;
    const baseDias = statsSemHoje ? completos : dias;
    const naMeta = registrados.filter((d) => d.kcal >= metas.calorias * 0.85 && d.kcal <= metas.calorias * 1.1).length;
    const usaExemplo = dias.some((d) => d.exemplo && d.registrado);

    // Gráfico principal
    let rotulos: string[] = [];
    let valores: number[] = [];
    let valoresAgua: number[] = [];
    let valoresGastas: number[] = [];
    let titulo = "";
    let larguraBarra: number | undefined;
    let rotuloACada = 1;
    let referencia: { valor: number; rotulo: string } | undefined = { valor: metas.calorias, rotulo: "meta" };

    if (periodo === "dia") {
      const hoje = dias[dias.length - 1];
      rotulos = REFEICOES.map((r) => r.rotulo);
      valores = REFEICOES.map((r) => hoje.porRefeicao[r.chave] ?? 0);
      valoresAgua = [hoje.aguaMl];
      valoresGastas = [hoje.gastasKcal];
      titulo = "Calorias por refeição, hoje";
      larguraBarra = 22;
      referencia = undefined;
    } else if (periodo === "semana") {
      rotulos = dias.map((d) => DIAS_SEMANA[d.data.getDay()]);
      valores = dias.map((d) => d.kcal);
      valoresAgua = dias.map((d) => d.aguaMl);
      valoresGastas = dias.map((d) => d.gastasKcal);
      titulo = "Calorias por dia";
    } else if (periodo === "mes") {
      rotulos = dias.map((d) => String(d.data.getDate()));
      valores = dias.map((d) => d.kcal);
      valoresAgua = dias.map((d) => d.aguaMl);
      valoresGastas = dias.map((d) => d.gastasKcal);
      titulo = "Calorias por dia";
      larguraBarra = 6;
      rotuloACada = 5;
    } else {
      const porMes = new Map<string, { rotulo: string; kcal: number[]; agua: number[]; gastas: number[] }>();
      // Médias mensais sem o dia de hoje (incompleto), a menos que seja o único do mês.
      const hojeDia = dias[dias.length - 1];
      const hojePorMes = new Map<string, { kcal: number[]; agua: number[]; gastas: number[] }>();
      for (const d of dias) {
        const k = `${d.data.getFullYear()}-${d.data.getMonth()}`;
        if (!porMes.has(k)) porMes.set(k, { rotulo: MESES[d.data.getMonth()], kcal: [], agua: [], gastas: [] });
        const alvo = d === hojeDia
          ? (hojePorMes.get(k) ?? hojePorMes.set(k, { kcal: [], agua: [], gastas: [] }).get(k)!)
          : porMes.get(k)!;
        if (d.registrado) alvo.kcal.push(d.kcal);
        if (d.aguaMl > 0) alvo.agua.push(d.aguaMl);
        if (d.gastasKcal > 0) alvo.gastas.push(d.gastasKcal);
      }
      const meses = [...porMes.entries()].map(([k, m]) => {
        const h = hojePorMes.get(k);
        return {
          rotulo: m.rotulo,
          kcal: m.kcal.length ? m.kcal : h?.kcal ?? [],
          agua: m.agua.length ? m.agua : h?.agua ?? [],
          gastas: m.gastas.length ? m.gastas : h?.gastas ?? [],
        };
      });
      rotulos = meses.map((m) => m.rotulo);
      valores = meses.map((m) => Math.round(media(m.kcal)));
      valoresAgua = meses.map((m) => Math.round(media(m.agua)));
      valoresGastas = meses.map((m) => Math.round(media(m.gastas)));
      titulo = "Média diária por mês";
      larguraBarra = 22;
    }

    // Macros (hoje, ou média dos dias registrados)
    const base = periodo === "dia" ? [dias[dias.length - 1]] : registrados;
    const macros = {
      proteina: media(base.map((d) => d.proteina)),
      carbo: media(base.map((d) => d.carbo)),
      gordura: media(base.map((d) => d.gordura)),
    };

    // Alimentos mais frequentes
    const contagem = new Map<string, { dias: number; gramas: number }>();
    for (const d of registrados) {
      for (const a of d.alimentos) {
        const atual = contagem.get(a.nome) ?? { dias: 0, gramas: 0 };
        contagem.set(a.nome, { dias: atual.dias + 1, gramas: atual.gramas + a.gramas });
      }
    }
    const top = [...contagem].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.dias - a.dias || b.gramas - a.gramas).slice(0, 5);

    const diasComAgua = baseDias.filter((d) => d.aguaMl > 0).length ? baseDias.filter((d) => d.aguaMl > 0) : dias.filter((d) => d.aguaMl > 0);
    const aguaMedia = media(diasComAgua.map((d) => d.aguaMl));
    const aguaNaMeta = diasComAgua.filter((d) => d.aguaMl >= metaAgua).length;

    const diasTreinou = dias.filter((d) => d.treinou).length;
    const diasComGasto = baseDias.filter((d) => d.gastasKcal > 0).length ? baseDias.filter((d) => d.gastasKcal > 0) : dias.filter((d) => d.gastasKcal > 0);
    const gastoMedio = media(diasComGasto.map((d) => d.gastasKcal));
    const treinosLista = dias.flatMap((d) => d.treinos);
    const usaExemploSaude = dias.some((d) => d.treinos.some((t) => t.origem !== "manual") || (d.passos ?? 0) > 0);

    return { statsSemHoje, registradosTodos, totalBase: baseDias.length, diasTreinou, diasComGasto, gastoMedio, valoresGastas, treinosLista, usaExemploSaude, diasComAgua, aguaMedia, aguaNaMeta, valoresAgua, registrados, naMeta, usaExemplo, rotulos, valores, titulo, larguraBarra, rotuloACada, referencia, macros, top };
  }, [dias, periodo, metas.calorias, metaAgua]);

  const hoje = dias?.[dias.length - 1];
  const refeicoesFeitas = hoje ? Object.keys(hoje.porRefeicao).length : 0;

  return (
    <View style={styles.screen}>
      <View style={styles.topo}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar} accessibilityLabel="Voltar">
          <Feather name="arrow-left" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Histórico</Text>
      </View>

      <View style={styles.abas}>
        {PERIODOS.map((p) => (
          <TouchableOpacity
            key={p.chave}
            onPress={() => setPeriodo(p.chave)}
            style={[styles.aba, periodo === p.chave && styles.abaAtiva]}
            accessibilityRole="button"
            accessibilityState={{ selected: periodo === p.chave }}
          >
            <Text style={[styles.abaTxt, periodo === p.chave && styles.abaTxtAtiva]}>{p.nome}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!painel || !hoje ? (
        <View style={styles.carregando}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {(painel.usaExemplo || (painel.usaExemploSaude && modoSaude() === "simulado")) && (
            <View style={styles.exemplo}>
              <Feather name="info" size={14} color={colors.avisoTexto} />
              <Text style={styles.exemploTxt}>Os dias anteriores são dados de exemplo, só para demonstrar o painel.</Text>
            </View>
          )}

          {/* Resumo */}
          <View style={styles.kpis}>
            {periodo === "dia" ? (
              <>
                <Kpi valor={fmt(hoje.kcal)} rotulo="kcal consumidas" />
                <Kpi valor={fmt(Math.max(metas.calorias - hoje.kcal, 0))} rotulo="kcal restantes" />
                <Kpi valor={`${refeicoesFeitas}/${REFEICOES.length}`} rotulo="refeições feitas" />
              </>
            ) : (
              <>
                <Kpi valor={fmt(media(painel.registrados.map((d) => d.kcal)))} rotulo="kcal por dia (média)" />
                <Kpi valor={`${painel.registrados.length}/${painel.totalBase}`} rotulo="dias registrados" />
                <Kpi valor={`${painel.naMeta}`} rotulo="dias na meta" />
              </>
            )}
          </View>

          {painel.registradosTodos.length === 0 && (
            <View style={styles.vazio}>
              <Feather name="clipboard" size={22} color={colors.textSecondary} />
              <Text style={styles.vazioTxt}>
                Nenhuma refeição registrada {periodo === "dia" ? "hoje" : "neste período"}. Toque em uma refeição na tela inicial para registrar.
              </Text>
            </View>
          )}

          {painel.registradosTodos.length > 0 && (
            <>
              <Text style={styles.secao}>{painel.titulo}</Text>
              <View style={styles.card}>
                <GraficoColunas
                  key={periodo}
                  rotulos={painel.rotulos}
                  series={[{ nome: "Consumidas", cor: serie.consumidas, valores: painel.valores }]}
                  unidade="kcal"
                  referencia={painel.referencia}
                  larguraBarra={painel.larguraBarra}
                  rotuloACada={painel.rotuloACada}
                />
                {periodo !== "dia" && (
                  <Text style={styles.nota}>
                    Meta diária: {metas.calorias.toLocaleString("pt-BR")} kcal · "na meta" = entre 85% e 110% dela{painel.statsSemHoje ? " · as médias não incluem hoje, que ainda está em andamento" : ""}
                  </Text>
                )}
              </View>

              <Text style={styles.secao}>{periodo === "dia" ? "Macronutrientes de hoje" : "Macronutrientes (média por dia)"}</Text>
              <View style={[styles.card, { gap: 14 }]}>
                <Medidor avisarExcesso rotulo="Proteína" atual={Math.round(painel.macros.proteina)} meta={metas.proteina} atraso={0} />
                <Medidor avisarExcesso rotulo="Carboidrato" atual={Math.round(painel.macros.carbo)} meta={metas.carboidrato} atraso={80} />
                <Medidor avisarExcesso rotulo="Gordura" atual={Math.round(painel.macros.gordura)} meta={metas.gordura} atraso={160} />
              </View>

              {painel.top.length > 0 && (
                <>
                  <Text style={styles.secao}>O que você mais comeu</Text>
                  <View style={styles.card}>
                    {painel.top.map((a, i) => (
                      <View key={a.nome} style={[styles.linha, i < painel.top.length - 1 && styles.linhaDivisor]}>
                        <Text style={styles.posicao}>{i + 1}</Text>
                        <Text style={styles.linhaNome}>{a.nome}</Text>
                        <Text style={styles.linhaInfo}>
                          {periodo === "dia" ? `${fmt(a.gramas)} g` : `${a.dias} ${a.dias === 1 ? "dia" : "dias"}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {/* Hidratação */}
          <Text style={styles.secao}>{periodo === "dia" ? "Hidratação de hoje" : "Hidratação"}</Text>
          <View style={styles.card}>
            {painel.diasComAgua.length === 0 ? (
              <Text style={styles.vazioTxt}>Nenhuma água registrada {periodo === "dia" ? "hoje" : "neste período"}.</Text>
            ) : periodo === "dia" ? (
              <Medidor rotulo="Água" atual={hoje.aguaMl} meta={metaAgua} unidade="ml" cor={serie.agua} />
            ) : (
              <>
                <GraficoColunas
                  key={`agua-${periodo}`}
                  rotulos={painel.rotulos}
                  series={[{ nome: "Água", cor: serie.agua, valores: painel.valoresAgua }]}
                  unidade="ml"
                  referencia={{ valor: metaAgua, rotulo: "meta" }}
                  larguraBarra={painel.larguraBarra}
                  rotuloACada={painel.rotuloACada}
                />
                <Text style={styles.nota}>
                  Média de {(painel.aguaMedia / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L por dia · meta de{" "}
                  {(metaAgua / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L batida em {painel.aguaNaMeta}{" "}
                  {painel.aguaNaMeta === 1 ? "dia" : "dias"}
                </Text>
              </>
            )}
          </View>

          {/* Atividade física */}
          <Text style={styles.secao}>{periodo === "dia" ? "Atividade de hoje" : "Atividade física"}</Text>
          <View style={styles.card}>
            {painel.diasComGasto.length === 0 && painel.treinosLista.length === 0 ? (
              <View style={{ gap: 10, alignItems: "center" }}>
                <Text style={styles.vazioTxt}>Sem atividade registrada {periodo === "dia" ? "hoje" : "neste período"}.</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Smartwatch")} accessibilityRole="button">
                  <Text style={styles.link}>Conectar smartwatch</Text>
                </TouchableOpacity>
              </View>
            ) : periodo === "dia" ? (
              <View style={{ gap: 10 }}>
                <View style={styles.dupla}>
                  <View style={styles.duplaItem}><Text style={styles.kpiValor}>{fmt(hoje.kcal)}</Text><Text style={styles.kpiRotulo}>kcal consumidas</Text></View>
                  <View style={styles.duplaItem}><Text style={styles.kpiValor}>{fmt(hoje.gastasKcal)}</Text><Text style={styles.kpiRotulo}>kcal gastas</Text></View>
                  {hoje.passos !== undefined && <View style={styles.duplaItem}><Text style={styles.kpiValor}>{fmt(hoje.passos)}</Text><Text style={styles.kpiRotulo}>passos</Text></View>}
                </View>
                {hoje.treinos.map((t) => (
                  <Text key={t.id} style={styles.linhaInfo}>• {t.tipo} · {formatarDuracao(t.minutos)} · ≈ {t.kcal} kcal</Text>
                ))}
              </View>
            ) : (
              <>
                <GraficoColunas
                  key={`energia-${periodo}`}
                  rotulos={painel.rotulos}
                  series={[
                    { nome: "Consumidas", cor: serie.consumidas, valores: painel.valores },
                    { nome: "Gastas", cor: serie.gastas, valores: painel.valoresGastas },
                  ]}
                  unidade="kcal"
                  larguraBarra={periodo === "mes" ? 4 : periodo === "semestre" ? 16 : undefined}
                  rotuloACada={painel.rotuloACada}
                />
                <Text style={styles.nota}>
                  Treinou em {painel.diasTreinou} de {dias!.length} dias · média de {fmt(painel.gastoMedio)} kcal gastas por dia
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      )}
      <BarraInferior ativa="Historico" />
    </View>
  );
}

function Kpi({ valor, rotulo }: { valor: string; rotulo: string }) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValor}>{valor}</Text>
      <Text style={styles.kpiRotulo}>{rotulo}</Text>
    </View>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topo: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
  voltar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  titulo: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  abas: { flexDirection: "row", marginHorizontal: 20, padding: 4, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  aba: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  abaAtiva: { backgroundColor: colors.botao },
  abaTxt: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  abaTxtAtiva: { color: "#fff" },
  carregando: { flex: 1, alignItems: "center", justifyContent: "center" },
  conteudo: { padding: 20, paddingBottom: 60, gap: 12 },
  exemplo: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: colors.avisoFundo, borderRadius: 10, padding: 10 },
  exemploTxt: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.avisoTexto },
  kpis: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 },
  kpiValor: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  kpiRotulo: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  secao: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginTop: 8 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  link: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  dupla: { flexDirection: "row", gap: 8 },
  duplaItem: { flex: 1 },
  nota: { fontSize: 11, color: colors.textSecondary, marginTop: 12 },
  vazio: { alignItems: "center", gap: 10, padding: 28 },
  vazioTxt: { textAlign: "center", color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  linha: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  linhaDivisor: { borderBottomWidth: 1, borderBottomColor: colors.border },
  posicao: { width: 20, fontSize: 13, fontWeight: "800", color: colors.textSecondary },
  linhaNome: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  linhaInfo: { fontSize: 13, color: colors.textSecondary },
});
