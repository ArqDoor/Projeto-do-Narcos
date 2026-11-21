// Dados de exemplo para testar o layout sem chamar a IA (MOCK=1 npm start)
export default {
  curriculo: {
    nome: "Maria Fernanda Souza",
    titulo_profissional: "Assistente Administrativa",
    contato: { email: "maria.souza@email.com", telefone: "(11) 98888-7777", cidade: "São Paulo/SP", linkedin: "linkedin.com/in/mariasouza", outros: [] },
    resumo: "Profissional com 4 anos de experiência em rotinas administrativas, atendimento ao cliente e controle financeiro. Reconhecida pela organização, pela comunicação clara e pela capacidade de otimizar processos internos.",
    experiencias: [
      { cargo: "Assistente Administrativa", empresa: "Comercial Alfa Ltda.", periodo: "Mar/2022 – Atual", local: "São Paulo/SP", conquistas: ["Organizei o controle de contas a pagar e receber, reduzindo atrasos de pagamento.", "Atendi clientes por telefone e e-mail, solucionando demandas em primeiro contato.", "Elaborei planilhas de acompanhamento de estoque no Excel."] },
      { cargo: "Recepcionista", empresa: "Clínica Bem Viver", periodo: "Jan/2020 – Fev/2022", local: "São Paulo/SP", conquistas: ["Gerenciei a agenda de 6 profissionais de saúde.", "Recebi e orientei pacientes, mantendo o atendimento cordial e ágil."] },
    ],
    formacao: [{ curso: "Tecnólogo em Gestão Empresarial", instituicao: "Fatec São Paulo", periodo: "2019 – 2021" }],
    habilidades_tecnicas: ["Pacote Office (Excel intermediário)", "Rotinas de contas a pagar e receber", "Emissão de notas fiscais", "Atendimento ao cliente"],
    soft_skills: ["Organização", "Comunicação", "Proatividade", "Trabalho em equipe"],
    idiomas: ["Inglês – Básico"],
    cursos_certificacoes: ["Excel Intermediário – Fundação Bradesco (2023)"],
  },
  diagnostico: {
    nota_geral: 6.5,
    resumo_avaliacao: "Seu currículo mostra experiência consistente na área administrativa, mas tinha erros de português e descrições genéricas. Com resultados mensuráveis e algumas qualificações extras, ele fica bem mais competitivo.",
    pontos_fortes: ["Trajetória coerente na área administrativa.", "Formação superior alinhada ao cargo.", "Experiência com atendimento e finanças."],
    pontos_a_melhorar: [
      { aspecto: "Falta de resultados mensuráveis", sugestao: "Inclua números: quantos clientes atendia por dia, quanto reduziu de atrasos, etc." },
      { aspecto: "Ausência de resumo profissional", sugestao: "Mantenha o resumo criado no novo currículo e adapte-o para cada vaga." },
    ],
    correcoes_realizadas: [{ original: "Responsavel pelo atendimento a clientes", corrigido: "Responsável pelo atendimento a clientes" }, { original: "Fiz o controle de contas á pagar", corrigido: "Organizei o controle de contas a pagar" }],
    informacoes_faltantes: ["Link do LinkedIn atualizado", "Datas de conclusão dos cursos"],
    cursos_gratuitos: [
      { nome: "Excel Avançado", plataforma: "Fundação Bradesco (Escola Virtual)", por_que: "Consolida a habilidade mais pedida em vagas administrativas." },
      { nome: "Rotinas Administrativas", plataforma: "SENAI", por_que: "Formaliza conhecimentos que você já aplica no dia a dia." },
      { nome: "Inglês para iniciantes", plataforma: "Duolingo / Cambly (gratuito)", por_que: "Inglês intermediário abre portas para vagas melhores." },
    ],
    proximos_passos: ["Revise o novo currículo e confira todas as informações.", "Atualize seu LinkedIn com o mesmo conteúdo.", "Faça um dos cursos recomendados neste mês."],
  },
};
