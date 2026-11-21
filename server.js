import express from "express";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
import { analisarCurriculo } from "./ai.js";
import { gerarCurriculoPDF, gerarDiagnosticoPDF } from "./pdf.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(), // nada é salvo em disco
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === "application/pdf"),
});

app.use(express.static("public"));

app.post("/api/analisar", upload.single("curriculo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie um arquivo PDF de até 10 MB." });
  if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") return res.status(400).json({ erro: "O arquivo não parece ser um PDF válido." });

  try {
    const dados = process.env.MOCK === "1"
      ? (await import("./mock.js")).default
      : await analisarCurriculo(req.file.buffer);

    const [cv, diag] = await Promise.all([
      gerarCurriculoPDF(dados.curriculo),
      gerarDiagnosticoPDF(dados.diagnostico, dados.curriculo.nome),
    ]);

    res.json({
      nome: dados.curriculo.nome,
      nota: dados.diagnostico.nota_geral,
      curriculo: cv.toString("base64"),
      diagnostico: diag.toString("base64"),
    });
  } catch (err) {
    console.error(err);
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ erro: "Muitas solicitações agora. Tente em alguns minutos." });
    if (err instanceof Anthropic.APIError) return res.status(502).json({ erro: "Falha ao falar com a IA. Tente novamente." });
    res.status(500).json({ erro: err.message || "Erro inesperado." });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ erro: "Arquivo muito grande (máx. 10 MB)." });
  res.status(500).json({ erro: "Erro inesperado." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
