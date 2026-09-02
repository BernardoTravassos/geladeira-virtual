import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../database";

export const authRoutes = Router();

const credenciaisSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});

authRoutes.post("/register", async (req, res) => {
  const parsed = credenciaisSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados inválidos" });
  }
  const { email, senha } = parsed.data;

  const existente = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);
  if (existente.rows.length > 0) {
    return res.status(409).json({ error: "E-mail já cadastrado" });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const resultado = await pool.query(
    "INSERT INTO usuarios (email, senha_hash) VALUES ($1, $2) RETURNING id",
    [email, senhaHash]
  );
  const usuarioId = resultado.rows[0].id;

  // Já cria o registro de assinatura no plano gratuito
  await pool.query(
    "INSERT INTO assinaturas (usuario_id, plano) VALUES ($1, 'gratuito')",
    [usuarioId]
  );

  const token = jwt.sign({ usuarioId }, process.env.JWT_SECRET!, { expiresIn: "30d" });
  res.status(201).json({ token });
});

authRoutes.post("/login", async (req, res) => {
  const parsed = credenciaisSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados inválidos" });
  }
  const { email, senha } = parsed.data;

  const resultado = await pool.query(
    "SELECT id, senha_hash FROM usuarios WHERE email = $1",
    [email]
  );
  const usuario = resultado.rows[0];

  if (!usuario) {
    return res.status(401).json({ error: "E-mail ou senha incorretos" });
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
  if (!senhaCorreta) {
    return res.status(401).json({ error: "E-mail ou senha incorretos" });
  }

  const token = jwt.sign({ usuarioId: usuario.id }, process.env.JWT_SECRET!, { expiresIn: "30d" });
  res.status(200).json({ token });
});