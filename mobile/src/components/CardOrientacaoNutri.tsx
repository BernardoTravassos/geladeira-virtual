import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { alimentoPorId } from "../data/alimentos";
import { useCores } from "../theme/tema";
import { sombra } from "../theme/colors";
import type { Cores } from "../theme/colors";
import { ORIENTACAO_NUTRICIONISTA as o, OrientacaoRefeicao } from "../mocks/orientacaoNutricionista";
import { detalharRefeicao, ItemPlano } from "../utils/refeicaoDetalhe";
import { aplicarEdicoes, carregarEdicoes, Edicoes, restaurarEdicao, salvarEdicao } from "../utils/planoNutri";
import DetalheRefeicaoModal from "./DetalheRefeicaoModal";

if (Platform.OS === "android") {
  // @ts-ignore — só existe na arquitetura antiga; na nova a chamada é ignorada.
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

/**
 * Card "Orientação da nutricionista" da Home. Começa aberto (é o conteúdo mais
 * importante da tela) e a seta no canto recolhe ou expande.
 */
export default function CardOrientacaoNutri() {
  const colors = useCores();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [aberto, setAberto] = useState(true);
  const [chaveAberta, setChaveAberta] = useState<string | null>(null);
  const [edicoes, setEdicoes] = useState<Edicoes>({});

  useEffect(() => {
    carregarEdicoes().then(setEdicoes);
  }, []);

  // O plano que a nutricionista definiu, com as alterações feitas por cima.
  const refeicoes = useMemo(() => aplicarEdicoes(o.refeicoes, edicoes), [edicoes]);
  const detalhe: OrientacaoRefeicao | null = refeicoes.find((r) => r.chave === chaveAberta) ?? null;
  const giro = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(giro, { toValue: aberto ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [aberto, giro]);

  function alternar() {
    LayoutAnimation.configureNext(LayoutAnimation.create(240, "easeInEaseOut", "opacity"));
    setAberto((a) => !a);
  }

  const rotacao = giro.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const m = o.metas;

  return (
    <View style={[styles.card, sombra]}>
      {/* Cabeçalho: sempre visível. Tocar em qualquer lugar dele abre/fecha. */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={alternar}
        style={styles.topo}
        accessibilityRole="button"
        accessibilityState={{ expanded: aberto }}
        accessibilityLabel={aberto ? "Recolher orientação da nutricionista" : "Expandir orientação da nutricionista"}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{o.nutricionista.iniciais}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Orientação da nutricionista</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {o.nutricionista.nome} · {o.nutricionista.crn}
          </Text>
        </View>
        <Animated.View style={[styles.seta, { transform: [{ rotate: rotacao }] }]}>
          <Feather name="chevron-down" size={18} color={colors.primary} />
        </Animated.View>
      </TouchableOpacity>

      {/* Resumo visível mesmo recolhido */}
      <View style={styles.recado}>
        <Text style={styles.recadoTxt} numberOfLines={aberto ? undefined : 2}>
          “{o.recado}”
        </Text>
        <Text style={styles.atualizado}>Atualizado {o.atualizadoEm}</Text>
      </View>

      {aberto && (
        <View style={styles.corpo}>
          <Secao titulo="Suas metas definidas" icone="target" colors={colors} styles={styles}>
            <View style={styles.metasGrade}>
              <Meta valor={m.calorias.toLocaleString("pt-BR")} rotulo="kcal/dia" styles={styles} destaque />
              <Meta valor={`${m.proteina} g`} rotulo="proteína" styles={styles} />
              <Meta valor={`${m.carboidrato} g`} rotulo="carboidrato" styles={styles} />
              <Meta valor={`${m.gordura} g`} rotulo="gordura" styles={styles} />
              <Meta valor={`${(m.aguaMl / 1000).toLocaleString("pt-BR")} L`} rotulo="água" styles={styles} />
            </View>
          </Secao>

          <Secao titulo="Plano de refeições" icone="clock" colors={colors} styles={styles}>
            {refeicoes.map((r, i) => {
              const t = detalharRefeicao(r.itens).total;
              return (
                <TouchableOpacity
                  key={r.chave}
                  activeOpacity={0.7}
                  onPress={() => setChaveAberta(r.chave)}
                  style={[styles.refeicao, i < refeicoes.length - 1 && styles.divisor]}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver detalhes: ${r.nome}`}
                >
                  <Text style={styles.hora}>{r.horario}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.refNome}>{r.nome}</Text>
                    <Text style={styles.refDesc}>
                      {edicoes[r.chave] ? descreverItens(r.itens) : r.sugestao}
                    </Text>
                    {edicoes[r.chave] && <Text style={styles.editadaTag}>Editada por você</Text>}
                    <Text style={styles.verDetalhes}>Ver alimentos, macros e vitaminas</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={styles.refKcal}>{t.kcal} kcal</Text>
                    <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </Secao>

          <Secao titulo="Faça" icone="check-circle" colors={colors} styles={styles}>
            {o.fazer.map((t) => (
              <Linha key={t} texto={t} icone="check" cor={colors.primary} styles={styles} />
            ))}
          </Secao>

          <Secao titulo="Evite" icone="x-circle" colors={colors} styles={styles}>
            {o.evitar.map((t) => (
              <Linha key={t} texto={t} icone="x" cor="#D6455D" styles={styles} />
            ))}
          </Secao>

          <Secao titulo="Suplementação" icone="package" colors={colors} styles={styles}>
            {o.suplementos.map((s, i) => (
              <View key={s.nome} style={[styles.suple, i < o.suplementos.length - 1 && styles.divisor]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.refNome}>{s.nome}</Text>
                  <Text style={styles.refDesc}>{s.quando}</Text>
                </View>
                <Text style={styles.dose}>{s.dose}</Text>
              </View>
            ))}
          </Secao>

          <Secao titulo="Sua semana" icone="bar-chart-2" colors={colors} styles={styles}>
            {o.semana.map((s) => (
              <View key={s.titulo} style={styles.semanaLinha}>
                <View style={styles.semanaTopo}>
                  <Text style={styles.refDesc}>{s.titulo}</Text>
                  <Text style={styles.semanaValor}>
                    {s.feito}/{s.total}
                  </Text>
                </View>
                <View style={styles.trilho}>
                  <View style={[styles.preenchido, { width: `${(s.feito / s.total) * 100}%` }]} />
                </View>
              </View>
            ))}
          </Secao>

          <View style={styles.consulta}>
            <View style={styles.consultaIcone}>
              <Feather name="calendar" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.refNome}>Próxima consulta</Text>
              <Text style={styles.refDesc}>
                {o.proximaConsulta.data} às {o.proximaConsulta.hora} · {o.proximaConsulta.local}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Rodapé com a mesma ação da seta, para quem já leu tudo e quer recolher */}
      <TouchableOpacity onPress={alternar} style={styles.rodape} activeOpacity={0.7} accessibilityRole="button">
        <Text style={styles.rodapeTxt}>{aberto ? "Mostrar menos" : "Ver orientação completa"}</Text>
        <Feather name={aberto ? "chevron-up" : "chevron-down"} size={14} color={colors.primary} />
      </TouchableOpacity>
      <DetalheRefeicaoModal
        refeicao={detalhe}
        editada={!!(detalhe && edicoes[detalhe.chave])}
        metaCalorias={m.calorias}
        onFechar={() => setChaveAberta(null)}
        onSalvar={async (chave: string, itens: ItemPlano[]) => setEdicoes(await salvarEdicao(chave, itens))}
        onRestaurar={async (chave: string) => setEdicoes(await restaurarEdicao(chave))}
      />
    </View>
  );
}

/** "Ovo, de galinha, inteiro, cru, Pão integral de forma" → usado quando a refeição foi editada. */
function descreverItens(itens: ItemPlano[]) {
  return itens
    .map((i) => alimentoPorId(i.alimentoId)?.nome.split(",")[0].trim() ?? "")
    .filter(Boolean)
    .join(", ");
}

type Estilos = ReturnType<typeof criarStyles>;

function Secao({ titulo, icone, children, colors, styles }: { titulo: string; icone: keyof typeof Feather.glyphMap; children: React.ReactNode; colors: Cores; styles: Estilos }) {
  return (
    <View style={styles.secao}>
      <View style={styles.secaoTopo}>
        <Feather name={icone} size={14} color={colors.primary} />
        <Text style={styles.secaoTitulo}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

function Meta({ valor, rotulo, styles, destaque }: { valor: string; rotulo: string; styles: Estilos; destaque?: boolean }) {
  return (
    <View style={[styles.meta, destaque && styles.metaDestaque]}>
      <Text style={[styles.metaValor, destaque && styles.metaValorDestaque]}>{valor}</Text>
      <Text style={[styles.metaRotulo, destaque && styles.metaRotuloDestaque]}>{rotulo}</Text>
    </View>
  );
}

function Linha({ texto, icone, cor, styles }: { texto: string; icone: keyof typeof Feather.glyphMap; cor: string; styles: Estilos }) {
  return (
    <View style={styles.linha}>
      <Feather name={icone} size={14} color={cor} style={{ marginTop: 2 }} />
      <Text style={styles.linhaTxt}>{texto}</Text>
    </View>
  );
}

const criarStyles = (colors: Cores) =>
  StyleSheet.create({
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16, gap: 12 },
    topo: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    avatarTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
    titulo: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
    sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    seta: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.verdeSuave, alignItems: "center", justifyContent: "center" },
    recado: { backgroundColor: colors.verdeSuave, borderRadius: 14, padding: 12, gap: 6 },
    recadoTxt: { fontSize: 13, lineHeight: 19, color: colors.textPrimary, fontStyle: "italic" },
    atualizado: { fontSize: 11, color: colors.textSecondary },
    corpo: { gap: 18, marginTop: 4 },
    secao: { gap: 8 },
    secaoTopo: { flexDirection: "row", alignItems: "center", gap: 6 },
    secaoTitulo: { fontSize: 12, fontWeight: "800", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.6 },
    metasGrade: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    meta: { flexGrow: 1, minWidth: "30%", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
    metaDestaque: { backgroundColor: colors.primary, borderColor: colors.primary, minWidth: "100%" },
    metaValor: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
    metaValorDestaque: { fontSize: 22, color: "#fff" },
    metaRotulo: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    metaRotuloDestaque: { color: "rgba(255,255,255,0.85)" },
    refeicao: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 10 },
    divisor: { borderBottomWidth: 1, borderBottomColor: colors.border },
    hora: { width: 44, fontSize: 13, fontWeight: "800", color: colors.primary, marginTop: 1 },
    refNome: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
    refDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
    editadaTag: { fontSize: 10, fontWeight: "800", color: colors.primary, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.4 },
    verDetalhes: { fontSize: 11, fontWeight: "700", color: colors.primary, marginTop: 4 },
    refKcal: { fontSize: 12, fontWeight: "700", color: colors.textPrimary, marginTop: 2 },
    linha: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
    linhaTxt: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.textPrimary },
    suple: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
    dose: { fontSize: 12, fontWeight: "700", color: colors.textPrimary },
    semanaLinha: { gap: 5 },
    semanaTopo: { flexDirection: "row", justifyContent: "space-between" },
    semanaValor: { fontSize: 12, fontWeight: "800", color: colors.textPrimary },
    trilho: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" },
    preenchido: { height: "100%", borderRadius: 3, backgroundColor: colors.primary },
    consulta: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
    consultaIcone: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.verdeSuave, alignItems: "center", justifyContent: "center" },
    rodape: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingTop: 4 },
    rodapeTxt: { fontSize: 12, fontWeight: "700", color: colors.primary },
  });
