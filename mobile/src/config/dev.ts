/**
 * Chaves de desenvolvimento.
 *
 * ⚠️ TODAS devem estar `false` num build de verdade. Elas existem só para você
 * conseguir ver e ajustar telas que dependem de condições difíceis de provocar
 * à mão.
 */
export const DEV = {
  /**
   * Modo demonstração para mostrar o app ao cliente sem backend.
   *
   *  true  → login, cadastro, wizard e recuperação de senha funcionam com
   *          qualquer dado, sem chamar a API. O perfil fica só no aparelho.
   *  false → chama a API de verdade.
   *
   * ⚠️ Nunca publique com `true`: qualquer senha passaria a entrar.
   */
  MODO_DEMO: true,

  /**
   * Força o card de assinatura a abrir sempre que você toca no botão da câmera,
   * sem depender do backend.
   *
   *  true  → toquei na câmera, o card abre. Serve para ajustar o visual.
   *  false → comportamento real: o card só aparece quando a API responde 429
   *          (limite diário atingido).
   */
  FORCAR_PAYWALL: true,

  /**
   * Finge o backend de recuperação de senha, para você percorrer as telas
   * antes de os endpoints existirem (eles nascem na Fase 2, em C#).
   *
   *  true  → "Enviar código" sempre dá certo e o código 000000 é aceito.
   *  false → chama a API de verdade.
   */
  SIMULAR_RECUPERACAO_SENHA: false,

  /**
   * Finge a IA que reconhece o prato, para mostrar a tela ao cliente sem
   * gastar com a API da Anthropic.
   *
   *  true  → qualquer foto "é reconhecida" como um prato pronto (arroz, feijão,
   *          frango...), sem chamar o servidor. Os valores NÃO vêm da foto.
   *  false → envia a foto para o backend (/meals/analyze).
   *
   * ⚠️ Desligue antes de publicar: seria mostrar dados falsos como se fossem reais.
   */
  SIMULAR_IA_PRATO: true,
};
