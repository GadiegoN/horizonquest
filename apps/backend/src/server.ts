import { projectsRouter, journalRouter, tavernRouter } from "./routes/community";
import express, { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "./lib/workflow";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { profileRouter } from "./routes/profile";
import { questsRouter } from "./routes/quests";
import { classesRouter } from "./routes/classes";
import { shopRouter } from "./routes/shop";

export const app = express();
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/profile", profileRouter);
app.use("/quests", questsRouter);
app.use("/classes", classesRouter);
app.use("/projects", projectsRouter);
app.use("/journal", journalRouter);
app.use("/tavern", tavernRouter);
app.use("/shop", shopRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_, res) => res.send("Horizon Quest API"));

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res
      .status(400)
      .json({ error: err.issues.map((issue) => issue.message).join(" ") });
    return;
  }
  if (err.code === "P2025") {
    res.status(404).json({ error: "Registro não encontrado." });
    return;
  }
  if (err.code === "P2002" || err.code === "P2003") {
    res.status(409).json({ error: "O registro já existe ou está em uso." });
    return;
  }
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ error: "JSON inválido." });
    return;
  }
  console.error(err);
  res
    .status(500)
    .json({ error: "Não foi possível concluir a operação. Tente novamente." });
};
app.use(errorHandler);

const PORT = process.env.PORT || 3333;
if (process.env.NODE_ENV !== "test")
  app.listen(PORT, () => {
    console.log(`Horizon Quest backend running on port ${PORT}`);
  });
