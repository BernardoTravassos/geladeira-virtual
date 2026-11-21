import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import { sombra } from "../theme/colors";
import React, { useEffect, useMemo, useState } from "react";
import { useFeedback } from "../components/Feedback";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, LayoutAnimation, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

import { serie } from "../theme/graficos";
import { diarioDoPaciente } from "../services/nutri";
import { detalheDoRegistro, montarDiario, type DiarioReal, type RegistroNutri } from "../utils/diarioPaciente";
import { calcularMetaAguaMl, calcularMetas } from "../utils/nutricao";
import GraficoColunas from "../components/GraficoColunas";
import Medidor from "../components/Medidor";
import AnelProgresso from "../components/AnelProgresso";
import PlanoEditorNutri from "../components/PlanoEditorNutri";
import BarraTeclado, { ID_BARRA_TECLADO } from "../components/BarraTeclado";

type Aba = "resumo" | "refeicoes" | "saude" | "plano";
const ABAS: { chave: Aba; rotulo: string; icone: keyof typeof Feather.glyphMap }[] = [
  { chave: "resumo", rotulo: "Resumo", icone: "pie-chart" },
  { chave: "refeicoes", rotulo: "Refeições", icone: "coffee" },
  { chave: "saude", rotulo: "Saúde", icone: "heart" },
  { chave: "plano", rotulo: "Plano", icone: "clipboard" },
];

const ORIGEM: Record<RegistroNutri["origem"], { texto: string; icone: keyof typeof Feather.glyphMap }> = {
  foto: { texto: "Foto do prato", icone: "camera" },
  manual: { texto: "Marcou os alimentos", icone: "edit-3" },
};


export default function NutriPacienteScreen({ route, navigation }: any) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const feedback = useFeedback();
  const insets = useSafeAreaInsets();
  const item = route.params.item;
  const p = item.paciente!;
  const perfil = p.perfil;
  const nomePaciente = p.nome || p.email;
  const primeiroNome = nomePaciente.split(" ")[0];

  const [diario, setDiario] = useState<DiarioReal | null>(null);
  const [erroDiario, setErroDiario] = useState("");
  useEffect(() => {
    let vivo = true;
    diarioDoPaciente(p.id)
      .then((linhas) => { if (vivo) setDiario(montarDiario(linhas)); })
      .catch((e: any) => { if (vivo) setErroDiario(e?.response?.status === 404 ? "Este paciente encerrou o acompanhamento." : "Não foi possível carregar o diário. Volte e tente de novo."); });
    return () => { vivo = false; };
  }, [p.id]);

  const [aba, setAba] = useState<Aba>("resumo");
  const [editandoMetas, setEditandoMetas] = useState(false);
  const metas = useMemo(() => calcularMetas(perfil), [perfil]);
  const aguaMetaMl = useMemo(() => calcularMetaAguaMl(perfil), [perfil]);
  const [metaCalorias, setMetaCalorias] = useState(String(metas.calorias));

  // Tudo abaixo é calculado do que a pessoa registrou, com as mesmas contas do app dela.
  const consumo = useMemo(() => {
    const todas = (diario?.refeicoes ?? []).map(detalheDoRegistro);
    const soma = todas.reduce((t, d) => ({ kcal: t.kcal + d.total.kcal, proteina: t.proteina + d.total.proteina, carbo: t.carbo + d.total.carbo, gordura: t.gordura + d.total.gordura }), { kcal: 0, proteina: 0, carbo: 0, gordura: 0 });
    // Vitaminas e minerais: soma o que cada refeição trouxe.
    const micros = new Map<string, (typeof todas)[number]["micros"][number]>();
    for (const d of todas) for (const m of d.micros) { const a = micros.get(m.chave); micros.set(m.chave, a ? { ...a, valor: a.valor + m.valor, vd: a.vd + m.vd } : { ...m }); }
    return { total: soma, micros: [...micros.values()].sort((a, b) => b.vd - a.vd) };
  }, [diario]);
  const consumidas = Math.round(consumo.total.kcal);
  const meta = Number(metaCalorias) || metas.calorias;
  const macros = [
    { nome: "Proteína", atual: Math.round(consumo.total.proteina), meta: metas.proteina },
    { nome: "Carboidrato", atual: Math.round(consumo.total.carbo), meta: metas.carboidrato },
    { nome: "Gordura", atual: Math.round(consumo.total.gordura), meta: metas.gordura },
  ];
  const peso = Number(p.pesoKg) || 0;
  const semRegistro = !diario || diario.refeicoes.length === 0;

  // Pontos de atenção que o nutricionista quer ver logo.
  const alertas: { icone: keyof typeof Feather.glyphMap; texto: string; tom: "ok" | "atencao" }[] = [];
  if (diario) {
    if (semRegistro) alertas.push({ icone: "alert-circle", texto: `${primeiroNome} ainda não registrou nenhuma refeição hoje.`, tom: "atencao" });
    else {
      const prot = macros[0];
      if (prot.atual < prot.meta * 0.5 && diario.refeicoes.length >= 2) alertas.push({ icone: "trending-down", texto: `Proteína em ${Math.round((prot.atual / prot.meta) * 100)}% da meta — abaixo do esperado para o horário.`, tom: "atencao" });
      else alertas.push({ icone: "check-circle", texto: "Calorias e macros dentro do ritmo esperado.", tom: "ok" });
    }
    if (diario.aguaMl < aguaMetaMl * 0.5) alertas.push({ icone: "droplet", texto: `Água em ${Math.round((diario.aguaMl / aguaMetaMl) * 100)}% da meta.`, tom: "atencao" });
    const comFoto = diario.refeicoes.filter((r) => r.origem === "foto").length;
    if (comFoto > 0) alertas.push({ icone: "camera", texto: `${comFoto} ${comFoto === 1 ? "refeição registrada" : "refeições registradas"} por foto do prato (valores estimados por IA).`, tom: "ok" });
  }

  function salvarMetas() {
    setEditandoMetas(false);
    feedback.sucesso("Meta atualizada!", `A meta de ${primeiroNome} passou para ${metaCalorias} kcal. (por enquanto só vale nesta tela: ainda não é enviada ao paciente)`, { duracao: 2600 });
  }

  function trocarAba(a: Aba) {
    LayoutAnimation.configureNext(LayoutAnimation.create(180, "easeInEaseOut", "opacity"));
    setAba(a);
  }

  if (!diario) {
    return (
      <View style={[styles.tela, { padding: 24, paddingTop: 56, gap: 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        {erroDiario ? <Text style={styles.vazioTxt}>{erroDiario}</Text> : <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.conteudo, { paddingBottom: 36 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickyHeaderIndices={[1]}
      >
        {/* ── Cabeçalho do paciente ─────────────────────────────────────── */}
        <View style={[styles.hero, sombra]}>
          <View style={styles.heroTopo}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.voltar}>
              <Feather name="arrow-left" size={19} color="#fff" />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{nomePaciente.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nome}>{nomePaciente}</Text>
              <Text style={styles.sub}>{[p.idade ? `${p.idade} anos` : null, p.objetivo].filter(Boolean).join(" · ")}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.reuniaoBotao} activeOpacity={0.85} accessibilityRole="button" onPress={() => navigation.navigate("Reuniao", { vinculoId: item.vinculoId, nome: "Nutricionista" })}>
            <Feather name="video" size={16} color={colors.primary} />
            <Text style={styles.reuniaoBotaoTxt}>Iniciar reunião com {primeiroNome}</Text>
          </TouchableOpacity>
          <View style={styles.pilulas}>
            <Pilula icone="target" valor={diario ? `${diario.adesao}%` : "—"} rotulo="adesão (7 dias)" styles={styles} />
            <Pilula icone="activity" valor={peso ? `${peso.toFixed(1)} kg` : "—"} rotulo="peso no perfil" styles={styles} />
            <Pilula icone="clock" valor={diario?.ultimoRegistro?.replace("hoje, ", "") ?? "—"} rotulo="último registro" styles={styles} />
          </View>
        </View>

        {/* ── Abas (fixas ao rolar) ─────────────────────────────────────── */}
        <View style={styles.abasFundo}>
          <View style={styles.abas}>
            {ABAS.map((a) => {
              const ativa = aba === a.chave;
              return (
                <TouchableOpacity key={a.chave} style={[styles.aba, ativa && styles.abaAtiva]} onPress={() => trocarAba(a.chave)} activeOpacity={0.8} accessibilityRole="tab" accessibilityState={{ selected: ativa }}>
                  <Feather name={a.icone} size={14} color={ativa ? "#fff" : colors.textSecondary} />
                  <Text style={[styles.abaTxt, ativa && styles.abaTxtAtiva]}>{a.rotulo}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {aba === "resumo" && (
          <View style={styles.bloco}>
            <View style={[styles.card, sombra]}>
              <Text style={styles.rotuloSecao}>Hoje</Text>
              <View style={styles.anelLinha}>
                <AnelProgresso tamanho={132} espessura={13} progresso={meta > 0 ? consumidas / meta : 0} cor={consumidas > meta ? "#E0674F" : serie.consumidas} trilha={colors.border}>
                  <Text style={styles.anelValor}>{consumidas.toLocaleString("pt-BR")}</Text>
                  <Text style={styles.anelUn}>de {meta.toLocaleString("pt-BR")} kcal</Text>
                </AnelProgresso>
                <View style={{ flex: 1, gap: 10 }}>
                  {macros.map((m, i) => (
                    <Medidor key={m.nome} avisarExcesso rotulo={m.nome} atual={m.atual} meta={m.meta} unidade="g" atraso={100 + i * 90} />
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.alertas}>
              {alertas.map((a, i) => (
                <View key={i} style={[styles.alerta, a.tom === "atencao" ? styles.alertaAtencao : styles.alertaOk]}>
                  <Feather name={a.icone} size={15} color={a.tom === "atencao" ? "#B4600F" : colors.primary} />
                  <Text style={[styles.alertaTxt, a.tom === "atencao" && { color: "#7A4308" }]}>{a.texto}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.card, sombra]}>
              <View style={styles.cardTopo}>
                <View style={styles.tituloIcone}>
                  <Feather name="droplet" size={14} color={serie.agua} />
                  <Text style={styles.rotuloSecao}>Água</Text>
                </View>
                <Text style={styles.cardTopoValor}>
                  {(diario.aguaMl / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L <Text style={styles.cardTopoUn}>de {(aguaMetaMl / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L</Text>
                </Text>
              </View>
              <Medidor rotulo="Hidratação de hoje" atual={diario.aguaMl} meta={aguaMetaMl} unidade="ml" cor={serie.agua} atraso={80} />
              {diario.goles.length > 0 ? (
                <View style={styles.goles}>
                  {diario.goles.map((g, i) => (
                    <View key={i} style={styles.gole}>
                      <Text style={styles.goleMl}>+{g} ml</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.vazioTxt}>Nenhum gole registrado hoje.</Text>
              )}
              <Text style={styles.rotuloMini}>Últimos 7 dias</Text>
              <GraficoColunas
                rotulos={diario.rotulosSemana}
                unidade="ml"
                series={[{ nome: "Água", cor: serie.agua, valores: diario.aguaSemana }]}
                referencia={{ valor: aguaMetaMl, rotulo: `meta ${(aguaMetaMl / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L` }}
              />
            </View>

            <View style={[styles.card, sombra]}>
              <Text style={styles.rotuloSecao}>Calorias registradas · últimos 7 dias</Text>
              <GraficoColunas
                rotulos={diario.rotulosSemana}
                unidade="kcal"
                series={[{ nome: "Consumidas", cor: serie.consumidas, valores: diario.kcalSemana }]}
                referencia={{ valor: meta, rotulo: `meta ${meta.toLocaleString("pt-BR")}` }}
              />
            </View>
          </View>
        )}

        {aba === "refeicoes" && (
          <View style={styles.bloco}>
            {diario.refeicoes.map((r) => {
              const det = detalheDoRegistro(r);
              const o = ORIGEM[r.origem];
              return (
                <View key={r.chave} style={[styles.card, sombra]}>
                  <View style={styles.refTopo}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.refNome}>{r.nome}{!!r.horario && <Text style={styles.refHora}> · {r.horario}</Text>}</Text>
                      <View style={[styles.origem, r.origem === "foto" && styles.origemFoto]}>
                        <Feather name={o.icone} size={11} color={r.origem === "foto" ? "#B4600F" : colors.primary} />
                        <Text style={[styles.origemTxt, r.origem === "foto" && { color: "#B4600F" }]}>{o.texto}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.refKcal}>{Math.round(det.total.kcal)} <Text style={styles.refKcalUn}>kcal</Text></Text>
                    </View>
                  </View>

                  <View style={styles.macrosMini}>
                    <MacroMini rotulo="Proteína" valor={det.total.proteina} cor="#E0674F" styles={styles} />
                    <MacroMini rotulo="Carbo" valor={det.total.carbo} cor="#F2A93B" styles={styles} />
                    <MacroMini rotulo="Gordura" valor={det.total.gordura} cor="#5FA8D3" styles={styles} />
                  </View>

                  {det.itens.map((d, i) => (
                    <View key={`${d.alimento.id}-${i}`} style={[styles.itemLinha, i < det.itens.length - 1 && styles.divisor]}>
                      <Text style={styles.emoji}>{d.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemNome} numberOfLines={1}>{d.alimento.nome}</Text>
                        <Text style={styles.itemInfo}>{d.gramas} g · P {Math.round(d.macros.proteina)} · C {Math.round(d.macros.carbo)} · G {Math.round(d.macros.gordura)}</Text>
                      </View>
                      <Text style={styles.itemKcal}>{Math.round(d.macros.kcal)} kcal</Text>
                    </View>
                  ))}

                </View>
              );
            })}

            {diario.pendentes.length > 0 && (
              <View style={[styles.card, styles.pendentes]}>
                <Text style={styles.rotuloSecao}>{semRegistro ? "Nenhuma refeição registrada" : "Ainda não registrou"}</Text>
                <View style={styles.chips}>
                  {diario.pendentes.map((n) => (
                    <View key={n} style={styles.chip}><Feather name="clock" size={11} color={colors.textSecondary} /><Text style={styles.chipTxt}>{n}</Text></View>
                  ))}
                </View>
              </View>
            )}

            {!semRegistro && (
              <View style={[styles.card, sombra]}>
                <View style={styles.tituloIcone}>
                  <Feather name="zap" size={14} color={colors.primary} />
                  <Text style={styles.rotuloSecao}>Vitaminas e minerais consumidos hoje</Text>
                </View>
                {consumo.micros.slice(0, 8).map((m) => (
                  <View key={m.chave} style={styles.microLinha}>
                    <Text style={styles.microNome}>{m.rotulo}</Text>
                    <View style={styles.microTrilho}>
                      <View style={[styles.microBarra, { width: `${Math.min(m.vd, 100)}%`, backgroundColor: m.tipo === "vitamina" ? "#F2A93B" : colors.primaryLight }]} />
                    </View>
                    <Text style={styles.microPct}>{m.vd}%</Text>
                  </View>
                ))}
                <Text style={styles.nota}>% do valor diário (Anvisa). Considera só alimentos com valores de tabela (TACO/USDA); pratos estimados ficam de fora.</Text>
              </View>
            )}
          </View>
        )}

        {aba === "saude" && (
          <View style={styles.bloco}>
            <View style={[styles.card, sombra]}>
              <View style={styles.tituloIcone}>
                <Feather name="watch" size={14} color={colors.textSecondary} />
                <Text style={styles.rotuloSecao}>Smartwatch</Text>
              </View>
              <Text style={styles.vazioTxt}>Passos, batimentos e sono ainda não são compartilhados com o nutricionista. Os treinos que {primeiroNome} registra aparecem abaixo.</Text>
            </View>

            <Text style={styles.secao}>Treinos de hoje</Text>
            <View style={[styles.card, sombra]}>
              {diario.treinos.length === 0 ? (
                <View style={styles.vazio}>
                  <Feather name="moon" size={18} color={colors.textSecondary} />
                  <Text style={styles.vazioTxt}>Nenhum treino registrado hoje</Text>
                </View>
              ) : (
                diario.treinos.map((t, i) => (
                  <View key={`${t.nome}-${i}`} style={[styles.itemLinha, i < diario.treinos.length - 1 && styles.divisor]}>
                    <View style={styles.iconeRedondo}><Feather name="zap" size={14} color={colors.primary} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemNome}>{t.nome}</Text>
                      <Text style={styles.itemInfo}>{t.minutos} min</Text>
                    </View>
                    <Text style={styles.itemKcal}>{t.kcal} kcal</Text>
                  </View>
                ))
              )}
            </View>

            <View style={[styles.card, styles.pesoCard, sombra]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rotuloSecao}>Peso</Text>
                <Text style={styles.pesoValor}>{peso ? `${peso.toFixed(1)} kg` : "—"}</Text>
              </View>
            </View>
          </View>
        )}

        {aba === "plano" && (
          <View style={styles.bloco}>
            <PlanoEditorNutri pacienteId={p.id} pacienteNome={nomePaciente} aoSalvar={(m) => feedback.sucesso(m, undefined, { duracao: 1100 })} />

            <Text style={styles.secao}>Metas</Text>
            <View style={[styles.card, sombra]}>
              {editandoMetas ? (
                <>
                  <Text style={styles.rotuloCampo}>Meta diária de calorias</Text>
                  <TextInput style={styles.campo} keyboardType="number-pad" inputAccessoryViewID={ID_BARRA_TECLADO} value={metaCalorias} onChangeText={(t) => setMetaCalorias(t.replace(/\D/g, ""))} maxLength={5} />
                  <Text style={styles.ajuda}>Substitui o cálculo automático do app, que é uma estimativa pela fórmula de Mifflin-St Jeor.</Text>
                  <View style={styles.acoes}>
                    <TouchableOpacity style={[styles.botao, styles.botaoSec]} onPress={() => setEditandoMetas(false)}><Text style={styles.botaoSecTxt}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.botao, styles.botaoPri]} onPress={salvarMetas}><Text style={styles.botaoPriTxt}>Salvar</Text></TouchableOpacity>
                  </View>
                </>
              ) : (
                <TouchableOpacity style={styles.ajustar} onPress={() => setEditandoMetas(true)}>
                  <Feather name="sliders" size={17} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemNome}>Ajustar metas</Text>
                    <Text style={styles.itemInfo}>Meta atual: {meta.toLocaleString("pt-BR")} kcal · calculada pela fórmula do app com o perfil do paciente</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
      <BarraTeclado />
    </KeyboardAvoidingView>
  );
}

function Pilula({ icone, valor, rotulo, styles }: { icone: keyof typeof Feather.glyphMap; valor: string; rotulo: string; styles: any }) {
  return (
    <View style={styles.pilula}>
      <Feather name={icone} size={13} color="#fff" />
      <View>
        <Text style={styles.pilulaValor}>{valor}</Text>
        <Text style={styles.pilulaRotulo}>{rotulo}</Text>
      </View>
    </View>
  );
}

function MacroMini({ rotulo, valor, cor, styles }: { rotulo: string; valor: number; cor: string; styles: any }) {
  return (
    <View style={styles.macroMini}>
      <View style={[styles.macroPonto, { backgroundColor: cor }]} />
      <Text style={styles.macroMiniTxt}>{rotulo} <Text style={styles.macroMiniNum}>{Math.round(valor)} g</Text></Text>
    </View>
  );
}

function ResumoSemana({ valor, rotulo, styles }: { valor: string; rotulo: string; styles: any }) {
  return (
    <View style={styles.resumoItem}>
      <Text style={styles.resumoValor}>{valor}</Text>
      <Text style={styles.resumoRotulo}>{rotulo}</Text>
    </View>
  );
}

function Indicador({ icone, valor, rotulo, styles, colors }: { icone: any; valor: string; rotulo: string; styles: any; colors: Cores }) {
  return (
    <View style={styles.indicador}>
      <Feather name={icone} size={15} color={colors.primary} />
      <Text style={styles.indicadorValor}>{valor}</Text>
      <Text style={styles.indicadorRotulo}>{rotulo}</Text>
    </View>
  );
}

const criarStyles = (colors: Cores) =>
  StyleSheet.create({
    tela: { flex: 1, backgroundColor: colors.background },
    conteudo: { paddingTop: 0 },
    hero: { backgroundColor: colors.primary, paddingTop: 52, paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 18 },
    heroTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
    reuniaoBotao: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 11, marginTop: 14 },
  reuniaoBotaoTxt: { fontSize: 14, fontWeight: "800", color: colors.primary },
  voltar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
    avatarTxt: { fontSize: 20, fontWeight: "800", color: colors.primary },
    nome: { fontSize: 19, fontWeight: "800", color: "#fff" },
    sub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
    pilulas: { flexDirection: "row", gap: 8 },
    pilula: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, paddingVertical: 9, paddingHorizontal: 10 },
    pilulaValor: { fontSize: 13, fontWeight: "800", color: "#fff" },
    pilulaRotulo: { fontSize: 9, color: "rgba(255,255,255,0.75)", marginTop: 1 },

    abasFundo: { backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
    abas: { flexDirection: "row", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 4, gap: 2 },
    aba: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, height: 38, borderRadius: 12 },
    abaAtiva: { backgroundColor: colors.primary },
    abaTxt: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
    abaTxtAtiva: { color: "#fff" },

    bloco: { paddingHorizontal: 20, gap: 12 },
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16, gap: 12 },
    rotuloSecao: { fontSize: 11, color: colors.textSecondary, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
    rotuloMini: { fontSize: 11, color: colors.textSecondary, fontWeight: "700", marginTop: 4 },
    secao: { fontSize: 15, fontWeight: "800", color: colors.textPrimary, marginTop: 6 },
    tituloIcone: { flexDirection: "row", alignItems: "center", gap: 6 },

    anelLinha: { flexDirection: "row", alignItems: "center", gap: 16 },
    anelValor: { fontSize: 26, fontWeight: "800", color: colors.textPrimary },
    anelUn: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
    saldo: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.background, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
    saldoTxt: { fontSize: 12, color: colors.textSecondary },
    saldoNum: { fontWeight: "800", color: colors.textPrimary },

    alertas: { gap: 8 },
    alerta: { flexDirection: "row", alignItems: "flex-start", gap: 9, borderRadius: 14, padding: 12 },
    alertaOk: { backgroundColor: colors.verdeSuave },
    alertaAtencao: { backgroundColor: "#FFF1DC" },
    alertaTxt: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.textPrimary },

    cardTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    cardTopoValor: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
    cardTopoUn: { fontSize: 11, fontWeight: "500", color: colors.textSecondary },
    goles: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    gole: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.aguaChip, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
    goleHora: { fontSize: 11, color: colors.textSecondary },
    goleMl: { fontSize: 11, fontWeight: "800", color: "#1C86C6" },

    refTopo: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    refNome: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
    refHora: { fontSize: 12, fontWeight: "500", color: colors.textSecondary },
    refKcal: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
    refKcalUn: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
    delta: { fontSize: 11, fontWeight: "700", marginTop: 2 },
    origem: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: colors.verdeSuave, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
    origemFoto: { backgroundColor: "#FFF1DC" },
    origemTxt: { fontSize: 10, fontWeight: "800", color: colors.primary },
    macrosMini: { flexDirection: "row", gap: 14 },
    macroMini: { flexDirection: "row", alignItems: "center", gap: 5 },
    macroPonto: { width: 8, height: 8, borderRadius: 4 },
    macroMiniTxt: { fontSize: 11, color: colors.textSecondary },
    macroMiniNum: { fontWeight: "800", color: colors.textPrimary },
    itemLinha: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
    divisor: { borderBottomWidth: 1, borderBottomColor: colors.border },
    emoji: { fontSize: 24, width: 32, textAlign: "center" },
    itemNome: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
    itemInfo: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    itemKcal: { fontSize: 12, fontWeight: "800", color: colors.textPrimary },
    indicada: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.background, borderRadius: 10, padding: 9 },
    indicadaTxt: { flex: 1, fontSize: 11, color: colors.textSecondary, lineHeight: 15 },
    pendentes: { backgroundColor: colors.background, borderStyle: "dashed" },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    chip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    chipTxt: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    microLinha: { flexDirection: "row", alignItems: "center", gap: 10 },
    microNome: { width: 92, fontSize: 12, color: colors.textPrimary },
    microTrilho: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" },
    microBarra: { height: "100%", borderRadius: 4 },
    microPct: { width: 40, textAlign: "right", fontSize: 12, fontWeight: "800", color: colors.textPrimary },
    nota: { fontSize: 10, color: colors.textSecondary, lineHeight: 14 },

    secaoLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sincronizado: { flexDirection: "row", alignItems: "center", gap: 4 },
    sincronizadoTxt: { fontSize: 10, color: colors.textSecondary },
    indicadores: { flexDirection: "row", gap: 8 },
    indicador: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 14, alignItems: "center", gap: 3 },
    indicadorValor: { fontSize: 16, fontWeight: "800", color: colors.textPrimary, marginTop: 3 },
    indicadorRotulo: { fontSize: 9, color: colors.textSecondary },
    resumoSemana: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
    resumoItem: { flex: 1, alignItems: "center", gap: 2 },
    resumoValor: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
    resumoRotulo: { fontSize: 10, color: colors.textSecondary },
    iconeRedondo: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.verdeSuave, alignItems: "center", justifyContent: "center" },
    vazio: { alignItems: "center", gap: 7, paddingVertical: 10 },
    vazioTxt: { fontSize: 12, color: colors.textSecondary },
    pesoCard: { flexDirection: "row", alignItems: "center" },
    pesoValor: { fontSize: 24, fontWeight: "800", color: colors.textPrimary, marginTop: 3 },
    pesoDelta: { flexDirection: "row", alignItems: "center", gap: 5 },
    pesoDeltaTxt: { fontSize: 11, color: colors.textSecondary },

    ajustar: { flexDirection: "row", alignItems: "center", gap: 11 },
    rotuloCampo: { fontSize: 11, color: colors.textSecondary, fontWeight: "700" },
    campo: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 18, fontWeight: "700", color: colors.textPrimary },
    ajuda: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },
    acoes: { flexDirection: "row", gap: 10 },
    botao: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    botaoPri: { backgroundColor: colors.botao },
    botaoPriTxt: { color: colors.textoSobreMarca, fontWeight: "700", fontSize: 14 },
    botaoSec: { borderWidth: 1, borderColor: colors.border },
    botaoSecTxt: { color: colors.textSecondary, fontWeight: "600", fontSize: 14 },
  });
