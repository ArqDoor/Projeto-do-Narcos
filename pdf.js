// Gera os dois PDFs (currículo padronizado + diagnóstico) com PDFKit.
import PDFDocument from "pdfkit";

const COR = {
  navy: "#16324F", navy2: "#24507D", accent: "#F2A93B", txt: "#1F2733", suave: "#5F6B7C",
  linha: "#D9E1EC", fundo: "#F3F6FA", chip: "#E8EEF7", ok: "#1E7F4F", okFundo: "#E5F4EC",
  erro: "#B42318", erroFundo: "#FDECEA", ambar: "#8A5A12", ambarFundo: "#FDF1DE",
};
const M = 50; // margem

// As fontes padrão do PDF (Helvetica) só cobrem o alfabeto latino (WinAnsi).
// Caracteres fora dele (emojis, setas, símbolos) sairiam como lixo, então
// trocamos os mais comuns e removemos o resto.
const WINANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const TROCAS = { "→": "->", "←": "<-", "⇒": "=>", "✓": "", "✔": "", "★": "*", "☆": "*", "▪": "•", "●": "•", "◦": "•", "‣": "•", "≥": ">=", "≤": "<=", "×": "x", " ": " ", " ": " ", " ": " " };
function limpo(v) {
  if (v === null || v === undefined) return "";
  let s = String(v).normalize("NFC");
  s = s.replace(/[^\u0000-ÿ]/gu, (ch) => (ch in TROCAS ? TROCAS[ch] : WINANSI_EXTRA.has(ch) ? ch : ""));
  return s.replace(/[\u0000-\u0008\u000B-\u001F]/g, "").replace(/[ \t]{2,}/g, " ").trim();
}
const lista = (v) => (Array.isArray(v) ? v.map(limpo).filter(Boolean) : []);
const tem = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(limpo(v)));

function novoDoc(titulo) {
  return new PDFDocument({
    size: "A4", margins: { top: M, bottom: M, left: M, right: M }, bufferPages: true,
    info: { Title: titulo, Creator: "Currículo Turbo" },
  });
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
const fimPagina = (doc) => doc.page.height - M;
function garantir(doc, altura) { if (doc.y + altura > fimPagina(doc)) doc.addPage(); }

function secao(doc, titulo) {
  doc.moveDown(0.9);
  garantir(doc, 70); // não deixa o título sozinho no fim da página
  const y = doc.y;
  doc.rect(M, y + 2, 4, 12).fill(COR.accent);
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor(COR.navy).text(titulo.toUpperCase(), M + 12, y, { characterSpacing: 0.8, width: larg(doc) - 12 });
  const yl = doc.y + 3;
  doc.moveTo(M, yl).lineTo(M + larg(doc), yl).lineWidth(0.8).strokeColor(COR.linha).stroke();
  doc.x = M; doc.y = yl + 8;
}

function bullets(doc, itens, { cor = COR.txt, marcador = COR.navy2, recuo = 8 } = {}) {
  doc.font("Helvetica").fontSize(10);
  for (const item of itens) {
    const w = larg(doc) - recuo - 10;
    const h = doc.heightOfString(item, { width: w, lineGap: 2 });
    garantir(doc, h + 4);
    const y = doc.y;
    doc.circle(M + recuo + 2, y + 5.5, 1.8).fill(marcador);
    doc.fillColor(cor).text(item, M + recuo + 10, y, { width: w, lineGap: 2 });
    doc.moveDown(0.25);
  }
  doc.x = M;
}

function paragrafo(doc, texto, opts = {}) {
  doc.font("Helvetica").fontSize(10).fillColor(COR.txt).text(texto, M, doc.y, { width: larg(doc), lineGap: 2.5, ...opts });
}

// Etiquetas ("chips") que quebram linha automaticamente
function chips(doc, itens, { fundo = COR.chip, cor = COR.navy } = {}) {
  const padX = 8, alt = 18, gap = 6;
  let x = M, y = doc.y;
  doc.font("Helvetica").fontSize(9.5);
  for (const item of itens) {
    const w = Math.min(doc.widthOfString(item) + padX * 2, larg(doc));
    if (x + w > M + larg(doc)) { x = M; y += alt + gap; }
    if (y + alt > fimPagina(doc)) { doc.addPage(); x = M; y = doc.y; }
    doc.roundedRect(x, y, w, alt, 9).fill(fundo);
    doc.fillColor(cor).text(item, x + padX, y + 4.5, { width: w - padX * 2, lineBreak: false, ellipsis: true });
    x += w + gap;
  }
  doc.x = M; doc.y = y + alt + 4;
}

function rodape(doc, texto) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const fundo = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // evita que o rodapé crie página nova
    doc.font("Helvetica").fontSize(8).fillColor(COR.suave)
      .text(`${texto}   ·   ${i + 1}/${range.count}`, M, doc.page.height - 32, { width: larg(doc), align: "center", lineBreak: false });
    doc.page.margins.bottom = fundo;
  }
}

export async function gerarCurriculoPDF(c) {
  const nome = limpo(c.nome) || "Seu Nome";
  const doc = novoDoc(`Currículo - ${nome}`);

  // Cabeçalho com altura calculada pelo conteúdo (nomes longos quebram linha sem sobrepor)
  const titulo = limpo(c.titulo_profissional);
  const contatos = [c.contato?.email, c.contato?.telefone, c.contato?.cidade, c.contato?.linkedin, ...(c.contato?.outros || [])].map(limpo).filter(Boolean);
  const contatoTxt = contatos.join("   |   ");
  const w = larg(doc);
  const hNome = doc.font("Helvetica-Bold").fontSize(24).heightOfString(nome, { width: w });
  const hTit = titulo ? doc.font("Helvetica").fontSize(12.5).heightOfString(titulo, { width: w }) + 4 : 0;
  const hCont = contatoTxt ? doc.font("Helvetica").fontSize(9).heightOfString(contatoTxt, { width: w, lineGap: 2 }) + 12 : 0;
  const hTopo = 34 + hNome + hTit + hCont + 24;

  doc.rect(0, 0, doc.page.width, hTopo).fill(COR.navy);
  doc.rect(0, hTopo, doc.page.width, 4).fill(COR.accent);
  let y = 34;
  doc.font("Helvetica-Bold").fontSize(24).fillColor("#FFFFFF").text(nome, M, y, { width: w });
  y += hNome;
  if (titulo) { doc.font("Helvetica").fontSize(12.5).fillColor("#F6D7A6").text(titulo, M, y + 4, { width: w }); y += hTit; }
  if (contatoTxt) doc.font("Helvetica").fontSize(9).fillColor("#DCE6F2").text(contatoTxt, M, y + 12, { width: w, lineGap: 2 });
  doc.x = M; doc.y = hTopo + 14;

  if (tem(c.resumo)) { secao(doc, "Resumo profissional"); paragrafo(doc, limpo(c.resumo), { align: "justify" }); }

  const exps = (c.experiencias || []).filter((e) => tem(e.cargo) || tem(e.empresa));
  if (exps.length) {
    secao(doc, "Experiência profissional");
    exps.forEach((e, i) => {
      if (i > 0) doc.moveDown(0.5);
      garantir(doc, 60);
      const cargo = limpo(e.cargo) || limpo(e.empresa);
      const periodo = limpo(e.periodo);
      const yTop = doc.y;
      const wPer = periodo ? Math.min(doc.font("Helvetica").fontSize(9.5).widthOfString(periodo) + 4, 160) : 0;
      if (periodo) doc.font("Helvetica").fontSize(9.5).fillColor(COR.suave).text(periodo, M + w - wPer, yTop + 1, { width: wPer, align: "right" });
      doc.font("Helvetica-Bold").fontSize(11).fillColor(COR.txt).text(cargo, M, yTop, { width: w - wPer - 10 });
      const sub = [limpo(e.cargo) ? limpo(e.empresa) : "", limpo(e.local)].filter(Boolean).join("  ·  ");
      if (sub) doc.font("Helvetica-Oblique").fontSize(10).fillColor(COR.navy2).text(sub, M, doc.y + 1, { width: w });
      doc.moveDown(0.35);
      const conq = lista(e.conquistas);
      if (conq.length) bullets(doc, conq);
    });
  }

  const forms = (c.formacao || []).filter((f) => tem(f.curso) || tem(f.instituicao));
  if (forms.length) {
    secao(doc, "Formação acadêmica");
    forms.forEach((f, i) => {
      if (i > 0) doc.moveDown(0.4);
      garantir(doc, 34);
      const periodo = limpo(f.periodo);
      const yTop = doc.y;
      const wPer = periodo ? Math.min(doc.font("Helvetica").fontSize(9.5).widthOfString(periodo) + 4, 160) : 0;
      if (periodo) doc.font("Helvetica").fontSize(9.5).fillColor(COR.suave).text(periodo, M + w - wPer, yTop + 1, { width: wPer, align: "right" });
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(COR.txt).text(limpo(f.curso) || limpo(f.instituicao), M, yTop, { width: w - wPer - 10 });
      if (tem(f.curso) && tem(f.instituicao)) doc.font("Helvetica").fontSize(10).fillColor(COR.suave).text(limpo(f.instituicao), M, doc.y + 1, { width: w });
    });
  }

  const tecnicas = lista(c.habilidades_tecnicas);
  if (tecnicas.length) { secao(doc, "Habilidades técnicas"); chips(doc, tecnicas); }
  const soft = lista(c.soft_skills);
  if (soft.length) { secao(doc, "Competências comportamentais"); chips(doc, soft, { fundo: COR.ambarFundo, cor: COR.ambar }); }
  const idiomas = lista(c.idiomas);
  if (idiomas.length) { secao(doc, "Idiomas"); bullets(doc, idiomas); }
  const cursos = lista(c.cursos_certificacoes);
  if (cursos.length) { secao(doc, "Cursos e certificações"); bullets(doc, cursos); }

  return paraBuffer(doc);
}

function corNota(n) { return n >= 7.5 ? COR.ok : n >= 5 ? COR.accent : COR.erro; }

export async function gerarDiagnosticoPDF(d, nomePessoa) {
  const nome = limpo(nomePessoa);
  const doc = novoDoc(`Diagnóstico do currículo${nome ? " - " + nome : ""}`);
  const w = larg(doc);

  // Faixa de título
  doc.rect(0, 0, doc.page.width, 96).fill(COR.navy);
  doc.rect(0, 96, doc.page.width, 4).fill(COR.accent);
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#FFFFFF").text("Diagnóstico do Currículo", M, 30, { width: w });
  if (nome) doc.font("Helvetica").fontSize(11).fillColor("#DCE6F2").text(nome, M, doc.y + 2, { width: w });
  doc.y = 122;

  // Nota + avaliação
  const nota = Math.max(0, Math.min(10, Number(d.nota_geral) || 0));
  const resumo = limpo(d.resumo_avaliacao);
  const hRes = doc.font("Helvetica").fontSize(10.5).heightOfString(resumo, { width: w - 140, lineGap: 2.5 });
  const hCaixa = Math.max(96, hRes + 36);
  const y0 = doc.y;
  doc.roundedRect(M, y0, w, hCaixa, 10).fill(COR.fundo);
  const cx = M + 58, cy = y0 + hCaixa / 2;
  doc.circle(cx, cy, 36).lineWidth(6).strokeColor("#DDE4EE").stroke();
  if (nota > 0) {
    const ang = (nota / 10) * Math.PI * 2;
    const ini = -Math.PI / 2;
    doc.path(arco(cx, cy, 36, ini, ini + ang)).lineWidth(6).lineCap("round").strokeColor(corNota(nota)).stroke();
  }
  doc.font("Helvetica-Bold").fontSize(22).fillColor(COR.navy).text(nota.toFixed(1).replace(".", ","), cx - 36, cy - 14, { width: 72, align: "center" });
  doc.font("Helvetica").fontSize(7.5).fillColor(COR.suave).text("NOTA / 10", cx - 36, cy + 10, { width: 72, align: "center" });
  doc.font("Helvetica-Bold").fontSize(11).fillColor(COR.navy).text("Avaliação geral", M + 124, y0 + 16, { width: w - 140 });
  doc.font("Helvetica").fontSize(10.5).fillColor(COR.txt).text(resumo, M + 124, doc.y + 3, { width: w - 140, lineGap: 2.5 });
  doc.x = M; doc.y = y0 + hCaixa + 4;

  const fortes = lista(d.pontos_fortes);
  if (fortes.length) { secao(doc, "Pontos fortes"); bullets(doc, fortes, { marcador: COR.ok }); }

  const melhorar = (d.pontos_a_melhorar || []).filter((p) => tem(p.aspecto) || tem(p.sugestao));
  if (melhorar.length) {
    secao(doc, "Aspectos a melhorar");
    for (const p of melhorar) {
      const asp = limpo(p.aspecto), sug = limpo(p.sugestao);
      const hA = doc.font("Helvetica-Bold").fontSize(10).heightOfString(asp, { width: w - 28 });
      const hS = doc.font("Helvetica").fontSize(10).heightOfString(sug, { width: w - 28, lineGap: 2 });
      const h = hA + hS + 20;
      garantir(doc, h + 6);
      const y = doc.y;
      doc.roundedRect(M, y, w, h, 8).fill(COR.erroFundo);
      doc.rect(M, y, 3, h).fill(COR.erro);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(COR.erro).text(asp, M + 14, y + 9, { width: w - 28 });
      doc.font("Helvetica").fontSize(10).fillColor(COR.txt).text(sug, M + 14, doc.y + 2, { width: w - 28, lineGap: 2 });
      doc.x = M; doc.y = y + h + 6;
    }
  }

  const faltam = lista(d.informacoes_faltantes);
  if (faltam.length) { secao(doc, "Informações que faltam"); bullets(doc, faltam, { marcador: COR.accent }); }

  const corr = (d.correcoes_realizadas || []).filter((c) => tem(c.original) && tem(c.corrigido));
  if (corr.length) {
    secao(doc, "Correções de português realizadas");
    const col = (w - 12) / 2;
    const yh = doc.y;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COR.suave);
    doc.text("ANTES", M, yh, { width: col });
    doc.text("DEPOIS", M + col + 12, yh, { width: col });
    doc.x = M; doc.y = yh + 14;
    for (const c of corr) {
      const a = limpo(c.original), b = limpo(c.corrigido);
      doc.font("Helvetica").fontSize(9.5);
      const h = Math.max(doc.heightOfString(a, { width: col - 16 }), doc.heightOfString(b, { width: col - 16 })) + 12;
      garantir(doc, h + 4);
      const y = doc.y;
      doc.roundedRect(M, y, col, h, 6).fill(COR.erroFundo);
      doc.roundedRect(M + col + 12, y, col, h, 6).fill(COR.okFundo);
      doc.fillColor(COR.erro).text(a, M + 8, y + 6, { width: col - 16 });
      doc.fillColor(COR.ok).text(b, M + col + 20, y + 6, { width: col - 16 });
      doc.x = M; doc.y = y + h + 4;
    }
  }

  const cursos = (d.cursos_gratuitos || []).filter((c) => tem(c.nome));
  if (cursos.length) {
    secao(doc, "Cursos gratuitos recomendados");
    for (const c of cursos) {
      const nomeC = limpo(c.nome), plat = limpo(c.plataforma), pq = limpo(c.por_que);
      const hN = doc.font("Helvetica-Bold").fontSize(10.5).heightOfString(nomeC, { width: w - 28 });
      const hP = plat ? doc.font("Helvetica").fontSize(9.5).heightOfString(plat, { width: w - 28 }) + 2 : 0;
      const hQ = pq ? doc.font("Helvetica").fontSize(9.5).heightOfString(pq, { width: w - 28, lineGap: 1.5 }) + 4 : 0;
      const h = hN + hP + hQ + 18;
      garantir(doc, h + 6);
      const y = doc.y;
      doc.roundedRect(M, y, w, h, 8).lineWidth(0.8).fillAndStroke("#FFFFFF", COR.linha);
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(COR.txt).text(nomeC, M + 14, y + 9, { width: w - 28 });
      if (plat) doc.font("Helvetica").fontSize(9.5).fillColor(COR.navy2).text(plat, M + 14, doc.y + 2, { width: w - 28 });
      if (pq) doc.font("Helvetica").fontSize(9.5).fillColor(COR.suave).text(pq, M + 14, doc.y + 4, { width: w - 28, lineGap: 1.5 });
      doc.x = M; doc.y = y + h + 6;
    }
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(COR.suave)
      .text("Procure o nome do curso no site da plataforma. A oferta e a gratuidade podem mudar ao longo do tempo.", M, doc.y + 2, { width: w });
  }

  const passos = lista(d.proximos_passos);
  if (passos.length) {
    secao(doc, "Próximos passos");
    passos.forEach((p, i) => {
      const h = doc.font("Helvetica").fontSize(10).heightOfString(p, { width: w - 30, lineGap: 2 });
      garantir(doc, Math.max(h, 18) + 6);
      const y = doc.y;
      doc.circle(M + 9, y + 7, 9).fill(COR.navy);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#FFFFFF").text(String(i + 1), M, y + 2.5, { width: 18, align: "center" });
      doc.font("Helvetica").fontSize(10).fillColor(COR.txt).text(p, M + 26, y + 1, { width: w - 30, lineGap: 2 });
      doc.x = M; doc.y = Math.max(doc.y, y + 18) + 6;
    });
  }

  rodape(doc, "Diagnóstico gerado por IA. Revise as sugestões antes de aplicá-las");
  return paraBuffer(doc);
}

// Caminho SVG de um arco de círculo (para o anel da nota)
function arco(cx, cy, r, a0, a1) {
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  const grande = a1 - a0 > Math.PI ? 1 : 0;
  if (a1 - a0 >= Math.PI * 2 - 0.001) return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${grande} 1 ${x1} ${y1}`;
}
