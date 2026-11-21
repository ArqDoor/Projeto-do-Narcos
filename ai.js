// Chamada à Claude API: lê o PDF do currículo e devolve JSON estruturado
// com (1) o currículo reescrito e (2) o diagnóstico.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

const client = new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente

const Experiencia = z.object({
  cargo: z.string(),
  empresa: z.string(),
  periodo: z.string().describe("Ex.: 'Mar/2021 – Atual'"),
  local: z.string().describe("Cidade/UF ou 'Remoto'; vazio se não informado"),
  conquistas: z.array(z.string()).describe("Bullets começando com verbo de ação, com resultados quando houver"),
});

const Formacao = z.object({
  curso: z.string(),
  instituicao: z.string(),
  periodo: z.string(),
});

const Curriculo = z.object({
  nome: z.string(),
  titulo_profissional: z.string().describe("Ex.: 'Analista Administrativo'"),
  contato: z.object({
    email: z.string(),
    telefone: z.string(),
    cidade: z.string(),
    linkedin: z.string(),
    outros: z.array(z.string()),
  }),
  resumo: z.string().describe("Resumo profissional de 3 a 5 linhas"),
  experiencias: z.array(Experiencia),
  formacao: z.array(Formacao),
  habilidades_tecnicas: z.array(z.string()),
  soft_skills: z.array(z.string()),
  idiomas: z.array(z.string()).describe("Ex.: 'Inglês – Intermediário'"),
  cursos_certificacoes: z.array(z.string()),
});

const Correcao = z.object({ original: z.string(), corrigido: z.string() });

const Curso = z.object({
  nome: z.string(),
  plataforma: z.string().describe("Ex.: Fundação Bradesco (Escola Virtual), SENAI, Sebrae, Escola Virtual.Gov, Google Ateliê Digital, Coursera (modo ouvinte)"),
  por_que: z.string(),
});

const Diagnostico = z.object({
  nota_geral: z.number().describe("0 a 10"),
  resumo_avaliacao: z.string(),
  pontos_fortes: z.array(z.string()),
  pontos_a_melhorar: z.array(z.object({ aspecto: z.string(), sugestao: z.string() })),
  correcoes_realizadas: z.array(Correcao).describe("Principais correções gramaticais/ortográficas feitas"),
  informacoes_faltantes: z.array(z.string()),
  cursos_gratuitos: z.array(Curso),
  proximos_passos: z.array(z.string()),
});

const Resultado = z.object({
  e_curriculo: z.boolean().describe("false se o documento enviado claramente não for um currículo"),
  curriculo: Curriculo,
  diagnostico: Diagnostico,
});

export class NaoECurriculoError extends Error {}

const SYSTEM = `Você é um especialista em recrutamento e redação de currículos no Brasil.
Você recebe o currículo de uma pessoa e faz duas entregas:

1) CURRÍCULO REESCRITO
- Corrija toda a gramática e ortografia (norma culta do português brasileiro).
- Reorganize no formato padronizado do schema, destacando experiências, habilidades técnicas e soft skills.
- Reescreva as conquistas como bullets objetivos, começando com verbo de ação.
- NUNCA invente informações: não crie empresas, datas, números, cursos ou contatos que não estejam no original.
  Se algo não existir, deixe o campo vazio ("" ou []). Soft skills podem ser inferidas apenas quando
  claramente evidenciadas pelas experiências descritas.

2) DIAGNÓSTICO
- Avalie o currículo original com honestidade e tom encorajador.
- Liste pontos fortes, pontos a melhorar (com sugestão prática), as principais correções feitas e
  informações que faltam.
- Recomende de 4 a 8 cursos GRATUITOS e reais, alinhados à área e às lacunas da pessoa, de plataformas
  conhecidas (Fundação Bradesco/Escola Virtual, SENAI, Sebrae, Escola Virtual.Gov, Google Ateliê Digital,
  Microsoft Learn, Coursera em modo ouvinte, etc.). Não invente links.
- Termine com próximos passos concretos.

Se o documento claramente não for um currículo (ex.: boleto, contrato, livro), marque e_curriculo como false
e preencha os demais campos com valores vazios.

Use apenas texto simples nos campos: sem emojis, sem markdown e sem símbolos especiais.
Responda inteiramente em português do Brasil.`;

export async function analisarCurriculo(pdfBuffer) {
  const response = await client.beta.messages.parse({
    model: "claude-sonnet-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(Resultado) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBuffer.toString("base64") },
          },
          { type: "text", text: "Este é o meu currículo. Gere o currículo reescrito e o diagnóstico." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("A IA não conseguiu processar este documento.");
  if (response.stop_reason === "max_tokens") throw new Error("O currículo é longo demais para processar de uma vez.");
  const out = response.parsed_output;
  if (!out) throw new Error("Resposta da IA em formato inesperado.");
  if (!out.e_curriculo) throw new NaoECurriculoError("Esse PDF não parece ser um currículo. Envie o arquivo do seu currículo.");
  return out;
}
