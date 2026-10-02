/**
 * Chaves de desenvolvimento.
 *
 * ⚠️ TODAS devem estar `false` num build de verdade. Elas existem só para você
 * conseguir ver e ajustar telas que dependem de condições difíceis de provocar
 * à mão.
 */
export const DEV = {
  /**
   * Força o card de assinatura a abrir sempre que você toca no botão da câmera,
   * sem depender do backend.
   *
   *  true  → toquei na câmera, o card abre. Serve para ajustar o visual.
   *  false → comportamento real: o card só aparece quando a API responde 429
   *          (limite diário atingido).
   */
  FORCAR_PAYWALL: true,
};
