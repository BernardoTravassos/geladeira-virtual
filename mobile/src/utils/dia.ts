import { useEffect, useState } from "react";
import { AppState } from "react-native";

/** "2026-11-06" no fuso do aparelho. */
export function chaveData(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Devolve a data de hoje e MUDA quando o relógio vira a meia-noite — mesmo com
 * o app aberto. Telas que dependem de "hoje" usam isto como dependência dos
 * seus efeitos: quando vira o dia, recarregam e começam zeradas.
 *
 * Confere a cada 20 s (timers de horas são frágeis no celular) e também no
 * instante em que o app volta do segundo plano, que é quando a virada mais
 * costuma ser notada.
 */
export function useChaveDoDia(): string {
  const [chave, setChave] = useState(() => chaveData(new Date()));

  useEffect(() => {
    const conferir = () => setChave((atual) => {
      const nova = chaveData(new Date());
      return nova === atual ? atual : nova;
    });
    const intervalo = setInterval(conferir, 20000);
    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "active") conferir();
    });
    return () => {
      clearInterval(intervalo);
      assinatura.remove();
    };
  }, []);

  return chave;
}
