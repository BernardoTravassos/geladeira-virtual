import { requireOptionalNativeModule } from "expo";

type Nativo = { lerProps(nome: string): Promise<string | null> };
const nativo = requireOptionalNativeModule<Nativo>("WidgetAgua");

/** JSON das props atuais do widget (só Android); null se não houver ou não estiver disponível. */
export async function lerPropsDoWidget(nome: string): Promise<string | null> {
  return nativo ? nativo.lerProps(nome) : null;
}
