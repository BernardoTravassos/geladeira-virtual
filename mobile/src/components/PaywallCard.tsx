import { useCores } from "../theme/tema";
import type { Cores } from "../theme/colors";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated, Dimensions, Easing, Modal, PanResponder, View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";


type Props = {
  visivel: boolean;
  onFechar: () => void;
  onAssinar: () => void;
  /**
   * Preço já formatado. Precisa vir da loja (Apple/Google), que converte moeda
   * e aplica promoções — nunca escrito fixo no código. O valor abaixo é só
   * aparência de desenvolvimento, até a compra estar integrada.
   */
  preco?: string;
  consultasPorDia?: number;
  /**
   * Meta calórica da pessoa, vinda do perfil dela. Passe `undefined` quando o
   * perfil não carregou — é melhor um texto genérico que um número inventado.
   */
  metaCalorias?: number;
  /** Meta de proteína em gramas. É o número que importa para ganho de massa. */
  metaProteina?: number;
  objetivo?: string;
  tempoDisponivel?: string;
  /**
   * Dias de teste grátis. Exige configuração na loja (Apple/Google) — só
   * preencha quando a assinatura estiver integrada, senão é promessa falsa.
   */
  diasGratis?: number;
};

/**
 * Monta os benefícios a partir do perfil da pessoa.
 *
 * Regra que vale para qualquer texto daqui: fala do GANHO dela, não da
 * funcionalidade. "Histórico de consultas" é funcionalidade e ninguém paga por
 * isso; "aproveite o que vai estragar" é dinheiro que ela deixa de jogar fora.
 *
 * E tudo tem que ser verdade. Benefício que o app não entrega vira reprovação
 * na revisão da loja e pedido de reembolso.
 */
function montarBeneficios(opcoes: {
  metaCalorias?: number;
  metaProteina?: number;
  objetivo?: string;
  tempoDisponivel?: string;
}): string[] {
  const { metaCalorias, metaProteina, objetivo, tempoDisponivel } = opcoes;

  return [
    // 1. Resposta direta à parede que ela acabou de bater.
    "Quantos cardápios quiser, todo dia",

    // 2. O diferencial: o app conhece a meta dela. Um site de receitas não.
    beneficioDaMeta({ metaCalorias, metaProteina, objetivo }),

    // 3. A dor que mais dói, e que é dinheiro: comida estragando.
    //    "a qualquer hora" é o que SÓ o pago tem — no gratuito é 1 por dia.
    //    Sem esse trecho, a frase descreveria o plano gratuito também.
    "Nada estraga: reveja sua geladeira a qualquer hora",

    // 4. Encaixa na rotina real dela e remove a objeção silenciosa de
    //    "isso vai me mandar cozinhar por uma hora e meia".
    tempoDisponivel === "Pouco tempo"
      ? "Receitas rápidas, como você prefere"
      : "Receitas no tempo que você tem",
  ];
}

/**
 * O argumento da meta muda conforme o objetivo, porque o número que importa
 * muda — e para metade das pessoas não existe número nenhum:
 *
 *   Emagrecer       → caloria (o déficit é o que ela controla)
 *   Ganhar massa    → proteína (é nisso que ela presta atenção, não em kcal)
 *   Manter o peso   → nenhum número; ela não quer pensar nisso
 *   Comer saudável  → nenhum número; escolheu isso para NÃO contar nada
 *
 * Falar de caloria para quem quer músculo é falar a língua errada. E falar de
 * número para quem fugiu de número afasta.
 */
function beneficioDaMeta(opcoes: {
  metaCalorias?: number;
  metaProteina?: number;
  objetivo?: string;
}): string {
  const { metaCalorias, metaProteina, objetivo } = opcoes;

  if (objetivo === "Ganhar massa" && metaProteina) {
    return `Ajustados à sua meta de ${metaProteina}g de proteína`;
  }

  if (objetivo === "Emagrecer" && metaCalorias) {
    return `Ajustados à sua meta de ${metaCalorias} kcal`;
  }

  if (objetivo === "Manter o peso" || objetivo === "Comer mais saudável") {
    return "Equilibrados sem você precisar contar nada";
  }

  // Sem perfil carregado, ou objetivo que não conhecemos: nada de número
  // inventado — texto genérico e honesto.
  return objetivo
    ? `Ajustados ao seu objetivo de ${objetivo.toLowerCase()}`
    : "Ajustados à sua meta e ao seu objetivo";
}

/**
 * Painel que sobe quando o usuário do plano gratuito esgota as consultas do dia.
 *
 * Decisões de desenho, para quem for mexer depois:
 * - Sobe de baixo em vez de ocupar a tela toda: painel parece "um passo",
 *   tela cheia parece "fui bloqueado".
 * - O título diz o que ela usou, não o que perdeu ("Limite atingido" soa
 *   como punição).
 * - Três benefícios no máximo — mais que isso ninguém lê.
 * - Um botão só, com o preço escrito nele. Preço escondido gera desconfiança.
 * - A saída é visível e sem culpa. Esconder a saída irrita e desinstala.
 */
export default function PaywallCard({
  visivel,
  onFechar,
  onAssinar,
  preco = "R$ 14,90/mês",
  consultasPorDia = 1,
  metaCalorias,
  metaProteina,
  objetivo,
  tempoDisponivel,
  diasGratis,
}: Props) {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  // Arrastar o painel para baixo fecha. O gesto vale no painel inteiro (não só
  // no puxador): quem puxa pelo meio do card espera que ele desça também.
  const deslocamento = useRef(new Animated.Value(0)).current;
  const onFecharRef = useRef(onFechar);
  onFecharRef.current = onFechar;

  // O Modal do sistema só serve de "janela por cima de tudo": a animação é nossa.
  // Com animationType="slide" o sistema desliza a janela INTEIRA (fundo escuro
  // junto) depois que o card já saiu, e o fundo parecia sumir atrasado.
  const altura = Dimensions.get("window").height;
  const progresso = useRef(new Animated.Value(0)).current; // card: 0 = fora da tela, 1 = no lugar
  const [montado, setMontado] = useState(visivel);

  // Escuridão do fundo (0 = claro, 1 = escuro). Valor PRÓPRIO, movido à mão pelo
  // dedo durante o arrasto: não depende da animação nativa do card, então
  // acompanha o gesto quadro a quadro.
  const fundo = useRef(new Animated.Value(0)).current;
  const alturaPainel = useRef(430);

  useEffect(() => {
    if (visivel) {
      deslocamento.setValue(0); // reabre sempre na posição certa
      setMontado(true);
      Animated.timing(progresso, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      Animated.timing(fundo, { toValue: 1, duration: 260, useNativeDriver: false }).start();
    } else {
      Animated.timing(fundo, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      Animated.timing(progresso, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
        ({ finished }) => finished && setMontado(false),
      );
    }
  }, [visivel, deslocamento, progresso, fundo]);

  const posicaoPainel = Animated.add(
    deslocamento,
    progresso.interpolate({ inputRange: [0, 1], outputRange: [altura, 0] }),
  );

  const gesto = useMemo(
    () =>
      PanResponder.create({
        // Só assume o toque quando o movimento é claramente vertical para baixo;
        // assim os botões continuam recebendo toques normais.
        onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          const dy = Math.max(g.dy, 0);
          deslocamento.setValue(dy);
          // Fundo clareia na proporção do que o card já desceu do PRÓPRIO tamanho dele.
          fundo.setValue(1 - Math.min(dy / alturaPainel.current, 1));
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 120 || g.vy > 0.8) {
            Animated.timing(fundo, { toValue: 0, duration: 180, useNativeDriver: false }).start();
            Animated.timing(deslocamento, {
              toValue: altura,
              duration: 180,
              useNativeDriver: true,
            }).start(() => onFecharRef.current());
          } else {
            Animated.timing(fundo, { toValue: 1, duration: 180, useNativeDriver: false }).start();
            Animated.spring(deslocamento, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.timing(fundo, { toValue: 1, duration: 180, useNativeDriver: false }).start();
          Animated.spring(deslocamento, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [deslocamento, fundo, altura],
  );

  const plural = consultasPorDia === 1 ? "é 1 consulta" : `são ${consultasPorDia} consultas`;
  const beneficios = montarBeneficios({
    metaCalorias,
    metaProteina,
    objetivo,
    tempoDisponivel,
  });

  // Com teste grátis, o botão não pede dinheiro — pede para experimentar. É a
  // diferença entre "vou gastar" e "vou ver se presta".
  const textoBotao = diasGratis
    ? `Começar ${diasGratis} dias grátis`
    : `Assinar por ${preco}`;

  const rodape = diasGratis
    ? `Depois ${preco} · Cancele quando quiser`
    : "Cancele quando quiser";

  return (
    <Modal
      visible={montado}
      transparent
      animationType="none"
      onRequestClose={onFechar}
      statusBarTranslucent
    >
      {/* Toque fora fecha — gesto que todo mundo já espera de um painel. */}
      <View style={styles.fundo}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.escuro, { opacity: fundo }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} />
        {/* Toque dentro NÃO fecha: o Pressable interno absorve o evento. */}
        <Animated.View
          onLayout={(e) => { alturaPainel.current = e.nativeEvent.layout.height; }}
          style={[styles.painel, { paddingBottom: 28 + insets.bottom, transform: [{ translateY: posicaoPainel }] }]}
          {...gesto.panHandlers}
        >
          <Pressable style={styles.conteudo} onPress={() => {}}>
          <View style={styles.puxador} />

          <View style={styles.icone}>
            <Feather name="coffee" size={24} color={colors.textoSobreMarca} />
          </View>

          <Text style={styles.titulo}>Você usou sua consulta de hoje</Text>
          <Text style={styles.subtitulo}>
            No plano gratuito {plural} por dia. Libere o ilimitado e cozinhe com o
            que você já tem, quantas vezes quiser.
          </Text>

          <View style={styles.beneficios}>
            {beneficios.map((beneficio) => (
              <View key={beneficio} style={styles.beneficioLinha}>
                <View style={styles.beneficioMarca}>
                  <Feather name="check" size={12} color={colors.primary} />
                </View>
                <Text style={styles.beneficioTexto}>{beneficio}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.botaoAssinar}
            onPress={onAssinar}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={textoBotao}
          >
            <Text style={styles.botaoAssinarTexto}>{textoBotao}</Text>
          </TouchableOpacity>

          {/* Ancoragem: reduz a objeção do compromisso mensal. */}
          <Text style={styles.rodape}>{rodape}</Text>

          <TouchableOpacity
            onPress={onFechar}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.botaoDepois}>Volto amanhã (grátis)</Text>
          </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const criarStyles = (colors: Cores) => StyleSheet.create({
  fundo: {
    flex: 1,
    justifyContent: "flex-end",
  },
  escuro: { backgroundColor: "rgba(27, 27, 27, 0.55)" },
  painel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 28,
    alignItems: "center",
  },
  conteudo: { alignSelf: "stretch", alignItems: "center" },
  puxador: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 18,
  },
  icone: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  titulo: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitulo: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  beneficios: {
    alignSelf: "stretch",
    gap: 11,
    marginTop: 22,
    marginBottom: 24,
  },
  beneficioLinha: { flexDirection: "row", alignItems: "center", gap: 10 },
  beneficioMarca: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.verdeSuave,
    alignItems: "center",
    justifyContent: "center",
  },
  beneficioTexto: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  botaoAssinar: {
    alignSelf: "stretch",
    height: 52,
    backgroundColor: colors.botao,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoAssinarTexto: { color: colors.textoSobreMarca, fontSize: 15, fontWeight: "700" },
  rodape: { fontSize: 11, color: colors.textSecondary, marginTop: 10, textAlign: "center" },
  botaoDepois: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 16,
    paddingVertical: 4,
  },
});
