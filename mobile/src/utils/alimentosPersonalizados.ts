import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Alimento } from "../data/alimentos";
import { apagarPersonalizadoNoServidor, enviarPersonalizado } from "./catalogoServidor";

/**
 * Alimentos que a pessoa criou por não achar no catálogo. Ficam neste aparelho e também no servidor (ver catalogoServidor.ts).
 * (A refeição já registrada leva uma cópia do alimento dentro dela — ver
 * `alimentoDoItem` — então o que ela comeu não se perde.)
 */
const CHAVE = "@geladeira:alimentosPersonalizados";

export async function carregarPersonalizados(): Promise<Alimento[]> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Alimento[]) : [];
  } catch {
    return [];
  }
}

async function guardar(lista: Alimento[]) {
  await AsyncStorage.setItem(CHAVE, JSON.stringify(lista));
}

export async function adicionarPersonalizado(al: Alimento): Promise<Alimento[]> {
  const lista = [...(await carregarPersonalizados()), al];
  await guardar(lista);
  enviarPersonalizado(al); // espelha no servidor, sem esperar
  return lista;
}

/** Esconde da lista, sem apagar: refeições antigas que o usam continuam corretas. */
export async function ocultarPersonalizado(id: string): Promise<Alimento[]> {
  const lista = (await carregarPersonalizados()).map((x) => (x.id === id ? { ...x, oculto: true } : x));
  await guardar(lista);
  apagarPersonalizadoNoServidor(id);
  return lista;
}
