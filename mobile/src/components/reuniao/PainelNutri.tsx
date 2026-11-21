import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { diarioDoPaciente } from "../../services/nutri";
import { montarDiario, type DiarioReal } from "../../utils/diarioPaciente";
import { carregarPrescricao, montarPlano } from "../../utils/planoNutri";
import { calcularMetaAguaMl, calcularMetas, type PerfilApi } from "../../utils/nutricao";
import type { EstadoPainel, MetaCombinada, ResumoDia } from "../../utils/reuniaoDados";
import { HUD } from "./hud";
import Folha from "./Folha";
import PainelCompartilhado from "./PainelCompartilhado";

type Props = {
  aberta: boolean; aoFechar: () => void; bottom: number;
  pacienteId: string; nomePaciente: string; perfil: PerfilApi | null;
  resumo: ResumoDia | null;
  estado: EstadoPainel;
  aoMudar: (patch: Partial<EstadoPainel>) => void;
  metaCombinada?: MetaCombinada;
  aoCombinar: (m: MetaCombinada) => void;
};

/** Lado do nutricionista: carrega o diário e o plano do paciente e controla o painel que os dois veem. */
export default function PainelNutri(p: Props) {
  const [diario, setDiario] = useState<DiarioReal | null>(null);
  const [planoCarregado, setPlanoCarregado] = useState(false);

  useEffect(() => {
    if (!p.aberta) return;
    let vivo = true;
    const buscar = () => diarioDoPaciente(p.pacienteId).then((l) => vivo && setDiario(montarDiario(l))).catch(() => {});
    buscar();
    const t = setInterval(buscar, 30000);
    if (!planoCarregado) {
      carregarPrescricao(p.pacienteId)
        .then((e) => { if (!vivo) return; setPlanoCarregado(true); p.aoMudar({ plano: montarPlano(e).map((r) => ({ nome: r.nome, horario: r.horario, sugestao: r.sugestao })) }); })
        .catch(() => { if (vivo) { setPlanoCarregado(true); p.aoMudar({ plano: [] }); } });
    }
    return () => { vivo = false; clearInterval(t); };
  }, [p.aberta, p.pacienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const metas = useMemo(() => calcularMetas(p.perfil), [p.perfil]);
  const base = useMemo(() => ({ kcal: metas.calorias, aguaMl: calcularMetaAguaMl(p.perfil), proteina: metas.proteina, carbo: metas.carboidrato, gordura: metas.gordura }), [metas, p.perfil]);

  return (
    <PainelCompartilhado aberta={p.aberta} aoFechar={p.aoFechar} bottom={p.bottom} editavel estado={p.estado} aoMudar={p.aoMudar}
      titulo={`${p.nomePaciente.split(" ")[0]} · ${p.resumo ? "ao vivo" : "servidor"}`} resumo={p.resumo} metasBase={base}
      metaCombinada={p.metaCombinada} diario={diario} aoCombinar={p.aoCombinar} nomePaciente={p.nomePaciente} />
  );
}

/** Anotações PRIVADAS do nutricionista: o paciente não vê o que está sendo escrito. */
export function NotasNutri({ aberta, aoFechar, bottom, notas, aoMudar, focos }: { aberta: boolean; aoFechar: () => void; bottom: number; notas: string; aoMudar: (t: string) => void; focos: string[] }) {
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} bottom={bottom} titulo="Notas privadas">
      <Text style={s.dica}>Só você vê o que escreve aqui. Ao encerrar, o resumo (suas notas, a meta combinada e os assuntos) é salvo e o paciente recebe uma cópia.</Text>
      <TextInput value={notas} onChangeText={aoMudar} multiline placeholder="O que ficou combinado nesta consulta…" placeholderTextColor={HUD.suave} style={s.notas} maxLength={2000} textAlignVertical="top" />
      <View><Text style={s.dica}>{notas.length}/2000 · Falamos de: {focos.length === 0 ? "nada ainda" : focos.join(", ")}</Text></View>
    </Folha>
  );
}

const s = StyleSheet.create({
  dica: { color: HUD.suave, fontSize: 12, lineHeight: 17, marginBottom: 8 },
  notas: { flex: 1, minHeight: 140, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, borderWidth: 1, borderColor: HUD.borda, color: HUD.texto, padding: 12, fontSize: 14, lineHeight: 20, marginBottom: 8 },
});
