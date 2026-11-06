// Paleta baseada no conceito visual do logo (verde = saúde/frescor)
export const colors = {
  primary: "#1F5D3A",      // verde-floresta principal
  primaryLight: "#3E8E5F", // verde de apoio (botões secundários, ícones ativos)
  accent: "#FF7A45",       // laranja quente — contraste para CTAs e destaques
  background: "#FAF9F4",   // off-white quente, fundo padrão
  surface: "#FFFFFF",      // cards, folhas de conteúdo
  textPrimary: "#1B1B1B",
  textSecondary: "#6B6B6B",
  border: "#E7E3D8",
};

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
