import { createWidget } from "expo-widgets";
import { Column, Row, Text, Button } from "@expo/ui/jetpack-compose";
import { background, cornerRadius, fillMaxSize, fillMaxWidth, paddingAll } from "@expo/ui/jetpack-compose/modifiers";

/**
 * Estado do widget. Fica guardado no próprio widget (o toque no botão funciona com o app fechado):
 *   ml     total do dia `dia`, como o app mandou, mais o que foi bebido pelo widget
 *   dia    "AAAA-MM-DD" a que o total se refere
 *   pend   o que foi bebido PELO WIDGET desde a última vez que o app abriu, por dia (o app soma e zera)
 *   conta  a conta do app dona desses números
 *   meta   meta de água do dia, em ml
 */
export type PropsAgua = { ml: number; meta: number; dia?: string; pend?: Record<string, number>; conta?: string };

const AguaWidget = (props: PropsAgua) => {
  "widget";
  const litros = (ml: number) => (ml / 1000).toFixed(2).replace(".", ",");
  const pct = props.meta > 0 ? Math.min(100, Math.round((props.ml / props.meta) * 100)) : 0;
  // Tudo precisa estar dentro desta função: o widget roda isolado do resto do app.
  const beber = (ml: number) => {
    const d = new Date();
    const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const pend = props.pend || {};
    // Virou o dia sem o app abrir: o total recomeça, e o que ficou pendente continua no dia certo.
    const base = !props.dia || props.dia === hoje ? props.ml : 0;
    return { ml: base + ml, dia: hoje, pend: { ...pend, [hoje]: (pend[hoje] || 0) + ml } };
  };
  return (
    <Column modifiers={[fillMaxSize(), background("#1F5D3A"), cornerRadius(24), paddingAll(14)]}>
      <Text color="#BFE3FF">Água de hoje</Text>
      <Text color="#FFFFFF" style={{ fontSize: 26, fontWeight: "bold" }}>{`${litros(props.ml)} L`}</Text>
      <Text color="#DDEFE3">{`de ${litros(props.meta)} L · ${pct}%`}</Text>
      <Row modifiers={[fillMaxWidth()]}>
        <Button onClick={() => beber(250) as unknown as void}>+250 ml</Button>
        <Button onClick={() => beber(500) as unknown as void}>+500 ml</Button>
      </Row>
    </Column>
  );
};

export default createWidget<PropsAgua>("AguaWidget", AguaWidget, { ml: 0, meta: 2500 });
