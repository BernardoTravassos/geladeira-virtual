import { Linking, Share } from "react-native";

/**
 * Sala de vídeo do nutricionista com o paciente, no Jitsi Meet (código aberto):
 * vídeo, áudio, chat, compartilhar tela, levantar a mão e gravação, sem
 * biblioteca nativa, então vale para Android e iPhone.
 *
 * O nome da sala vem do id do vínculo, que os dois lados conhecem: quem tocar
 * em "entrar" cai na mesma sala. O id é imprevisível, então a sala não é
 * adivinhável.
 */
export function salaDoVinculo(vinculoId: string): string {
  return `GeladeiraVirtual-${vinculoId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
}

export function linkDaReuniao(vinculoId: string, nome?: string): string {
  const hash = nome ? `#userInfo.displayName=${encodeURIComponent(JSON.stringify(nome))}&config.prejoinPageEnabled=true` : "";
  return `https://meet.jit.si/${salaDoVinculo(vinculoId)}${hash}`;
}

export async function entrarNaReuniao(vinculoId: string, nome?: string): Promise<boolean> {
  try {
    await Linking.openURL(linkDaReuniao(vinculoId, nome));
    return true;
  } catch {
    return false;
  }
}

export async function compartilharReuniao(vinculoId: string, mensagem: string) {
  await Share.share({ message: `${mensagem}\n${linkDaReuniao(vinculoId)}` });
}
