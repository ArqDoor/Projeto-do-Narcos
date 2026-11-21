# Currículo Turbo

A pessoa envia o currículo em PDF e recebe de volta dois PDFs:
1. **Currículo reescrito**: português corrigido, num modelo padronizado que destaca experiências, habilidades técnicas e soft skills.
2. **Diagnóstico**: nota, pontos fortes, aspectos a melhorar, correções feitas, informações que faltam, cursos gratuitos e próximos passos.

## Como rodar

```bash
npm install
```

```bash
ANTHROPIC_API_KEY=sua-chave npm start
```

Abra http://localhost:3000.

Para testar o layout sem gastar com a API (usa dados de exemplo):

```bash
MOCK=1 npm start
```

## Estrutura
- `public/index.html`: página de upload
- `server.js`: API `POST /api/analisar` (Express + Multer, o arquivo fica só na memória)
- `ai.js`: chamada à Claude API (lê o PDF direto e devolve JSON estruturado validado com Zod)
- `pdf.js`: monta os dois PDFs com PDFKit
- `mock.js`: dados de exemplo

## Publicar no Render
1. Em https://render.com, clique em **New > Blueprint** e escolha este repositório (o `render.yaml` já está configurado).
2. Quando pedir, preencha `ANTHROPIC_API_KEY` com a chave da Claude API.
3. Depois do deploy, o Render mostra a URL pública do site.
