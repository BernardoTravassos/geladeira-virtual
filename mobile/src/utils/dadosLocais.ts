import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAVE_CONTA = "@geladeira:contaAtual";
const PREFIXOS = ["@geladeira:refeicoes:", "@geladeira:agua:", "@geladeira:treinos:"];
const CHAVES_FIXAS = ["@geladeira:perfilDemo"];

/**
 * Os registros (refeições, água, treinos) ficam no aparelho e NÃO são separados
 * por conta. Sem esta limpeza, quem criava um login novo no mesmo celular
 * herdava o histórico da conta anterior.
 *
 * Apaga os registros locais quando a conta é NOVA (cadastro) ou quando entra
 * uma conta diferente da anterior. A conexão do smartwatch é do aparelho e fica.
 */
export async function prepararDadosLocais(email: string, contaNova: boolean) {
  try {
    const anterior = await AsyncStorage.getItem(CHAVE_CONTA);
    if (contaNova || (anterior && anterior !== email)) {
      const todas = await AsyncStorage.getAllKeys();
      const alvo = todas.filter((k) => PREFIXOS.some((p) => k.startsWith(p)) || CHAVES_FIXAS.includes(k));
      if (alvo.length) await AsyncStorage.multiRemove(alvo);
    }
    await AsyncStorage.setItem(CHAVE_CONTA, email);
  } catch {
    // sem acesso ao armazenamento: o app segue, só sem a limpeza
  }
}
