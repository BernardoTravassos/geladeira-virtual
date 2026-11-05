import React from "react";
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../theme/colors";

/**
 * O teclado numérico do iPhone NÃO tem tecla de "OK" nem de "Enter". Sem uma
 * saída, a pessoa digita a idade e fica presa: o botão "Continuar" some atrás
 * do teclado e nada o fecha. No Android o teclado numérico já traz a tecla de
 * confirmar, por isso a barra só existe no iOS.
 *
 * Como usar: renderize <BarraTeclado /> uma vez na tela e passe
 * `inputAccessoryViewID={ID_BARRA_TECLADO}` nos TextInput numéricos.
 */
export const ID_BARRA_TECLADO = "barra-teclado-numerico";

export default function BarraTeclado() {
  if (Platform.OS !== "ios") return null;

  return (
    <InputAccessoryView nativeID={ID_BARRA_TECLADO}>
      <View style={styles.barra}>
        <TouchableOpacity
          onPress={Keyboard.dismiss}
          hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Fechar o teclado"
        >
          <Text style={styles.texto}>OK</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "#F2F2F2",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  texto: { fontSize: 16, fontWeight: "700", color: colors.primary },
});
