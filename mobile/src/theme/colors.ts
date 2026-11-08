// Paleta baseada no conceito visual do logo (verde = saúde/frescor).
// Há duas versões: clara e escura. As telas NÃO importam `colors` direto: usam
// useCores() (theme/tema.tsx), que devolve a paleta do modo atual.

export type Cores = {
  primary: string;
  primaryLight: string;
  accent: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  /** Fundo de botões principais (com texto `textoSobreMarca`). */
  botao: string;
  /** Texto sobre botões e áreas na cor da marca. */
  textoSobreMarca: string;
  verdeSuave: string;
  sucessoFundo: string;
  sucessoTexto: string;
  avisoFundo: string;
  avisoTexto: string;
  erroFundo: string;
  erroTexto: string;
  erroBorda: string;
  fundoSuave: string;
  trilha: string;
  eixo: string;
  aguaFundo: string;
  aguaBorda: string;
  aguaChip: string;
  barraTeclado: string;
};

export const coresClaras: Cores = {
  primary: "#1F5D3A",      // verde-floresta principal
  primaryLight: "#3E8E5F", // verde de apoio
  accent: "#FF7A45",       // laranja quente — contraste para CTAs e destaques
  background: "#FAF9F4",   // off-white quente, fundo padrão
  surface: "#FFFFFF",      // cards, folhas de conteúdo
  textPrimary: "#1B1B1B",
  textSecondary: "#6B6B6B",
  border: "#E7E3D8",
  botao: "#1F5D3A",
  textoSobreMarca: "#FAF9F4",
  verdeSuave: "#EAF3E4",
  sucessoFundo: "#E3F6EE",
  sucessoTexto: "#1E5E34",
  avisoFundo: "#FFF4DC",
  avisoTexto: "#6B4500",
  erroFundo: "#FDECEA",
  erroTexto: "#C0392B",
  erroBorda: "#F0C4BF",
  fundoSuave: "#F1EFE6",
  trilha: "#EDEAE1",
  eixo: "#D9D4C7",
  aguaFundo: "#F2F9FD",
  aguaBorda: "#BFE2F6",
  aguaChip: "#EAF5FC",
  barraTeclado: "#F2F2F2",
};

// Modo noturno: fundo verde-grafite (não preto puro, que cansa mais e "vibra"),
// verdes mais claros para texto e ícones (o verde-floresta sumiria no escuro) e
// fundos suaves translúcidos no lugar dos pastéis.
export const coresEscuras: Cores = {
  primary: "#4CB07F",
  primaryLight: "#5CC48F",
  accent: "#FF8A57",
  background: "#0F1612",
  surface: "#18221C",
  textPrimary: "#EEF3EE",
  textSecondary: "#9DB1A5",
  border: "#2A3A31",
  botao: "#2E8057",
  textoSobreMarca: "#FFFFFF",
  verdeSuave: "#1F3629",
  sucessoFundo: "#173A2B",
  sucessoTexto: "#7EE0B5",
  avisoFundo: "#3B3018",
  avisoTexto: "#F2CB80",
  erroFundo: "#3D1F1D",
  erroTexto: "#FF8F85",
  erroBorda: "#6B2F2B",
  fundoSuave: "#202C25",
  trilha: "#2A3A31",
  eixo: "#34463B",
  aguaFundo: "#14232B",
  aguaBorda: "#285064",
  aguaChip: "#1B3340",
  barraTeclado: "#1F2A24",
};

/** Paleta clara, para código fora de componentes. Em telas, use useCores(). */
export const colors = coresClaras;

// Sombra suave e esverdeada, para os cartões "flutuarem" sobre o fundo.
export const sombra = {
  shadowColor: "#1F5D3A",
  shadowOpacity: 0.1,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
} as const;

// Verde mais fundo, para dar profundidade aos degradês de destaque.
export const degrade = {
  hero: ["#17482D", "#1F5D3A", "#2F7B50"] as const,
  acento: ["#FF8A57", "#F2622B"] as const,
};
