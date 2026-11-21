import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { diarioDoPaciente } from "../../services/nutri";
import { montarDiario, type DiarioReal } from "../../utils/diarioPaciente";
import { carregarPrescricao, montarPlano } from "../../utils/planoNutri";
import { calcularMetaAguaMl, calcularMetas, type PerfilApi } from "../../utils/nutricao";
import { fmtL, type Alvo, type Foco, type MetaCombinada, type ResumoDia } from "../../utils/reuniaoDados";
import { Barra, HUD, Medidor, Vidro } from "./hud";
import Folha from "./Folha";

export type AbaNutri = "hoje" | "plano" | "metas" | "notas";
const ABAS = [
  { chave: "hoje", rotulo: "Hoje", icone: "activity" },
  { chave: "plano", rotulo: "Plano", icone: "clipboard" },
  { chave: "metas", rotulo: "Metas", icone: "target" },
  { chave: "notas", rotulo: "Notas", icone: "edit-3" },
];

type Props = {
  aberta: boolean; aoFechar: () => void; bottom: number;
  pacienteId: string; nomePaciente: string; perfil: PerfilApi | null;
  /** Resumo ao vivo vindo do celular do paciente (null até ele mandar). */
  resumo: ResumoDia | null;
  aoDestacar: (f: Foco) => void;
  aoCombinarMeta: (m: MetaCombinada) => void;
  metaCombinada?: MetaCombinada;
  notas: string; aoMudarNotas: (t: string) => void;
  focosEnviados: string[];
};

export default function PainelNutri(p: Props) {
  const [aba, setAba] = useState<AbaNutri>("hoje");
  const [diario, setDiario] = useState<DiarioReal | null>(null);
  const [plano, setPlano] = useState<ReturnType<typeof montarPlano> | null>(null);

  // O diário do servidor serve de base (refeições, semana); o resumo ao vivo, quando chega, tem a palavra final nos números de hoje.
  useEffect(() => {
    if (!p.aberta) return;
    let vivo = true;
    const buscar = () => diarioDoPaciente(p.pacienteId).then((l) => vivo && setDiario(montarDiario(l))).catch(() => {});
    buscar();
    const t = setInterval(buscar, 30000);
    carregarPrescricao(p.pacienteId).then((e) => vivo && setPlano(montarPlano(e))).catch(() => vivo && setPlano([]));
    return () => { vivo = false; clearInterval(t); };
  }, [p.aberta, p.pacienteId]);

  const metas = useMemo(() => calcularMetas(p.perfil), [p.perfil]);
  const metaAgua = useMemo(() => calcularMetaAguaMl(p.perfil), [p.perfil]);
  const kcal = p.resumo?.kcal ?? Math.round(diario?.kcalSemana?.[6] ?? 0);
  const metaKcal = p.metaCombinada?.kcal ?? p.resumo?.metaKcal ?? metas.calorias;
  const agua = p.resumo?.aguaMl ?? diario?.aguaMl ?? 0;
  const metaAguaF = p.metaCombinada?.aguaMl ?? p.resumo?.metaAguaMl ?? metaAgua;
  const treinoMin = p.resumo?.treinoMin ?? diario?.treinos.reduce((s, t) => s + t.minutos, 0) ?? 0;
  const treinoKcal = p.resumo?.treinoKcal ?? diario?.treinos.reduce((s, t) => s + t.kcal, 0) ?? 0;
  const ao = !!p.resumo;

  const [kcalAlvo, setKcalAlvo] = useState<number | null>(null);
  const [aguaAlvo, setAguaAlvo] = useState<number | null>(null);
  const kcalEdit = kcalAlvo ?? metaKcal;
  const aguaEdit = aguaAlvo ?? metaAguaF;

  const destacar = (alvo: Alvo, titulo: string) => p.aoDestacar({ alvo, titulo });

  return (
    <Folha aberta={p.aberta} aoFechar={p.aoFechar} bottom={p.bottom} titulo={`${p.nomePaciente.split(" ")[0]} · ${ao ? "ao vivo" : "servidor"}`} abas={ABAS} aba={aba} aoTrocar={(c) => setAba(c as AbaNutri)}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
        {aba === "hoje" && (
          <>
            <View style={s.linha}>
              <TouchableOpacity onPress={() => destacar("kcal", "Calorias")}><Medidor icone="zap" rotulo="Calorias" valor={kcal.toLocaleString("pt-BR")} meta={metaKcal.toLocaleString("pt-BR")} un="kcal" cor={kcal > metaKcal ? HUD.rosa : HUD.verde} /></TouchableOpacity>
              <TouchableOpacity onPress={() => destacar("agua", "Água")}><Medidor icone="droplet" rotulo="Água" valor={fmtL(agua).replace(" L", "")} meta={fmtL(metaAguaF).replace(" L", "")} un="L" cor={HUD.ciano} /></TouchableOpacity>
              <TouchableOpacity onPress={() => destacar("treino", "Treino")}><Medidor icone="activity" rotulo="Treino" valor={`${treinoMin}`} meta={treinoMin > 0 ? `${treinoMin}` : "30"} un="min" cor={HUD.ambar} /></TouchableOpacity>
            </View>
            <Text style={s.dica}>Toque em um indicador para destacá-lo na tela do paciente.</Text>
            <Vidro style={{ gap: 10 }}>
              <Barra rotulo="Proteína" atual={p.resumo?.proteina ?? 0} meta={p.resumo?.metaProteina ?? metas.proteina} cor={HUD.verde} />
              <Barra rotulo="Carboidrato" atual={p.resumo?.carbo ?? 0} meta={p.resumo?.metaCarbo ?? metas.carboidrato} cor={HUD.ciano} />
              <Barra rotulo="Gordura" atual={p.resumo?.gordura ?? 0} meta={p.resumo?.metaGordura ?? metas.gordura} cor={HUD.ambar} />
              {!ao && <Text style={s.nota}>Macros aparecem quando o celular do paciente estiver na chamada.</Text>}
              {treinoKcal > 0 && <Text style={s.nota}>Treino de hoje: ≈ {treinoKcal} kcal gastas.</Text>}
            </Vidro>
            <Vidro>
              <Text style={s.secao}>Refeições de hoje</Text>
              {!diario ? <ActivityIndicator color={HUD.verde} /> : (
                <>
                  {(ao ? (p.resumo!.refeicoes) : diario.refeicoes.length) === 0 && <Text style={s.nota}>Nenhuma refeição registrada hoje.</Text>}
                  {diario.refeicoes.map((r) => (
                    <View key={r.chave} style={s.refeicao}><Feather name="check-circle" size={14} color={HUD.verde} /><Text style={s.refTxt}>{r.nome}{r.horario ? ` · ${r.horario}` : ""}</Text></View>
                  ))}
                  {(p.resumo?.pendentes ?? diario.pendentes).length > 0 && <Text style={[s.nota, { marginTop: 6 }]}>Faltam: {(p.resumo?.pendentes ?? diario.pendentes).join(", ")}</Text>}
                  <Text style={[s.nota, { marginTop: 6 }]}>Adesão nos últimos 7 dias: <Text style={{ color: HUD.texto, fontWeight: "800" }}>{diario.adesao}%</Text></Text>
                </>
              )}
            </Vidro>
          </>
        )}

        {aba === "plano" && (
          <>
            <Text style={s.dica}>Toque em "Mostrar" para abrir a refeição na tela do paciente enquanto vocês conversam.</Text>
            {!plano ? <ActivityIndicator color={HUD.verde} /> : plano.length === 0 ? (
              <Vidro><Text style={s.nota}>Você ainda não montou o plano deste paciente. Faça isso na aba Plano da tela dele.</Text></Vidro>
            ) : plano.map((r) => (
              <Vidro key={r.chave} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[s.secao, { flex: 1, marginBottom: 0 }]}>{r.nome}{r.horario ? ` · ${r.horario}` : ""}</Text>
                  <TouchableOpacity style={s.mostrar} onPress={() => p.aoDestacar({ alvo: "refeicao", titulo: r.nome, itens: [r.sugestao].filter(Boolean) })} accessibilityRole="button">
                    <Feather name="cast" size={13} color="#04130C" /><Text style={s.mostrarTxt}>Mostrar</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.refTxt}>{r.sugestao}</Text>
              </Vidro>
            ))}
          </>
        )}

        {aba === "metas" && (
          <>
            <Text style={s.dica}>Ajuste e envie. O paciente vê a meta mudar na hora; ela fica anotada no resumo da consulta.</Text>
            <Vidro style={{ gap: 14 }}>
              <Passo icone="zap" cor={HUD.verde} rotulo="Calorias por dia" valor={`${kcalEdit.toLocaleString("pt-BR")} kcal`} menos={() => setKcalAlvo(Math.max(1000, kcalEdit - 50))} mais={() => setKcalAlvo(Math.min(6000, kcalEdit + 50))} />
              <Passo icone="droplet" cor={HUD.ciano} rotulo="Água por dia" valor={fmtL(aguaEdit)} menos={() => setAguaAlvo(Math.max(1000, aguaEdit - 250))} mais={() => setAguaAlvo(Math.min(6000, aguaEdit + 250))} />
              <TouchableOpacity style={s.enviar} onPress={() => p.aoCombinarMeta({ kcal: kcalEdit, aguaMl: aguaEdit })} accessibilityRole="button">
                <Feather name="send" size={15} color="#04130C" /><Text style={s.enviarTxt}>Combinar com {p.nomePaciente.split(" ")[0]}</Text>
              </TouchableOpacity>
              {!!p.metaCombinada && <Text style={[s.nota, { color: HUD.verde }]}>✓ Enviado: {p.metaCombinada.kcal?.toLocaleString("pt-BR")} kcal · {fmtL(p.metaCombinada.aguaMl ?? 0)}</Text>}
            </Vidro>
          </>
        )}

        {aba === "notas" && (
          <>
            <Text style={s.dica}>Suas anotações ficam só com você até encerrar. Ao encerrar, o resumo é salvo e o paciente recebe o que combinaram.</Text>
            <TextInput value={p.notas} onChangeText={p.aoMudarNotas} multiline placeholder="O que ficou combinado nesta consulta…" placeholderTextColor={HUD.suave} style={s.notas} maxLength={2000} textAlignVertical="top" />
            <Text style={s.nota}>{p.notas.length}/2000 · Mostrado ao paciente: {p.focosEnviados.length === 0 ? "nada ainda" : p.focosEnviados.join(", ")}</Text>
          </>
        )}
      </ScrollView>
    </Folha>
  );
}

function Passo({ icone, cor, rotulo, valor, menos, mais }: { icone: any; cor: string; rotulo: string; valor: string; menos: () => void; mais: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Feather name={icone} size={14} color={cor} /><Text style={s.secao}>{rotulo}</Text></View>
      <View style={s.passo}>
        <TouchableOpacity style={s.passoBt} onPress={menos} accessibilityLabel="Diminuir"><Feather name="minus" size={20} color={HUD.texto} /></TouchableOpacity>
        <Text style={[s.passoVal, { color: cor }]}>{valor}</Text>
        <TouchableOpacity style={s.passoBt} onPress={mais} accessibilityLabel="Aumentar"><Feather name="plus" size={20} color={HUD.texto} /></TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  linha: { flexDirection: "row", justifyContent: "space-around", paddingTop: 4 },
  dica: { color: HUD.suave, fontSize: 12, lineHeight: 17 },
  nota: { color: HUD.suave, fontSize: 12, lineHeight: 17 },
  secao: { color: HUD.texto, fontSize: 13, fontWeight: "800", marginBottom: 6, letterSpacing: 0.3 },
  refeicao: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  refTxt: { color: HUD.texto, fontSize: 13, lineHeight: 18 },
  mostrar: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: HUD.verde, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12 },
  mostrarTxt: { color: "#04130C", fontSize: 12, fontWeight: "800" },
  passo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  passoBt: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  passoVal: { fontSize: 24, fontWeight: "800" },
  enviar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: HUD.verde, paddingVertical: 13, borderRadius: 14 },
  enviarTxt: { color: "#04130C", fontSize: 14, fontWeight: "800" },
  notas: { minHeight: 150, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, borderWidth: 1, borderColor: HUD.borda, color: HUD.texto, padding: 12, fontSize: 14, lineHeight: 20 },
});
