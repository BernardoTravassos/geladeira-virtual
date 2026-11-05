import React, { useCallback, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../theme/colors";
import { grafico } from "../theme/graficos";

export type Serie = { nome: string; cor: string; valores: number[] };

type Props = {
  rotulos: string[];
  series: Serie[];
  unidade?: string;
  /** Linha horizontal de meta, para "quanto falta" ficar visível sem contas. */
  referencia?: { valor: number; rotulo: string };
};

const ALTURA = 116;
const DURACAO = 420;
const ATRASO_ENTRE_COLUNAS = 45;

/**
 * Colunas para uma ou duas séries sobre a MESMA unidade.
 *
 * Uma série  → sem legenda (o título da seção já diz o que é) e uma cor só.
 * Duas séries → legenda sempre presente, e um eixo só. Nunca dois eixos com
 * escalas diferentes: é o erro mais comum em gráfico de duas medidas e
 * transforma qualquer comparação em ilusão de ótica.
 *
 * A animação sobe as colunas da linha de base, em sequência da esquerda para a
 * direita. Ela reinicia a cada vez que a tela ganha foco — então abrir o
 * paciente sempre mostra o movimento.
 *
 * `useNativeDriver` fica desligado porque animamos altura, que a ponte nativa
 * não aceita. Com 14 colunas pequenas o custo é irrelevante; o driver nativo
 * só valeria com transform, que complicaria ancorar o crescimento na base.
 */
export default function GraficoColunas({ rotulos, series, unidade = "", referencia }: Props) {
  const progresso = useRef(rotulos.map(() => new Animated.Value(0))).current;

  useFocusEffect(
    useCallback(() => {
      progresso.forEach((v) => v.setValue(0));
      Animated.stagger(
        ATRASO_ENTRE_COLUNAS,
        progresso.map((v) =>
          Animated.timing(v, {
            toValue: 1,
            duration: DURACAO,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          })
        )
      ).start();
    }, [progresso])
  );

  const maximo = Math.max(...series.flatMap((s) => s.valores), referencia?.valor ?? 0, 1);
  const teto = Math.ceil(maximo / 500) * 500;
  const ultimo = rotulos.length - 1;

  return (
    <View>
      {series.length > 1 && (
        <View style={styles.legenda}>
          {series.map((s) => (
            <View key={s.nome} style={styles.legendaItem}>
              <View style={[styles.legendaMarca, { backgroundColor: s.cor }]} />
              {/* Texto nunca veste a cor da série — a marca ao lado é a identidade. */}
              <Text style={styles.legendaTexto}>{s.nome}</Text>
            </View>
          ))}
          <Text style={styles.escala}>
            máx. {teto.toLocaleString("pt-BR")} {unidade}
          </Text>
        </View>
      )}

      <View style={styles.area}>
        {referencia && (
          <View style={[styles.referencia, { bottom: 22 + (referencia.valor / teto) * ALTURA }]}>
            <View style={styles.referenciaLinha} />
            <Text style={styles.referenciaTexto}>{referencia.rotulo}</Text>
          </View>
        )}

        {rotulos.map((rotulo, i) => {
          const ehUltimo = i === ultimo;
          return (
            <View key={i} style={styles.grupo}>
              {ehUltimo && (
                // Rótulo direto só no dia de hoje: número em toda coluna vira
                // ruído e ninguém lê.
                <Text style={styles.rotuloDireto}>
                  {series[0].valores[i].toLocaleString("pt-BR")}
                </Text>
              )}
              <View style={styles.barras}>
                {series.map((s) => {
                  const alvo = s.valores[i] > 0 ? Math.max((s.valores[i] / teto) * ALTURA, 3) : 0;
                  return (
                    <Animated.View
                      key={s.nome}
                      style={[
                        styles.barra,
                        series.length === 1 && styles.barraLarga,
                        {
                          backgroundColor: s.cor,
                          height: progresso[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, alvo],
                          }),
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={[styles.dia, ehUltimo && styles.diaHoje]}>{rotulo}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legenda: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendaMarca: { width: 9, height: 9, borderRadius: 2 },
  legendaTexto: { fontSize: 11, color: colors.textSecondary },
  escala: { fontSize: 10, color: colors.textSecondary, marginLeft: "auto" },

  area: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: ALTURA + 34,
    borderBottomWidth: 1,
    borderBottomColor: grafico.eixo,
  },
  referencia: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 6 },
  referenciaLinha: { flex: 1, height: 1, backgroundColor: grafico.eixo },
  referenciaTexto: { fontSize: 9, color: colors.textSecondary },

  grupo: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  rotuloDireto: { fontSize: 9, fontWeight: "700", color: colors.textPrimary, marginBottom: 3 },
  // A folga de 2px é o que separa as barras — nunca um contorno.
  barras: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  barra: { width: 11, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barraLarga: { width: 18 },   // série única pode ocupar mais, ainda abaixo do teto de 24px
  dia: { fontSize: 10, color: colors.textSecondary, marginTop: 7 },
  diaHoje: { color: colors.textPrimary, fontWeight: "700" },
});
