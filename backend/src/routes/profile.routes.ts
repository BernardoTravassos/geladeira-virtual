import { Router } from "express";

export const profileRoutes = Router();

// POST /profile — salva as respostas do wizard (idade, sexo, objetivo etc.)
profileRoutes.post("/", async (req, res) => {
  // TODO: validar body, salvar/atualizar na tabela "perfis"
  res.status(201).json({ message: "Endpoint a implementar: salvar perfil" });
});

// GET /profile — retorna o perfil do usuário logado
profileRoutes.get("/", async (req, res) => {
  // TODO: buscar perfil pelo usuario_id do token JWT
  res.status(200).json({ message: "Endpoint a implementar: buscar perfil" });
});
