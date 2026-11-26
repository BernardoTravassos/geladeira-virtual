import React, { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ALIMENTOS, alimentoDoItem } from "../../data/alimentos";
import { filtrarAlimentos } from "../../utils/buscaAlimentos";
import type { ItemPrato } from "../../utils/refeicoes";
import { HUD } from "./hud";

/** Lista de alimentos com − / + / remover e busca para adicionar. */
export default function EditorItens({ itens, aoGramas, aoRemover, aoAdicionar }: {
  itens: ItemPrato[];
  aoGramas: (alimentoId: string, delta: number) => void;
  aoRemover: (alimentoId: string) => void;
  aoAdicionar: (alimentoId: string, gramas: number) => void;
}) {
  const [buscando, setBuscando] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      {itens.map((it) => {
        const nome = alimentoDoItem(it)?.nome ?? "Alimento do paciente";
        return (
          <View key={it.alimentoId} style={s.item}>
            <View style={{ flex: 1 }}>
              <Text style={s.nome} numberOfLines={2}>{nome}</Text>
              <Text style={s.nota}>{it.gramas} g</Text>
            </View>
            <Botao icone="minus" rotulo={`Diminuir ${nome}`} onPress={() => aoGramas(it.alimentoId, -10)} />
            <Botao icone="plus" rotulo={`Aumentar ${nome}`} onPress={() => aoGramas(it.alimentoId, 10)} />
            <Botao icone="trash-2" rotulo={`Remover ${nome}`} cor={HUD.rosa} onPress={() => aoRemover(it.alimentoId)} />
          </View>
        );
      })}
      <TouchableOpacity style={s.adicionar} onPress={() => setBuscando(true)} accessibilityRole="button">
        <Feather name="plus-circle" size={15} color={HUD.verde} /><Text style={s.adicionarTxt}>Adicionar alimento</Text>
      </TouchableOpacity>
      {buscando && <Busca aoFechar={() => setBuscando(false)} aoEscolher={(id, g) => { aoAdicionar(id, g); setBuscando(false); }} />}
    </View>
  );
}

function Busca({ aoFechar, aoEscolher }: { aoFechar: () => void; aoEscolher: (id: string, gramas: number) => void }) {
  const [busca, setBusca] = useState("");
  const lista = useMemo(() => (busca.trim().length < 2 ? [] : filtrarAlimentos(ALIMENTOS, busca, null).slice(0, 30)), [busca]);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={aoFechar}>
      <KeyboardAvoidingView style={s.fundo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.folha}>
          <View style={s.topo}>
            <Text style={[s.nome, { flex: 1, fontSize: 16 }]}>Adicionar alimento</Text>
            <TouchableOpacity onPress={aoFechar} accessibilityLabel="Fechar"><Feather name="x" size={20} color={HUD.suave} /></TouchableOpacity>
          </View>
          <TextInput autoFocus value={busca} onChangeText={setBusca} placeholder="Buscar (ex.: arroz)" placeholderTextColor={HUD.suave} style={s.campo} />
          <FlatList
            data={lista}
            keyExtractor={(a) => a.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={s.nota}>{busca.trim().length < 2 ? "Digite pelo menos 2 letras." : "Nada encontrado."}</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.opcao} onPress={() => aoEscolher(item.id, item.porcaoPadrao || 100)}>
                <Text style={[s.nome, { flex: 1 }]}>{item.nome}</Text>
                <Text style={s.nota}>{item.porcaoPadrao || 100} g</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Botao({ icone, rotulo, onPress, cor }: { icone: any; rotulo: string; onPress: () => void; cor?: string }) {
  return (
    <TouchableOpacity style={s.botao} onPress={onPress} accessibilityRole="button" accessibilityLabel={rotulo}>
      <Feather name={icone} size={15} color={cor ?? HUD.texto} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", gap: 6 },
  nome: { color: HUD.texto, fontSize: 13, fontWeight: "700" },
  nota: { color: HUD.suave, fontSize: 12 },
  botao: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: HUD.borda, alignItems: "center", justifyContent: "center" },
  adicionar: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  adicionarTxt: { color: HUD.verde, fontSize: 13, fontWeight: "800" },
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  folha: { height: "75%", backgroundColor: "#03130F", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, gap: 10 },
  topo: { flexDirection: "row", alignItems: "center", gap: 8 },
  campo: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14, borderWidth: 1, borderColor: HUD.borda, color: HUD.texto, padding: 12, fontSize: 15 },
  opcao: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: HUD.borda },
});
