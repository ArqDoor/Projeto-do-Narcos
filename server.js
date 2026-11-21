import express from "express";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
import { analisarCurriculo, NaoECurriculoError } from "./ai.js";
import { gerarCurriculoPDF, gerarDiagnosticoPDF } from "./pdf.js";

const app = express();
app.set("trust proxy", 1); // o Render fica na frente do app; assim req.ip é o IP real

// Alguns navegadores/sistemas mandam PDF como application/octet-stream, então
// não filtramos por mimetype: validamos pelo conteúdo (cabeçalho %PDF-) mais abaixo.
const upload = multer({
  storage: multer.memoryStorage(), // nada é salvo em disco
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

// Limite simples por IP para evitar que alguém esgote os créditos da API.
const LIMITE_POR_HORA = Number(process.env.LIMITE_POR_HORA || 8);
const usos = new Map(); // ip -> [timestamps]
function dentroDoLimite(ip) {
  const agora = Date.now();
  const recentes = (usos.get(ip) || []).filter((t) => agora - t < 60 * 60 * 1000);
  if (recentes.length >= LIMITE_POR_HORA) { usos.set(ip, recentes); return false; }
  recentes.push(agora);
  usos.set(ip, recentes);
  return true;
}
setInterval(() => {
  const agora = Date.now();
  for (const [ip, ts] of usos) if (ts.every((t) => agora - t >= 60 * 60 * 1000)) usos.delete(ip);
}, 10 * 60 * 1000).unref();

app.use(express.static("public", { maxAge: "1h" }));
app.get("/healthz", (_req, res) => res.send("ok"));

app.post("/api/analisar", upload.single("curriculo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie um arquivo PDF de até 10 MB." });
  if (req.file.buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return res.status(400).json({ erro: "Esse arquivo não é um PDF válido. Salve seu currículo em PDF e tente de novo." });
  }
  if (!dentroDoLimite(req.ip)) {
    return res.status(429).json({ erro: "Você atingiu o limite de análises por hora. Tente novamente mais tarde." });
  }

  try {
    let dados;
    if (process.env.MOCK === "1") {
      await new Promise((r) => setTimeout(r, Number(process.env.MOCK_DELAY_MS || 0)));
      dados = (await import("./mock.js")).default;
    } else {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.error("ANTHROPIC_API_KEY não configurada");
        return res.status(503).json({ erro: "O serviço ainda não está configurado. Tente mais tarde." });
      }
      dados = await analisarCurriculo(req.file.buffer);
    }

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
    if (err instanceof NaoECurriculoError) return res.status(422).json({ erro: err.message });
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ erro: "Muitas pessoas usando agora. Tente em alguns minutos." });
    if (err instanceof Anthropic.AuthenticationError) return res.status(503).json({ erro: "O serviço está com um problema de configuração. Tente mais tarde." });
    if (err instanceof Anthropic.BadRequestError) return res.status(400).json({ erro: "Não foi possível ler este PDF. Ele pode estar protegido por senha ou corrompido." });
    if (err instanceof Anthropic.APIError) return res.status(502).json({ erro: "Falha ao falar com a IA. Tente novamente." });
    res.status(500).json({ erro: err.message || "Erro inesperado." });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === "LIMIT_FILE_SIZE" ? "O arquivo passa de 10 MB." : "Envie apenas um arquivo PDF.";
    return res.status(400).json({ erro: msg });
  }
  console.error(err);
  res.status(500).json({ erro: "Erro inesperado." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
