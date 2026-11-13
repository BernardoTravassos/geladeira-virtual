import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { gravarDia } from "../utils/sincronizacao";
import { useFocusEffect } from "@react-navigation/native";
import { sombra } from "../theme/colors";
import { useChaveDoDia } from "../utils/dia";

const AGUA = "#35A7E8";
const AGUA_ESCURA = "#1C86C6";
const LARGURA = 104;
const ALTURA = 148;
const LARGURA_ONDA = 260;

type Props = {
  /** Meta de água do dia em ml (calcularMetaAguaMl). */
  metaMl: number;
};

const chaveDoDia = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `@geladeira:agua:${d.getFullYear()}-${mm}-${dd}`;
};

const litros = (ml: number) => (ml / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

function mensagem(fracao: number, faltaMl: number) {
  if (fracao >= 1) return "Meta batida! Seu corpo agradece.";
  if (fracao === 0) return "Comece o dia com um copo d'água.";
  if (fracao < 0.25) return "Boa largada! Continue assim.";
  if (fracao < 0.5) return "Você está indo bem, siga o ritmo.";
  if (fracao < 0.75) return "Passou da metade! Falta pouco.";
  return `Quase lá: faltam só ${faltaMl} ml.`;
}

/**
 * Cartão de hidratação: um copo que enche de verdade, com ondas e bolhas.
 * O que a pessoa bebeu fica salvo por dia no aparelho (uma lista de goles, o
 * que permite desfazer o último toque sem zerar tudo).
 */
export default function CardAgua({ metaMl }: Props) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const meta = metaMl;
  const chaveDia = useChaveDoDia(); // vira à meia-noite e zera o copo
  const [goles, setGoles] = useState<number[]>([]);
  const total = goles.reduce((a, b) => a + b, 0);
  const fracao = Math.min(total / meta, 1);
  const batida = total >= meta;

  const nivel = useRef(new Animated.Value(0)).current;
  const pulso = useRef(new Animated.Value(1)).current;
  // Opacidade das ondas tem valor PRÓPRIO e nativo. Reusar `nivel` (que anima a
  // altura, via JS) prenderia o mesmo valor aos dois motores e quebraria a tela.
  const ondaOp = useRef(new Animated.Value(0)).current;
  const onda1 = useRef(new Animated.Value(0)).current;
  const onda2 = useRef(new Animated.Value(0)).current;
  const bolhas = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const gota = useRef(new Animated.Value(0)).current; // gota que cai no copo a cada gole
  const chapisco = useRef(new Animated.Value(0)).current; // a superfície "balança" quando a gota cai
  const anel = useRef(new Animated.Value(0)).current; // onda de luz da meta batida
  const faiscas = useRef([0, 1, 2, 3, 4, 5].map(() => new Animated.Value(0))).current;
  const checkEscala = useRef(new Animated.Value(batida ? 1 : 0)).current;
  const [exibido, setExibido] = useState(total); // número que "corre" até o valor novo
  const contador = useRef(new Animated.Value(total)).current;
  const jaCarregou = useRef(false);
  const eraBatida = useRef(false);

  // Carrega o que foi bebido hoje (e recarrega ao voltar para a tela).
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(chaveDoDia())
        .then((bruto) => {
          const lista = bruto ? JSON.parse(bruto) : [];
          const validos: number[] = Array.isArray(lista) ? lista.filter((n: unknown) => typeof n === "number") : [];
          // Já estava batida ao abrir o app: sem festa, ela só vale para o gole que bate a meta.
          eraBatida.current = validos.reduce((a, b) => a + b, 0) >= meta;
          jaCarregou.current = false; // o pulo de "carregou" não conta como gole
          setGoles(validos);
        })
        .catch(() => {})
        .finally(() => { setTimeout(() => { jaCarregou.current = true; }, 0); });
    }, [meta, chaveDia]),
  );

  // Ondas e bolhas rodam em loop, no thread nativo (não pesam a tela).
  useEffect(() => {
    const vai = (v: Animated.Value, duracao: number, atraso = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: duracao, delay: atraso, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: duracao, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    const a1 = vai(onda1, 2200);
    const a2 = vai(onda2, 3000, 400);
    a1.start();
    a2.start();
    const sobe = bolhas.map((b, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 700),
          Animated.timing(b, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(b, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    sobe.forEach((s) => s.start());
    return () => {
      a1.stop(); a2.stop();
      sobe.forEach((s) => s.stop());
    };
  }, [onda1, onda2, bolhas]);

  // O nível sobe suavemente sempre que o total muda.
  useEffect(() => {
    Animated.spring(nivel, { toValue: fracao, useNativeDriver: false, friction: 7, tension: 40 }).start();
  }, [fracao, nivel]);

  useEffect(() => {
    Animated.timing(ondaOp, { toValue: total > 0 ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [total > 0, ondaOp]); // eslint-disable-line react-hooks/exhaustive-deps

  // O número de litros corre até o valor novo em vez de trocar de repente.
  useEffect(() => {
    const id = contador.addListener(({ value }) => setExibido(value));
    return () => contador.removeListener(id);
  }, [contador]);
  useEffect(() => {
    Animated.timing(contador, { toValue: total, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [total, contador]);

  // O check aparece com uma mola; some se a meta deixar de estar batida (desfazer).
  useEffect(() => {
    Animated.spring(checkEscala, { toValue: batida ? 1 : 0, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [batida, checkEscala]);

  // Um "pulinho" no copo a cada gole e uma festa maior ao bater a meta.
  useEffect(() => {
    if (!jaCarregou.current) return;
    const festa = batida && !eraBatida.current;
    eraBatida.current = batida;
    if (total === 0) return;
    // Gota cai, a superfície balança e o copo dá um pulinho.
    gota.setValue(0);
    chapisco.setValue(0);
    Animated.timing(gota, { toValue: 1, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      Animated.sequence([
        Animated.timing(chapisco, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.spring(chapisco, { toValue: 0, friction: 4, tension: 90, useNativeDriver: true }),
      ]).start();
    });
    Animated.sequence([
      Animated.delay(380),
      Animated.spring(pulso, { toValue: festa ? 1.1 : 1.04, useNativeDriver: true, friction: 4 }),
      Animated.spring(pulso, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
    if (festa) {
      // Comemoração contida: um anel de luz que se abre e algumas gotinhas que sobem e somem.
      anel.setValue(0);
      faiscas.forEach((f) => f.setValue(0));
      Animated.parallel([
        Animated.timing(anel, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ...faiscas.map((f, i) =>
          Animated.timing(f, { toValue: 1, duration: 1000, delay: 250 + i * 70, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ),
      ]).start();
    }
  }, [total]); // eslint-disable-line react-hooks/exhaustive-deps

  function salvar(lista: number[]) {
    setGoles(lista);
    gravarDia(chaveDoDia(), JSON.stringify(lista)).catch(() => {});
  }
  const beber = (ml: number) => salvar([...goles, ml]);
  const desfazer = () => salvar(goles.slice(0, -1));

  const alturaAgua = nivel.interpolate({ inputRange: [0, 1], outputRange: [0, ALTURA - 6] });
  const falta = Math.max(meta - total, 0);

  return (
    <View style={[styles.card, batida && styles.cardBatido]}>
      <View style={styles.linha}>
        <View style={styles.palco}>
          {/* Anel de luz e gotinhas da meta batida: ficam fora do copo, que corta o que passa da borda */}
          <Animated.View
            pointerEvents="none"
            style={[styles.anel, { opacity: anel.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.55, 0] }), transform: [{ scale: anel.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.35] }) }] }]}
          />
          {faiscas.map((f, i) => {
            const ang = (-90 + (i - 2.5) * 34) * (Math.PI / 180);
            const raio = 62 + (i % 2) * 14;
            return (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={[
                  styles.faisca,
                  {
                    opacity: f.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 0.9, 0.7, 0] }),
                    transform: [
                      { translateX: f.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * raio] }) },
                      { translateY: f.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * raio] }) },
                      { scale: f.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 0.6] }) },
                    ],
                  },
                ]}
              />
            );
          })}
        <Animated.View style={[styles.copo, { transform: [{ scale: pulso }] }]}>
          <Animated.View
            pointerEvents="none"
            style={[styles.gota, { opacity: gota.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: gota.interpolate({ inputRange: [0, 1], outputRange: [0, ALTURA * (1 - fracao) - 12] }) }] }]}
          />
          <Animated.View style={[styles.agua, { height: alturaAgua }]}>
            <Animated.View
              style={[styles.onda, { opacity: ondaOp, transform: [{ scaleY: chapisco.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }, { translateX: onda1.interpolate({ inputRange: [0, 1], outputRange: [-20, -90] }) }] }]}
            />
            <Animated.View
              style={[styles.onda, styles.onda2, { opacity: ondaOp, transform: [{ translateX: onda2.interpolate({ inputRange: [0, 1], outputRange: [-100, -30] }) }] }]}
            />
            {bolhas.map((b, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.bolha,
                  {
                    left: 18 + i * 28,
                    width: 6 + (i % 2) * 3,
                    height: 6 + (i % 2) * 3,
                    opacity: b.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.8, 0.8, 0] }),
                    transform: [{ translateY: b.interpolate({ inputRange: [0, 1], outputRange: [0, -Math.max(ALTURA * fracao - 24, 0)] }) }],
                  },
                ]}
              />
            ))}
          </Animated.View>
          {total === 0 && <Feather name="droplet" size={26} color="#B9DDF3" style={styles.gotaVazia} />}
          <Animated.View pointerEvents="none" style={[styles.check, { opacity: checkEscala, transform: [{ scale: checkEscala }] }]}>
            <Feather name="check" size={34} color="#fff" />
          </Animated.View>
        </Animated.View>
        </View>

        <View style={styles.info}>
          <View style={styles.titulo}>
            <Feather name="droplet" size={14} color={AGUA_ESCURA} />
            <Text style={styles.tituloTxt}>Hidratação</Text>
          </View>
          <Text style={styles.valor}>
            {litros(exibido)} <Text style={styles.valorUn}>L</Text>
          </Text>
          <Text style={styles.sub}>
            de {litros(meta)} L · {Math.round((total / meta) * 100)}%
          </Text>
          <Text style={[styles.msg, batida && styles.msgBatida]}>{mensagem(fracao, falta)}</Text>
        </View>
      </View>

      <View style={styles.botoes}>
        <TouchableOpacity style={styles.principal} activeOpacity={0.85} onPress={() => beber(250)} accessibilityLabel="Beber um copo de 250 mililitros">
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.principalTxt}>Copo 250 ml</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => beber(500)} accessibilityLabel="Beber 500 mililitros">
          <Text style={styles.chipTxt}>+500</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => beber(100)} accessibilityLabel="Beber 100 mililitros">
          <Text style={styles.chipTxt}>+100</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, goles.length === 0 && { opacity: 0.35 }]}
          disabled={goles.length === 0}
          onPress={desfazer}
          accessibilityLabel="Desfazer o último"
        >
          <Feather name="rotate-ccw" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.nota}>Meta calculada pelo seu peso e nível de atividade.</Text>
    </View>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 14, ...sombra },
  cardBatido: { borderColor: AGUA },
  linha: { flexDirection: "row", alignItems: "center", gap: 18 },
  palco: { width: LARGURA, height: ALTURA, alignItems: "center", justifyContent: "center" },
  anel: { position: "absolute", width: LARGURA + 8, height: ALTURA + 8, borderRadius: 34, borderWidth: 3, borderColor: AGUA },
  faisca: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: AGUA },
  gota: { position: "absolute", top: 0, width: 8, height: 11, borderRadius: 5, backgroundColor: AGUA_ESCURA, alignSelf: "center", zIndex: 2 },
  copo: {
    width: LARGURA,
    height: ALTURA,
    borderWidth: 3,
    borderColor: colors.aguaBorda,
    backgroundColor: colors.aguaFundo,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  agua: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: AGUA },
  onda: { position: "absolute", top: -9, left: 0, width: LARGURA_ONDA, height: 18, borderRadius: 9, backgroundColor: AGUA },
  onda2: { backgroundColor: "rgba(28,134,198,0.4)", top: -6 },
  bolha: { position: "absolute", bottom: 6, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.75)" },
  gotaVazia: { position: "absolute", top: ALTURA / 2 - 20 },
  check: { position: "absolute", top: ALTURA / 2 - 24 },
  info: { flex: 1, gap: 2 },
  titulo: { flexDirection: "row", alignItems: "center", gap: 6 },
  tituloTxt: { fontSize: 13, fontWeight: "700", color: AGUA_ESCURA },
  valor: { fontSize: 36, fontWeight: "800", color: colors.textPrimary, marginTop: 2 },
  valorUn: { fontSize: 16, fontWeight: "700", color: colors.textSecondary },
  sub: { fontSize: 12, color: colors.textSecondary },
  msg: { fontSize: 13, color: colors.textPrimary, marginTop: 8, lineHeight: 18 },
  msgBatida: { color: colors.sucessoTexto, fontWeight: "700" },
  botoes: { flexDirection: "row", alignItems: "center", gap: 8 },
  principal: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, borderRadius: 12, backgroundColor: AGUA_ESCURA },
  principalTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  chip: { minWidth: 44, height: 44, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.aguaChip, alignItems: "center", justifyContent: "center" },
  chipTxt: { color: AGUA_ESCURA, fontWeight: "700", fontSize: 13 },
  nota: { fontSize: 11, color: colors.textSecondary, marginTop: -4 },
});
