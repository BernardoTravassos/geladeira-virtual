import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registrarAgua } from "./agua";

/**
 * Ponte entre o app e o widget de água da tela inicial (Android).
 * O widget soma água sozinho com o app fechado; ao abrir, o app lê o que foi bebido por lá,
 * registra no dia e devolve ao widget o total certo. Em Expo Go ou sem o módulo nativo,
 * tudo isto é ignorado.
 */
export async function sincronizarWidgetAgua(metaMl: number) {
  if (Platform.OS !== "android") return;
  try {
    const { lerPropsDoWidget } = require("../../modules/widget-agua");
    const { default: widget } = require("../widgets/AguaWidget");

    const bruto = await lerPropsDoWidget("AguaWidget");
    const extra = bruto ? Number(JSON.parse(bruto)?.extra) || 0 : 0;
    if (extra > 0) await registrarAgua(extra);

    widget.updateSnapshot({ ml: await totalDeHoje(), extra: 0, meta: metaMl });
  } catch {
    // sem widget instalado ou sem build nativo: o app segue normal
  }
}

async function totalDeHoje(): Promise<number> {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const bruto = await AsyncStorage.getItem(`@geladeira:agua:${d.getFullYear()}-${mm}-${dd}`);
  try {
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.filter((n: unknown) => typeof n === "number").reduce((a: number, b: number) => a + b, 0) : 0;
  } catch {
    return 0;
  }
}
