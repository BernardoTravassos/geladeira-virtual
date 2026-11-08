import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useState, useMemo } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from "react-native";
import { Feather } from "@expo/vector-icons";


type Props = Omit<TextInputProps, "secureTextEntry"> & {
  value: string;
  onChangeText: (texto: string) => void;
};

/**
 * Campo de senha com o olhinho para revelar o que foi digitado.
 *
 * Existe como componente porque são 3 campos de senha em 2 telas — login,
 * nova senha e confirmação. Repetir o código três vezes garantiria que um dia
 * os três ficariam diferentes.
 *
 * Começa sempre oculto: a pessoa decide revelar. O contrário exporia a senha
 * para quem estiver olhando a tela por cima do ombro.
 */
export default function CampoSenha({ style, ...props }: Props) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [visivel, setVisivel] = useState(false);

  return (
    <View style={[styles.caixa, style]}>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={!visivel}
        {...props}
      />

      <TouchableOpacity
        onPress={() => setVisivel(!visivel)}
        style={styles.botao}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={visivel ? "Ocultar senha" : "Mostrar senha"}
      >
        <Feather
          name={visivel ? "eye-off" : "eye"}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  caixa: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    // Sem isto o texto fica desalinhado no Android.
    paddingVertical: 0,
  },
  botao: { padding: 8 },
});
