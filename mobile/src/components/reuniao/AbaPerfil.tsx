import React, { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { OBJETIVOS, perfilComCampo, type CampoReuniao } from "../../utils/perfilEdicao";
import type { PerfilApi } from "../../utils/nutricao";
import { HUD, Vidro } from "./hud";

type Linha = { campo: CampoReuniao; rotulo: string; un?: string; opcoes?: string[]; texto?: boolean; valor: (p: any) => string };

const num = (v: unknown) => (Number(v) ? String(Number(v)).replace(".", ",") : "");

const LINHAS: Linha[] = [
  { campo: "pesoKg", rotulo: "Peso", un: "kg", valor: (p) => num(p.peso_kg) },
  { campo: "alturaCm", rotulo: "Altura", un: "cm", valor: (p) => num(p.altura_cm) },
  { campo: "idade", rotulo: "Idade", un: "anos", valor: (p) => num(p.idade) },
  { campo: "gorduraPct", rotulo: "Gordura corporal", un: "%", valor: (p) => num(p.gordura_pct) },
  { campo: "objetivo", rotulo: "Objetivo", opcoes: OBJETIVOS, valor: (p) => p.objetivo ?? "" },
  { campo: "pesoMetaKg", rotulo: "Peso desejado", un: "kg", valor: (p) => num(p.peso_meta_kg) },
  { campo: "diasTreino", rotulo: "Treino por semana", un: "dias", opcoes: ["0", "1", "2", "3", "4", "5", "6", "7"], valor: (p) => (p.dias_treino != null ? String(p.dias_treino) : "") },
  { campo: "intolerancias", rotulo: "Intolerâncias", texto: true, valor: (p) => p.intolerancias ?? "" },
  { campo: "vegano", rotulo: "Vegano", opcoes: ["Sim", "Não"], valor: (p) => (p.vegano ? "Sim" : "Não") },
];

/** Dados do paciente. Com `aoSalvar`, o nutricionista toca numa linha e corrige. */
export default function AbaPerfil({ perfil, aoSalvar }: { perfil: PerfilApi | null; aoSalvar?: (campo: CampoReuniao, valor: string) => void }) {
  const [linha, setLinha] = useState<Linha | null>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  if (!perfil) return <Vidro><Text style={s.nota}>Os dados aparecem quando o celular do paciente estiver na chamada.</Text></Vidro>;

  const mudaPeso = perfil.objetivo === "Emagrecer" || perfil.objetivo === "Ganhar massa";
  const salvar = (valor: string) => {
    if (!linha) return;
    try { perfilComCampo(perfil, linha.campo, valor); } // confere antes de mandar
    catch (e: any) { setErro(e.message); return; }
    aoSalvar?.(linha.campo, valor);
    setLinha(null);
  };

  return (
    <Vidro style={{ gap: 2 }}>
      {LINHAS.filter((l) => l.campo !== "pesoMetaKg" || mudaPeso).map((l) => {
        const v = l.valor(perfil);
        return (
          <TouchableOpacity key={l.campo} style={s.linha} disabled={!aoSalvar} onPress={() => { setLinha(l); setTexto(v); setErro(""); }} accessibilityRole={aoSalvar ? "button" : undefined}>
            <Text style={[s.nota, { flex: 1 }]}>{l.rotulo}</Text>
            <Text style={s.valor}>{v ? `${v}${l.un ? ` ${l.un}` : ""}` : "—"}</Text>
            {!!aoSalvar && <Feather name="edit-2" size={13} color={HUD.verde} />}
          </TouchableOpacity>
        );
      })}
      {linha && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setLinha(null)}>
          <KeyboardAvoidingView style={s.fundo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={s.caixa}>
              <Text style={s.titulo}>{linha.rotulo}</Text>
              {linha.opcoes ? (
                <ScrollView style={{ maxHeight: 320 }}>
                  {linha.opcoes.map((o) => (
                    <TouchableOpacity key={o} style={s.linha} onPress={() => salvar(o)}>
                      <Text style={[s.valor, { flex: 1 }]}>{o}{linha.un ? ` ${linha.un}` : ""}</Text>
                      {o === linha.valor(perfil) && <Feather name="check" size={15} color={HUD.verde} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <>
                  <TextInput autoFocus value={texto} onChangeText={(t) => { setTexto(t); setErro(""); }} keyboardType={linha.texto ? "default" : "decimal-pad"} style={s.campo} placeholderTextColor={HUD.suave} placeholder={linha.un ?? "Ex.: Lactose"} />
                  <TouchableOpacity style={s.botao} onPress={() => salvar(texto)}><Text style={s.botaoTxt}>Salvar no app do paciente</Text></TouchableOpacity>
                </>
              )}
              {!!erro && <Text style={[s.nota, { color: HUD.rosa }]}>{erro}</Text>}
              <TouchableOpacity onPress={() => setLinha(null)} style={{ alignItems: "center", padding: 8 }}><Text style={s.nota}>Cancelar</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </Vidro>
  );
}

const s = StyleSheet.create({
  linha: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11 },
  nota: { color: HUD.suave, fontSize: 13 },
  valor: { color: HUD.texto, fontSize: 13, fontWeight: "800", flexShrink: 1 },
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", padding: 24 },
  caixa: { backgroundColor: "#03130F", borderRadius: 20, borderWidth: 1, borderColor: HUD.borda, padding: 16, gap: 10 },
  titulo: { color: HUD.texto, fontSize: 16, fontWeight: "800" },
  campo: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14, borderWidth: 1, borderColor: HUD.borda, color: HUD.texto, padding: 12, fontSize: 16 },
  botao: { backgroundColor: HUD.verde, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  botaoTxt: { color: "#04130C", fontWeight: "800" },
});
