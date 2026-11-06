import type { RegraNumero } from "./numeros";

// Faixas e opções do perfil num só lugar: o wizard e a tela de perfil têm que
// aceitar exatamente os mesmos valores (e os mesmos que o backend, PerfilRequest.cs).
export const REGRAS: Record<"idade" | "alturaCm" | "pesoKg", RegraNumero> = {
  idade: { artigoRotulo: "A idade", min: 13, max: 120, inteiro: "baixo" },
  alturaCm: {
    artigoRotulo: "A altura",
    min: 50,
    max: 250,
    unidade: "cm",
    inteiro: "proximo",
    outraUnidade: {
      menorQue: 3,
      mensagem:
        "Formato incorreto: a altura deve ser informada em centímetros, " +
        "como 175 — e não em metros (1,75).",
    },
  },
  pesoKg: { artigoRotulo: "O peso", min: 20, max: 400, unidade: "kg", casas: 1 },
};

export const OPCOES_INTOLERANCIA = [
  "Lactose",
  "Glúten",
  "Frutose",
  "Ovo",
  "Soja",
  "Amendoim",
  "Castanhas e nozes",
  "Frutos do mar",
  "Outra",
];
