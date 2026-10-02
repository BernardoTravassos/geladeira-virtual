import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { pool } from "../database";

export const profileRoutes = Router();

const perfilSchema = z.object({
  nome: z.string().min(1),
  idade: z.number().int().positive(),
  sexo: z.string(),
  alturaCm: z.number().int().positive(),
  pesoKg: z.number().positive(),
  objetivo: z.string(),
  praticaExercicio: z.boolean(),
  intolerancias: z.string().optional(),
  vegano: z.boolean(),
  preferenciaPreparo: z.string(),
  tempoDisponivel: z.string(),
});

function autenticar(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Token não enviado" });
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { usuarioId: string };
    req.usuarioId = payload.usuarioId;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

profileRoutes.post("/", autenticar, async (req: any, res) => {
  const parsed = perfilSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados inválidos", detalhes: parsed.error.flatten() });
  }
  const p = parsed.data;

  await pool.query(
    `INSERT INTO perfis
      (usuario_id, nome, idade, sexo, altura_cm, peso_kg, objetivo, pratica_exercicio, intolerancias, vegano, preferencia_preparo, tempo_disponivel, atualizado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
     ON CONFLICT (usuario_id) DO UPDATE SET
       nome = EXCLUDED.nome,
       idade = EXCLUDED.idade,
       sexo = EXCLUDED.sexo,
       altura_cm = EXCLUDED.altura_cm,
       peso_kg = EXCLUDED.peso_kg,
       objetivo = EXCLUDED.objetivo,
       pratica_exercicio = EXCLUDED.pratica_exercicio,
       intolerancias = EXCLUDED.intolerancias,
       vegano = EXCLUDED.vegano,
       preferencia_preparo = EXCLUDED.preferencia_preparo,
       tempo_disponivel = EXCLUDED.tempo_disponivel,
       atualizado_em = now()`,
    [
      req.usuarioId,
      p.nome,
      p.idade,
      p.sexo,
      p.alturaCm,
      p.pesoKg,
      p.objetivo,
      p.praticaExercicio,
      p.intolerancias || null,
      p.vegano,
      p.preferenciaPreparo,
      p.tempoDisponivel,
    ]
  );

  res.status(201).json({ message: "Perfil salvo com sucesso" });
});

profileRoutes.get("/", autenticar, async (req: any, res) => {
  const resultado = await pool.query("SELECT * FROM perfis WHERE usuario_id = $1", [req.usuarioId]);
  if (resultado.rows.length === 0) {
    return res.status(404).json({ error: "Perfil ainda não preenchido" });
  }
  res.status(200).json(resultado.rows[0]);
});