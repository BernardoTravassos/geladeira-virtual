import { createWidget } from "expo-widgets";
import { Column, Row, Text, Button } from "@expo/ui/jetpack-compose";
import { background, cornerRadius, fillMaxSize, fillMaxWidth, paddingAll } from "@expo/ui/jetpack-compose/modifiers";

/**
 * Estado do widget. Fica guardado no próprio widget (o toque no botão funciona com o app fechado):
 *   ml    total bebido hoje, como o app mandou, mais o que foi bebido pelo widget
 *   extra o que foi bebido PELO WIDGET desde a última vez que o app abriu (o app soma e zera)
 *   meta  meta de água do dia, em ml
 */
export type PropsAgua = { ml: number; extra: number; meta: number };

const AguaWidget = (props: PropsAgua) => {
  "widget";
  const litros = (ml: number) => (ml / 1000).toFixed(2).replace(".", ",");
  const pct = props.meta > 0 ? Math.min(100, Math.round((props.ml / props.meta) * 100)) : 0;
  return (
    <Column modifiers={[fillMaxSize(), background("#1F5D3A"), cornerRadius(24), paddingAll(14)]}>
      <Text color="#BFE3FF">Água de hoje</Text>
      <Text color="#FFFFFF" style={{ fontSize: 26, fontWeight: "bold" }}>{`${litros(props.ml)} L`}</Text>
      <Text color="#DDEFE3">{`de ${litros(props.meta)} L · ${pct}%`}</Text>
      <Row modifiers={[fillMaxWidth()]}>
        <Button onClick={() => ({ ml: props.ml + 250, extra: (props.extra || 0) + 250 }) as unknown as void}>+250 ml</Button>
        <Button onClick={() => ({ ml: props.ml + 500, extra: (props.extra || 0) + 500 }) as unknown as void}>+500 ml</Button>
      </Row>
    </Column>
  );
};

export default createWidget<PropsAgua>("AguaWidget", AguaWidget, { ml: 0, extra: 0, meta: 2500 });
