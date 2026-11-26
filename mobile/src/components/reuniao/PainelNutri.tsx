import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { diarioDoPaciente } from "../../services/nutri";
import { montarDiario, type DiarioReal } from "../../utils/diarioPaciente";
import { carregarPrescricao, comMetas, descreverItens, gravarPrescricao, metasDaPrescricao, MODELO_REFEICOES, type Edicoes, type MetasNutri } from "../../utils/planoNutri";
import type { Comando, DadosPaciente } from "../../utils/reuniaoEdicao";
import type { ItemPrato } from "../../utils/refeicoes";
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
  dados: DadosPaciente | null;
  aoComando: (c: Comando) => void;
  situacao: { ok: boolean; texto: string } | null;
  aoSituacao: (s: { ok: boolean; texto: string }) => void;
};

/** Todas as refeições aparecem para o nutricionista, inclusive as vazias, para poder preencher. */
const paraPainel = (e: Edicoes) =>
  MODELO_REFEICOES.map((r) => ({ chave: r.chave, nome: r.nome, horario: r.horario, itens: e[r.chave] ?? [], sugestao: descreverItens(e[r.chave] ?? []) }));

/** Lado do nutricionista: carrega o diário e o plano do paciente e controla o painel que os dois veem. */
export default function PainelNutri(p: Props) {
  const [diario, setDiario] = useState<DiarioReal | null>(null);
  const prescricao = useRef<Edicoes | null>(null);
  const [metasSalvas, setMetasSalvas] = useState<MetasNutri | undefined>();
  const fila = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    if (!p.aberta) return;
    let vivo = true;
    const buscar = () => diarioDoPaciente(p.pacienteId).then((l) => vivo && setDiario(montarDiario(l))).catch(() => {});
    buscar();
    const t = setInterval(buscar, 30000);
    if (!prescricao.current) {
      carregarPrescricao(p.pacienteId)
        .then((e) => { if (!vivo) return; prescricao.current = e; setMetasSalvas(metasDaPrescricao(e)); p.aoMudar({ plano: paraPainel(e) }); })
        .catch(() => { if (vivo) p.aoMudar({ plano: [] }); });
    }
    return () => { vivo = false; clearInterval(t); };
  }, [p.aberta, p.pacienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Grava no servidor (em fila, na ordem dos toques) e avisa o celular do paciente. */
  function gravar(proximo: Edicoes, refeicao?: string) {
    const anterior = prescricao.current;
    prescricao.current = proximo;
    setMetasSalvas(metasDaPrescricao(proximo));
    p.aoMudar({ plano: paraPainel(proximo) });
    fila.current = fila.current.then(async () => {
      try {
        await gravarPrescricao(p.pacienteId, proximo);
        p.aoComando({ op: "plano", refeicao });
      } catch {
        // Só desfaz se nada mais novo foi feito depois.
        if (prescricao.current === proximo && anterior) { prescricao.current = anterior; setMetasSalvas(metasDaPrescricao(anterior)); p.aoMudar({ plano: paraPainel(anterior) }); }
        p.aoSituacao({ ok: false, texto: "Não foi possível salvar. Confira a conexão e tente de novo." });
      }
    });
  }

  const editarPlano = (chave: string, itens: ItemPrato[]) => {
    if (prescricao.current) gravar({ ...prescricao.current, [chave]: itens }, chave);
  };
  const combinar = (m: MetaCombinada) => {
    if (!prescricao.current) { p.aoSituacao({ ok: false, texto: "O plano ainda está carregando. Toque em Combinar de novo." }); return; }
    p.aoCombinar(m);
    gravar(comMetas(prescricao.current, m));
  };

  const perfil = p.dados?.perfil ?? p.perfil;
  const metas = useMemo(() => calcularMetas(perfil), [perfil]);
  const base = useMemo(() => ({
    kcal: metasSalvas?.kcal ?? metas.calorias, aguaMl: metasSalvas?.aguaMl ?? calcularMetaAguaMl(perfil),
    proteina: metas.proteina, carbo: metas.carboidrato, gordura: metas.gordura,
  }), [metas, perfil, metasSalvas]);

  return (
    <PainelCompartilhado aberta={p.aberta} aoFechar={p.aoFechar} bottom={p.bottom} editavel estado={p.estado} aoMudar={p.aoMudar}
      titulo={`${p.nomePaciente.split(" ")[0]} · ${p.resumo ? "ao vivo" : "servidor"}`} resumo={p.resumo} metasBase={base}
      metaCombinada={p.metaCombinada} diario={diario} aoCombinar={combinar} nomePaciente={p.nomePaciente}
      dados={p.dados} aoComando={p.aoComando} aoEditarPlano={editarPlano} situacao={p.situacao} />
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
