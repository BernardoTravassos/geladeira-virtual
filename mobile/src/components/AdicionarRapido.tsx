import React, { useMemo } from "react";
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";

type Opcao = { chave: string; nome: string; horario: string; feita: boolean };

type Props = {
  visivel: boolean;
  onFechar: () => void;
  refeicoes: Opcao[];
  sugerida?: string;
  onAgua: (ml: number) => void;
  onRefeicao: (chave: string, abrirCamera: boolean) => void;
  onGeladeira: () => void;
};

const COPOS = [150, 250, 500];

/** Popup do botão central: registrar água ou uma refeição em um toque. */
export default function AdicionarRapido({ visivel, onFechar, refeicoes, sugerida, onAgua, onRefeicao, onGeladeira }: Props) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <TouchableWithoutFeedback onPress={onFechar}>
        <View style={styles.fundo}>
          <TouchableWithoutFeedback>
            <View style={[styles.folha, { paddingBottom: 24 + insets.bottom }]}>
              <View style={styles.topo}>
                <Text style={styles.titulo}>Adicionar</Text>
                <TouchableOpacity onPress={onFechar} accessibilityLabel="Fechar" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.secao}>Água</Text>
              <View style={styles.linha}>
                {COPOS.map((ml) => (
                  <TouchableOpacity key={ml} style={styles.copo} activeOpacity={0.8} onPress={() => onAgua(ml)} accessibilityRole="button" accessibilityLabel={`Beber ${ml} mililitros`}>
                    <Feather name="droplet" size={16} color="#35A7E8" />
                    <Text style={styles.copoTxt}>{ml} ml</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.secao}>Refeição</Text>
              {refeicoes.map((r) => (
                <View key={r.chave} style={styles.refeicao}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.refNome}>
                      {r.nome}
                      {r.chave === sugerida && !r.feita ? "  · agora" : ""}
                    </Text>
                    <Text style={styles.refInfo}>{r.feita ? "Já registrada" : r.horario}</Text>
                  </View>
                  <TouchableOpacity style={styles.mini} onPress={() => onRefeicao(r.chave, true)} accessibilityRole="button" accessibilityLabel={`Foto do prato: ${r.nome}`}>
                    <Feather name="camera" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mini} onPress={() => onRefeicao(r.chave, false)} accessibilityRole="button" accessibilityLabel={`Digitar alimentos: ${r.nome}`}>
                    <Feather name="edit-3" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.geladeira} onPress={onGeladeira} accessibilityRole="button">
                <Feather name="camera" size={16} color={colors.textSecondary} />
                <Text style={styles.geladeiraTxt}>Foto da geladeira</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  folha: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 8 },
  topo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  titulo: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  secao: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 8 },
  linha: { flexDirection: "row", gap: 10 },
  copo: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.verdeSuave },
  copoTxt: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  refeicao: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  refNome: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  refInfo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  mini: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.verdeSuave, alignItems: "center", justifyContent: "center" },
  geladeira: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, marginTop: 6 },
  geladeiraTxt: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
});
