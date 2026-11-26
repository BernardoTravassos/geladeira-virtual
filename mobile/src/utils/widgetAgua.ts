import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registrarAgua } from "./agua";
import { chaveData } from "./dia";

/**
 * Ponte entre o app e o widget de água da tela inicial (Android).
 * O widget soma água sozinho com o app fechado; ao abrir, o app lê o que foi bebido por lá,
 * registra em cada dia e devolve ao widget o total certo. Em Expo Go ou sem o módulo nativo,
 * tudo isto é ignorado.
 */
let fila: Promise<void> = Promise.resolve();

/** Uma sincronização por vez: duas juntas somariam a mesma água duas vezes. */
export function sincronizarWidgetAgua(metaMl: number): Promise<void> {
  fila = fila.then(() => sincronizar(metaMl));
  return fila;
}

async function sincronizar(metaMl: number) {
  if (Platform.OS !== "android") return;
  try {
    const { lerPropsDoWidget } = require("../../modules/widget-agua");
    const { default: widget } = require("../widgets/AguaWidget");

    const conta = (await AsyncStorage.getItem("@geladeira:contaAtual")) ?? "";
    const bruto = await lerPropsDoWidget("AguaWidget");
    const props = bruto ? JSON.parse(bruto) : null;
    // Água marcada no widget por outra conta não entra nesta.
    if (props && (!props.conta || props.conta === conta)) {
      const pend: Record<string, number> = { ...(props.pend ?? {}) };
      for (const [dia, ml] of Object.entries(pend)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dia) && Number(ml) > 0) await registrarAgua(Number(ml), dia);
      }
    }

    const hoje = chaveData(new Date());
    widget.updateSnapshot({ ml: await totalDoDia(hoje), dia: hoje, pend: {}, conta, meta: metaMl });
  } catch {
    // sem widget instalado ou sem build nativo: o app segue normal
  }
}

async function totalDoDia(dia: string): Promise<number> {
  const bruto = await AsyncStorage.getItem(`@geladeira:agua:${dia}`);
  try {
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.filter((n: unknown) => typeof n === "number").reduce((a: number, b: number) => a + b, 0) : 0;
  } catch {
    return 0;
  }
}
