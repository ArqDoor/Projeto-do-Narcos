// Gera os dois PDFs (currículo padronizado + diagnóstico) com PDFKit.
import PDFDocument from "pdfkit";

const COR = { primaria: "#1F3A5F", texto: "#222222", suave: "#666666", linha: "#C9D3E0", ok: "#2E7D32", alerta: "#C62828" };
const M = 50; // margem

function novoDoc() {
  return new PDFDocument({ size: "A4", margins: { top: M, bottom: M, left: M, right: M }, bufferPages: true });
}

function paraBuffer(doc) {
  return new Promise((resolve, reject) => {
    const partes = [];
    doc.on("data", (c) => partes.push(c));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);
    doc.end();
  });
}

const larg = (doc) => doc.page.width - M * 2;
const tem = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim()));

function secao(doc, titulo) {
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(COR.primaria).text(titulo.toUpperCase(), M, doc.y, { characterSpacing: 1 });
  const y = doc.y + 2;
  doc.moveTo(M, y).lineTo(M + larg(doc), y).lineWidth(1).strokeColor(COR.linha).stroke();
  doc.moveDown(0.5);
}

function bullets(doc, itens, { cor = COR.texto, simbolo = "•" } = {}) {
  doc.font("Helvetica").fontSize(10).fillColor(cor);
  for (const item of itens) {
    doc.text(`${simbolo}  ${item}`, M + 8, doc.y, { width: larg(doc) - 8, lineGap: 2 });
    doc.moveDown(0.2);
  }
}

function paragrafo(doc, texto, align = "justify") {
  doc.font("Helvetica").fontSize(10).fillColor(COR.texto).text(texto, M, doc.y, { width: larg(doc), lineGap: 2, align });
}

function rodape(doc, texto) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const fundo = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // evita que o rodapé crie página nova
    doc.font("Helvetica").fontSize(8).fillColor(COR.suave)
      .text(`${texto} · ${i + 1}/${range.count}`, M, doc.page.height - M + 15, { width: larg(doc), align: "center", lineBreak: false });
    doc.page.margins.bottom = fundo;
  }
}

export async function gerarCurriculoPDF(c) {
  const doc = novoDoc();

  // Cabeçalho
  doc.rect(0, 0, doc.page.width, 110).fill(COR.primaria);
  doc.font("Helvetica-Bold").fontSize(24).fillColor("#FFFFFF").text(c.nome || "Seu Nome", M, 30, { width: larg(doc) });
  if (tem(c.titulo_profissional)) doc.font("Helvetica").fontSize(13).fillColor("#DDE6F0").text(c.titulo_profissional, M, doc.y + 2);
  const contatos = [c.contato?.email, c.contato?.telefone, c.contato?.cidade, c.contato?.linkedin, ...(c.contato?.outros || [])].filter(tem);
  doc.font("Helvetica").fontSize(9).fillColor("#FFFFFF").text(contatos.join("   |   "), M, 88, { width: larg(doc) });
  doc.y = 125;

  if (tem(c.resumo)) { secao(doc, "Resumo profissional"); paragrafo(doc, c.resumo); }

  if (tem(c.experiencias)) {
    secao(doc, "Experiência profissional");
    for (const e of c.experiencias) {
      if (doc.y > doc.page.height - 110) doc.addPage();
      doc.font("Helvetica-Bold").fontSize(11).fillColor(COR.texto).text(e.cargo, M, doc.y, { width: larg(doc) });
      const sub = [e.empresa, e.local].filter(tem).join(" · ");
      doc.font("Helvetica").fontSize(10).fillColor(COR.suave).text([sub, e.periodo].filter(tem).join("   |   "), M, doc.y, { width: larg(doc) });
      doc.moveDown(0.3);
      if (tem(e.conquistas)) bullets(doc, e.conquistas);
      doc.moveDown(0.4);
    }
  }

  if (tem(c.formacao)) {
    secao(doc, "Formação acadêmica");
    for (const f of c.formacao) {
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(COR.texto).text(f.curso, M, doc.y, { width: larg(doc) });
      doc.font("Helvetica").fontSize(10).fillColor(COR.suave).text([f.instituicao, f.periodo].filter(tem).join("   |   "), M, doc.y, { width: larg(doc) });
      doc.moveDown(0.4);
    }
  }

  if (tem(c.habilidades_tecnicas)) {
    secao(doc, "Habilidades técnicas");
    paragrafo(doc, c.habilidades_tecnicas.join("  ·  "), "left");
  }
  if (tem(c.soft_skills)) {
    secao(doc, "Competências comportamentais (soft skills)");
    paragrafo(doc, c.soft_skills.join("  ·  "), "left");
  }
  if (tem(c.idiomas)) { secao(doc, "Idiomas"); bullets(doc, c.idiomas); }
  if (tem(c.cursos_certificacoes)) { secao(doc, "Cursos e certificações"); bullets(doc, c.cursos_certificacoes); }

  return paraBuffer(doc);
}

export async function gerarDiagnosticoPDF(d, nome) {
  const doc = novoDoc();

  doc.font("Helvetica-Bold").fontSize(22).fillColor(COR.primaria).text("Diagnóstico do Currículo", M, M);
  if (tem(nome)) doc.font("Helvetica").fontSize(11).fillColor(COR.suave).text(nome);
  doc.moveDown(0.8);

  // Nota geral
  const nota = Math.max(0, Math.min(10, Number(d.nota_geral) || 0));
  const y = doc.y;
  doc.roundedRect(M, y, 90, 60, 8).fill(COR.primaria);
  doc.font("Helvetica-Bold").fontSize(26).fillColor("#FFFFFF").text(nota.toFixed(1), M, y + 10, { width: 90, align: "center" });
  doc.font("Helvetica").fontSize(8).text("NOTA GERAL / 10", M, y + 42, { width: 90, align: "center" });
  doc.font("Helvetica").fontSize(10).fillColor(COR.texto).text(d.resumo_avaliacao || "", M + 105, y, { width: larg(doc) - 105, lineGap: 2 });
  doc.y = Math.max(doc.y, y + 60);
  doc.x = M;

  if (tem(d.pontos_fortes)) { secao(doc, "Pontos fortes"); bullets(doc, d.pontos_fortes, { simbolo: "+" }); }

  if (tem(d.pontos_a_melhorar)) {
    secao(doc, "Aspectos a melhorar");
    for (const p of d.pontos_a_melhorar) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor(COR.alerta).text(p.aspecto, M, doc.y, { width: larg(doc) });
      doc.font("Helvetica").fontSize(10).fillColor(COR.texto).text(p.sugestao, M + 8, doc.y, { width: larg(doc) - 8, lineGap: 2 });
      doc.moveDown(0.4);
    }
  }

  if (tem(d.informacoes_faltantes)) { secao(doc, "Informações que faltam"); bullets(doc, d.informacoes_faltantes, { simbolo: "?" }); }

  if (tem(d.correcoes_realizadas)) {
    secao(doc, "Correções de português realizadas");
    for (const c of d.correcoes_realizadas) {
      if (doc.y > doc.page.height - 80) doc.addPage();
      doc.font("Helvetica").fontSize(9.5).fillColor(COR.alerta).text(`Antes: ${c.original}`, M + 8, doc.y, { width: larg(doc) - 8 });
      doc.fillColor(COR.ok).text(`Depois: ${c.corrigido}`, M + 8, doc.y, { width: larg(doc) - 8 });
      doc.moveDown(0.4);
    }
  }

  if (tem(d.cursos_gratuitos)) {
    secao(doc, "Cursos gratuitos recomendados");
    for (const c of d.cursos_gratuitos) {
      if (doc.y > doc.page.height - 80) doc.addPage();
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(COR.texto).text(c.nome, M, doc.y, { width: larg(doc), continued: true })
        .font("Helvetica").fillColor(COR.primaria).text(`  —  ${c.plataforma}`);
      doc.font("Helvetica").fontSize(9.5).fillColor(COR.suave).text(c.por_que, M + 8, doc.y, { width: larg(doc) - 8, lineGap: 1 });
      doc.moveDown(0.4);
    }
  }

  if (tem(d.proximos_passos)) {
    secao(doc, "Próximos passos");
    d.proximos_passos.forEach((p, i) => {
      doc.font("Helvetica").fontSize(10).fillColor(COR.texto).text(`${i + 1}. ${p}`, M + 8, doc.y, { width: larg(doc) - 8, lineGap: 2 });
      doc.moveDown(0.2);
    });
  }

  rodape(doc, "Diagnóstico gerado por IA — revise as sugestões antes de aplicá-las");
  return paraBuffer(doc);
}
