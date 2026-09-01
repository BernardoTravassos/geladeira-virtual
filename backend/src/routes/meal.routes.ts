import { Router } from "express";
import multer from "multer";

export const mealRoutes = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /meals/generate — recebe a foto, monta o prompt com o perfil do usuário e chama a IA
mealRoutes.post("/generate", upload.single("photo"), async (req, res) => {
  // TODO:
  // 1. Checar limite diário do plano gratuito
  // 2. Buscar perfil do usuário no banco
  // 3. Montar prompt (instruções fixas + perfil + foto)
  // 4. Chamar a API da IA
  // 5. Salvar resposta na tabela "consultas"
  // 6. Devolver o cardápio pro app
  res.status(200).json({ message: "Endpoint a implementar: gerar cardápio" });
});
