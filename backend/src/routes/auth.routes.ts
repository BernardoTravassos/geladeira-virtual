import { Router } from "express";

export const authRoutes = Router();

// POST /auth/register — cria o usuário com e-mail e senha
authRoutes.post("/register", async (req, res) => {
  // TODO: validar body com zod, checar e-mail duplicado, gerar hash da senha
  res.status(201).json({ message: "Endpoint a implementar: cadastro" });
});

// POST /auth/login — autentica e devolve um token JWT
authRoutes.post("/login", async (req, res) => {
  // TODO: validar credenciais, gerar JWT e devolver pro app
  res.status(200).json({ message: "Endpoint a implementar: login" });
});
