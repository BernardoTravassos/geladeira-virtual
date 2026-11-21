import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { DiarioReal } from "../../utils/diarioPaciente";
import { fmtL, type Alvo, type AbaPainel, type EstadoPainel, type MetaCombinada, type ResumoDia } from "../../utils/reuniaoDados";
import { Barra, HUD, Medidor, Pulso, Vidro } from "./hud";
import Folha from "./Folha";

const ABAS = [
  { chave: "hoje", rotulo: "Hoje", icone: "activity" },
  { chave: "plano", rotulo: "Plano", icone: "clipboard" },
  { chave: "metas", rotulo: "Metas", icone: "target" },
];

export type MetasBase = { kcal: number; aguaMl: number; proteina: number; carbo: number; gordura: number };

type Props = {
  aberta: boolean; aoFechar: () => void; bottom: number; titulo: string;
  /** true: é o nutricionista, que mexe. false: é o paciente, que só assiste ao vivo. */
  editavel: boolean;
  estado: EstadoPainel;
  aoMudar?: (patch: Partial<EstadoPainel>) => void;
  resumo: ResumoDia | null;
  metasBase: MetasBase;
  metaCombinada?: MetaCombinada;
  /** Só o lado do nutricionista tem o diário do servidor. */
  diario?: DiarioReal | null;
  aoCombinar?: (m: MetaCombinada) => void;
  nomePaciente: string;
};

/**
 * A tela de dados da reunião. Os dois lados veem o mesmo painel: o nutricionista
 * toca e ajusta, e o estado (aba, indicador apontado, refeição, valores) viaja
 * pelo canal de dados, então o paciente acompanha cada movimento ao vivo.
 */
export default function PainelCompartilhado(p: Props) {
  const { estado, resumo: r, metasBase } = p;
  const muda = (patch: Partial<EstadoPainel>) => p.editavel && p.aoMudar?.(patch);
  const kcal = r?.kcal ?? Math.round(p.diario?.kcalSemana?.[6] ?? 0);
  const metaKcal = p.metaCombinada?.kcal ?? r?.metaKcal ?? metasBase.kcal;
  const agua = r?.aguaMl ?? p.diario?.aguaMl ?? 0;
  const metaAgua = p.metaCombinada?.aguaMl ?? r?.metaAguaMl ?? metasBase.aguaMl;
  const treinoMin = r?.treinoMin ?? p.diario?.treinos.reduce((s, t) => s + t.minutos, 0) ?? 0;
  const treinoKcal = r?.treinoKcal ?? p.diario?.treinos.reduce((s, t) => s + t.kcal, 0) ?? 0;

  const alvo = (a: Alvo, filho: React.ReactNode) => {
    const el = (
      <TouchableOpacity activeOpacity={p.editavel ? 0.7 : 1} disabled={!p.editavel} onPress={() => muda({ alvo: estado.alvo === a ? null : a })}>{filho}</TouchableOpacity>
    );
    return estado.alvo === a ? <Pulso cor={HUD.ciano} style={s.alvo}>{el}</Pulso> : <View style={s.alvoQuieto}>{el}</View>;
  };

  const ras = estado.rascunho ?? { kcal: metaKcal, aguaMl: metaAgua };
  const kcalEdit = ras.kcal ?? metaKcal;
  const aguaEdit = ras.aguaMl ?? metaAgua;

  return (
    <Folha aberta={p.aberta} aoFechar={p.aoFechar} bottom={p.bottom} titulo={p.titulo} abas={ABAS} aba={estado.aba} aoTrocar={p.editavel ? (c) => muda({ aba: c as AbaPainel }) : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
        {estado.aba === "hoje" && (
          <>
            <View style={s.linha}>
              {alvo("kcal", <Medidor icone="zap" rotulo="Calorias" valor={kcal.toLocaleString("pt-BR")} meta={metaKcal.toLocaleString("pt-BR")} un="kcal" cor={kcal > metaKcal ? HUD.rosa : HUD.verde} tamanho={88} />)}
              {alvo("agua", <Medidor icone="droplet" rotulo="Água" valor={fmtL(agua).replace(" L", "")} meta={fmtL(metaAgua).replace(" L", "")} un="L" cor={HUD.ciano} tamanho={88} />)}
              {alvo("treino", <Medidor icone="activity" rotulo="Treino" valor={`${treinoMin}`} meta={treinoMin > 0 ? `${treinoMin}` : "30"} un="min" cor={HUD.ambar} tamanho={88} />)}
            </View>
            <Text style={s.dica}>{p.editavel ? "Toque em um indicador para apontá-lo: o paciente vê o brilho na tela dele." : "Sua nutricionista está mostrando seus números ao vivo."}</Text>
            {alvo("macros", (
              <Vidro style={{ gap: 10, width: "100%" }}>
                <Barra rotulo="Proteína" atual={r?.proteina ?? 0} meta={r?.metaProteina ?? metasBase.proteina} cor={HUD.verde} />
                <Barra rotulo="Carboidrato" atual={r?.carbo ?? 0} meta={r?.metaCarbo ?? metasBase.carbo} cor={HUD.ciano} />
                <Barra rotulo="Gordura" atual={r?.gordura ?? 0} meta={r?.metaGordura ?? metasBase.gordura} cor={HUD.ambar} />
                {!r && <Text style={s.nota}>Os macros aparecem quando o celular do paciente estiver na chamada.</Text>}
                {treinoKcal > 0 && <Text style={s.nota}>Treino de hoje: ≈ {treinoKcal} kcal gastas.</Text>}
              </Vidro>
            ))}
            <Vidro style={{ gap: 4 }}>
              <Text style={s.secao}>Refeições de hoje</Text>
              {p.diario === undefined && r ? (
                <Text style={s.refTxt}>{r.refeicoes} registrada(s){r.pendentes.length ? ` · faltam: ${r.pendentes.join(", ")}` : " · rotina completa"}</Text>
              ) : p.diario === null ? <ActivityIndicator color={HUD.verde} /> : p.diario ? (
                <>
                  {p.diario.refeicoes.length === 0 && <Text style={s.nota}>Nenhuma refeição registrada hoje.</Text>}
                  {p.diario.refeicoes.map((x) => (
                    <View key={x.chave} style={s.refeicao}><Feather name="check-circle" size={14} color={HUD.verde} /><Text style={s.refTxt}>{x.nome}{x.horario ? ` · ${x.horario}` : ""}</Text></View>
                  ))}
                  {(r?.pendentes ?? p.diario.pendentes).length > 0 && <Text style={[s.nota, { marginTop: 4 }]}>Faltam: {(r?.pendentes ?? p.diario.pendentes).join(", ")}</Text>}
                  <Text style={[s.nota, { marginTop: 4 }]}>Adesão nos últimos 7 dias: <Text style={{ color: HUD.texto, fontWeight: "800" }}>{p.diario.adesao}%</Text></Text>
                </>
              ) : null}
            </Vidro>
          </>
        )}

        {estado.aba === "plano" && (
          <>
            <Text style={s.dica}>{p.editavel ? "Toque em uma refeição para abri-la na tela do paciente." : "Sua nutricionista está mostrando o seu plano."}</Text>
            {!estado.plano ? <ActivityIndicator color={HUD.verde} /> : estado.plano.length === 0 ? (
              <Vidro><Text style={s.nota}>{p.editavel ? "Você ainda não montou o plano deste paciente. Faça isso na aba Plano da tela dele." : "O plano ainda não foi montado."}</Text></Vidro>
            ) : estado.plano.map((x, i) => {
              const corpo = (
                <TouchableOpacity activeOpacity={p.editavel ? 0.7 : 1} disabled={!p.editavel} onPress={() => muda({ sel: estado.sel === i ? null : i })} style={{ gap: 4 }}>
                  <Text style={s.secao}>{x.nome}{x.horario ? ` · ${x.horario}` : ""}</Text>
                  <Text style={s.refTxt}>{x.sugestao}</Text>
                </TouchableOpacity>
              );
              return estado.sel === i ? <Pulso key={i} cor={HUD.verde}>{corpo}</Pulso> : <Vidro key={i}>{corpo}</Vidro>;
            })}
          </>
        )}

        {estado.aba === "metas" && (
          <>
            <Text style={s.dica}>{p.editavel ? "Ajuste com + e −: o paciente vê os números mudarem ao vivo. Toque em Combinar para fechar." : "Sua nutricionista está ajustando as suas metas. Veja os números mudarem."}</Text>
            <Vidro brilho={HUD.verde} style={{ gap: 18 }}>
              <Passo icone="zap" cor={HUD.verde} rotulo="Calorias por dia" valor={`${kcalEdit.toLocaleString("pt-BR")} kcal`} editavel={p.editavel}
                menos={() => muda({ rascunho: { kcal: Math.max(1000, kcalEdit - 50), aguaMl: aguaEdit }, combinada: false })}
                mais={() => muda({ rascunho: { kcal: Math.min(6000, kcalEdit + 50), aguaMl: aguaEdit }, combinada: false })} />
              <Passo icone="droplet" cor={HUD.ciano} rotulo="Água por dia" valor={fmtL(aguaEdit)} editavel={p.editavel}
                menos={() => muda({ rascunho: { kcal: kcalEdit, aguaMl: Math.max(1000, aguaEdit - 250) }, combinada: false })}
                mais={() => muda({ rascunho: { kcal: kcalEdit, aguaMl: Math.min(6000, aguaEdit + 250) }, combinada: false })} />
              {p.editavel && (
                <TouchableOpacity style={s.enviar} onPress={() => { p.aoCombinar?.({ kcal: kcalEdit, aguaMl: aguaEdit }); muda({ combinada: true }); }} accessibilityRole="button">
                  <Feather name="check" size={16} color="#04130C" /><Text style={s.enviarTxt}>Combinar com {p.nomePaciente.split(" ")[0]}</Text>
                </TouchableOpacity>
              )}
              {estado.combinada && <Text style={[s.nota, { color: HUD.verde, textAlign: "center" }]}>✓ Meta combinada: {kcalEdit.toLocaleString("pt-BR")} kcal · {fmtL(aguaEdit)}</Text>}
            </Vidro>
          </>
        )}
      </ScrollView>
    </Folha>
  );
}

function Passo({ icone, cor, rotulo, valor, menos, mais, editavel }: { icone: any; cor: string; rotulo: string; valor: string; menos: () => void; mais: () => void; editavel: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Feather name={icone} size={14} color={cor} /><Text style={s.secao}>{rotulo}</Text></View>
      <View style={s.passo}>
        {editavel ? <TouchableOpacity style={s.passoBt} onPress={menos} accessibilityLabel="Diminuir"><Feather name="minus" size={20} color={HUD.texto} /></TouchableOpacity> : <View style={{ width: 46 }} />}
        <Text style={[s.passoVal, { color: cor, textShadowColor: cor }]}>{valor}</Text>
        {editavel ? <TouchableOpacity style={s.passoBt} onPress={mais} accessibilityLabel="Aumentar"><Feather name="plus" size={20} color={HUD.texto} /></TouchableOpacity> : <View style={{ width: 46 }} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  linha: { flexDirection: "row", justifyContent: "space-around", paddingTop: 4 },
  alvo: { padding: 8, borderRadius: 20 },
  alvoQuieto: { padding: 8 },
  dica: { color: HUD.suave, fontSize: 12, lineHeight: 17 },
  nota: { color: HUD.suave, fontSize: 12, lineHeight: 17 },
  secao: { color: HUD.texto, fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  refeicao: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  refTxt: { color: HUD.texto, fontSize: 13, lineHeight: 18 },
  passo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  passoBt: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: HUD.borda, alignItems: "center", justifyContent: "center" },
  passoVal: { fontSize: 28, fontWeight: "800", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  enviar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: HUD.verde, paddingVertical: 13, borderRadius: 14 },
  enviarTxt: { color: "#04130C", fontSize: 14, fontWeight: "800" },
});
