import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { fmtL, type Foco, type MetaCombinada, type ResumoDia } from "../../utils/reuniaoDados";
import { Barra, HUD, Medidor, Pulso, Vidro } from "./hud";
import Folha from "./Folha";

const TITULO_ALVO: Record<string, { icone: any; cor: string }> = {
  kcal: { icone: "zap", cor: HUD.verde },
  agua: { icone: "droplet", cor: HUD.ciano },
  treino: { icone: "activity", cor: HUD.ambar },
  macros: { icone: "pie-chart", cor: HUD.verde },
  refeicao: { icone: "coffee", cor: HUD.verde },
};

/** Painel "Meu dia" do paciente, com o mesmo visual do painel da nutricionista. */
export default function PainelPaciente({ aberta, aoFechar, bottom, resumo, meta, foco }: {
  aberta: boolean; aoFechar: () => void; bottom: number; resumo: ResumoDia | null; meta?: MetaCombinada; foco: Foco | null;
}) {
  const r = resumo;
  const metaK = meta?.kcal ?? r?.metaKcal ?? 0;
  const metaA = meta?.aguaMl ?? r?.metaAguaMl ?? 0;
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} bottom={bottom} titulo="Meu dia">
      {!r ? <Text style={s.nota}>Carregando seus números…</Text> : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
          <View style={s.linha}>
            <Medidor icone="zap" rotulo="Calorias" valor={r.kcal.toLocaleString("pt-BR")} meta={metaK.toLocaleString("pt-BR")} un="kcal" cor={r.kcal > metaK ? HUD.rosa : HUD.verde} destaque={foco?.alvo === "kcal"} />
            <Medidor icone="droplet" rotulo="Água" valor={fmtL(r.aguaMl).replace(" L", "")} meta={fmtL(metaA).replace(" L", "")} un="L" cor={HUD.ciano} destaque={foco?.alvo === "agua"} />
            <Medidor icone="activity" rotulo="Treino" valor={`${r.treinoMin}`} meta={r.treinoMin > 0 ? `${r.treinoMin}` : "30"} un="min" cor={HUD.ambar} destaque={foco?.alvo === "treino"} />
          </View>
          <Vidro style={{ gap: 10 }}>
            <Barra rotulo="Proteína" atual={r.proteina} meta={r.metaProteina} cor={HUD.verde} />
            <Barra rotulo="Carboidrato" atual={r.carbo} meta={r.metaCarbo} cor={HUD.ciano} />
            <Barra rotulo="Gordura" atual={r.gordura} meta={r.metaGordura} cor={HUD.ambar} />
          </Vidro>
          {!!meta && (
            <Vidro brilho={HUD.verde}>
              <Text style={s.secao}>Meta combinada com sua nutricionista</Text>
              <Text style={s.nota}>{meta.kcal?.toLocaleString("pt-BR")} kcal por dia · {fmtL(meta.aguaMl ?? 0)} de água</Text>
            </Vidro>
          )}
          <Text style={s.nota}>Sua nutricionista vê este resumo durante a reunião.</Text>
        </ScrollView>
      )}
    </Folha>
  );
}

/** Cartão que aparece sobre o vídeo quando a nutricionista destaca algo, ou combina uma meta nova. */
export function AvisoDaNutri({ foco, meta, aoDispensar, bottom }: { foco: Foco | null; meta: MetaCombinada | null; aoDispensar: () => void; bottom: number }) {
  if (!foco && !meta) return null;
  const alvo = foco ? TITULO_ALVO[foco.alvo] ?? TITULO_ALVO.kcal : TITULO_ALVO.kcal;
  return (
    <View style={[s.aviso, { bottom }]} pointerEvents="box-none">
      <Pulso cor={foco ? alvo.cor : HUD.verde} style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name={foco ? alvo.icone : "target"} size={16} color={foco ? alvo.cor : HUD.verde} />
          <Text style={[s.avisoTitulo, { flex: 1 }]}>{foco ? (foco.alvo === "refeicao" ? `Sua nutricionista mostrou: ${foco.titulo}` : `Vamos falar de: ${foco.titulo ?? ""}`) : "Nova meta combinada"}</Text>
          <TouchableOpacity onPress={aoDispensar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Dispensar"><Feather name="x" size={16} color={HUD.suave} /></TouchableOpacity>
        </View>
        {foco?.itens?.map((i, k) => <Text key={k} style={s.avisoTxt}>{i}</Text>)}
        {foco?.msg ? <Text style={s.avisoTxt}>{foco.msg}</Text> : null}
        {!foco && meta && <Text style={s.avisoTxt}>{meta.kcal?.toLocaleString("pt-BR")} kcal por dia · {fmtL(meta.aguaMl ?? 0)} de água</Text>}
      </Pulso>
    </View>
  );
}

const s = StyleSheet.create({
  linha: { flexDirection: "row", justifyContent: "space-around", paddingTop: 4 },
  nota: { color: HUD.suave, fontSize: 12, lineHeight: 17 },
  secao: { color: HUD.texto, fontSize: 13, fontWeight: "800", marginBottom: 4 },
  aviso: { position: "absolute", left: 14, right: 14 },
  avisoTitulo: { color: HUD.texto, fontSize: 14, fontWeight: "800" },
  avisoTxt: { color: HUD.texto, fontSize: 13, lineHeight: 18 },
});
