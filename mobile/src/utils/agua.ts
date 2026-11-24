import AsyncStorage from "@react-native-async-storage/async-storage";
import { gravarDia } from "./sincronizacao";
import { reagendarLembretes } from "./lembretes";

// Mesma chave que components/CardAgua.tsx usa: uma lista de goles (ml) por dia.
const chaveDoDia = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `@geladeira:agua:${d.getFullYear()}-${mm}-${dd}`;
};

/** Soma um gole ao que a pessoa já bebeu hoje. */
export async function registrarAgua(ml: number) {
  const chave = chaveDoDia();
  let lista: number[] = [];
  try {
    const bruto = await AsyncStorage.getItem(chave);
    const lido = bruto ? JSON.parse(bruto) : [];
    if (Array.isArray(lido)) lista = lido.filter((n: unknown) => typeof n === "number");
  } catch {
    // começa uma lista nova
  }
  await gravarDia(chave, JSON.stringify([...lista, ml]));
  reagendarLembretes();
}
