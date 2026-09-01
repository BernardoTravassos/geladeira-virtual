import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRoutes } from "./routes/auth.routes";
import { profileRoutes } from "./routes/profile.routes";
import { mealRoutes } from "./routes/meal.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Rota de verificação — confirma que a API está no ar
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/meals", mealRoutes);

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`Geladeira Virtual API rodando na porta ${PORT}`);
});
