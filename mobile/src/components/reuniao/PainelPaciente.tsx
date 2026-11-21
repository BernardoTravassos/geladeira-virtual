import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { fmtL, type EstadoPainel, type Foco, type MetaCombinada, type ResumoDia } from "../../utils/reuniaoDados";
import { HUD, Pulso } from "./hud";
import PainelCompartilhado from "./PainelCompartilhado";

const TITULO_ALVO: Record<string, { icone: any; cor: string }> = {
  kcal: { icone: "zap", cor: HUD.verde },
  agua: { icone: "droplet", cor: HUD.ciano },
  treino: { icone: "activity", cor: HUD.ambar },
  macros: { icone: "pie-chart", cor: HUD.verde },
  refeicao: { icone: "coffee", cor: HUD.verde },
};

/** Lado do paciente: o mesmo painel, só de leitura, que acompanha o que a nutricionista faz. */
export default function PainelPaciente({ aberta, aoFechar, bottom, resumo, meta, estado }: {
  aberta: boolean; aoFechar: () => void; bottom: number; resumo: ResumoDia | null; meta?: MetaCombinada; estado: EstadoPainel;
}) {
  const base = { kcal: resumo?.metaKcal ?? 0, aguaMl: resumo?.metaAguaMl ?? 0, proteina: resumo?.metaProteina ?? 0, carbo: resumo?.metaCarbo ?? 0, gordura: resumo?.metaGordura ?? 0 };
  return (
    <PainelCompartilhado aberta={aberta} aoFechar={aoFechar} bottom={bottom} editavel={false} estado={estado} resumo={resumo} metasBase={base}
      metaCombinada={meta} titulo="Meu dia · ao vivo" nomePaciente="" />
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
