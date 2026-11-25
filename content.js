// Conteúdo do First Finance: um aluno, uma trilha de 6 aulas.
// A soma das recompensas precisa ser igual à mesada inicial (R$ 120,00).

const student = {
  name: "Sofia",
  fullName: "Sofia Andrade",
  grade: "5º ano",
  age: 10,
  guardian: "Renata"
};

const tracks = [
  { id: "meu-dinheiro", name: "Meu dinheiro" },
  { id: "escolhas-objetivos", name: "Escolhas e objetivos" }
];

const modules = [
  {
    id: "origem-dinheiro",
    track: "meu-dinheiro",
    name: "De onde vem o dinheiro?",
    description: "Diferentes formas de receber e usar dinheiro.",
    rewardCents: 2000,
    lesson: [
      "O dinheiro não nasce em árvore. Os adultos recebem dinheiro em troca do trabalho que fazem, e isso se chama salário.",
      "Você também pode receber dinheiro: de mesada, de presente ou ajudando em algum projeto. Cada real é fruto do esforço de alguém."
    ],
    tip: "Antes de gastar, pense em quanto tempo de trabalho custou esse dinheiro.",
    question: "De onde vem o salário que os adultos recebem?",
    options: ["Do trabalho que eles fazem", "De uma máquina que imprime dinheiro para todo mundo", "De achar moedas na rua"],
    answer: 0,
    explain: "O salário é o pagamento pelo trabalho. Por isso o dinheiro tem valor."
  },
  {
    id: "necessidade-vontade",
    track: "meu-dinheiro",
    name: "Necessidade ou vontade?",
    description: "O que a gente precisa e o que a gente deseja.",
    rewardCents: 2000,
    lesson: [
      "Necessidade é algo que precisamos para viver bem: comida, água, material da escola, remédio.",
      "Vontade é algo legal de ter, mas que pode esperar: um brinquedo novo, um doce, um jogo."
    ],
    tip: "Vontade não é proibida. Ela só entra na fila depois das necessidades.",
    question: "Qual destes é uma necessidade?",
    options: ["Um videogame novo", "O caderno para a escola", "Um sorvete de sobremesa"],
    answer: 1,
    explain: "O caderno é necessário para estudar. Os outros são vontades, e tudo bem tê-las de vez em quando."
  },
  {
    id: "escolhas-dia",
    track: "meu-dinheiro",
    name: "Escolhas do dia a dia",
    description: "Pequenos gastos que somam muito.",
    rewardCents: 2000,
    lesson: [
      "Toda vez que escolhemos comprar uma coisa, deixamos de comprar outra.",
      "Se você gasta R$ 5 em balas todo dia, no fim da semana foram R$ 35. Pequenos gastos somam muito."
    ],
    tip: "Faça a conta: quanto esse gasto pequeno vira em uma semana? E em um mês?",
    question: "Se você guardar R$ 2 por dia, quanto terá depois de 10 dias?",
    options: ["R$ 12", "R$ 20", "R$ 2"],
    answer: 1,
    explain: "2 × 10 = 20. Guardar um pouquinho todo dia faz o dinheiro crescer."
  },
  {
    id: "sonho-meta",
    track: "escolhas-objetivos",
    name: "Do sonho à meta",
    description: "Transforme uma vontade em um objetivo possível.",
    rewardCents: 2000,
    lesson: [
      "Um sonho vira meta quando tem três coisas: o que você quer, quanto custa e quando quer conseguir.",
      "\"Quero uma bicicleta\" é um sonho. \"Quero juntar R$ 300 para a bicicleta até dezembro\" é uma meta."
    ],
    tip: "Escreva sua meta e deixe num lugar onde você veja todo dia.",
    question: "Qual frase é uma meta de verdade?",
    options: ["Quero ser rica", "Quero juntar R$ 60 para um livro em 3 meses", "Um dia eu compro alguma coisa"],
    answer: 1,
    explain: "Tem o quê (livro), quanto (R$ 60) e quando (3 meses)."
  },
  {
    id: "comparar-opcoes",
    track: "escolhas-objetivos",
    name: "Compare suas opções",
    description: "Pense antes de escolher como usar o dinheiro.",
    rewardCents: 2000,
    lesson: [
      "O mesmo produto pode ter preços diferentes em lugares diferentes. Comparar ajuda a economizar.",
      "Também vale comparar a qualidade: às vezes o mais barato quebra logo e sai mais caro no fim."
    ],
    tip: "Pergunte sempre: existe uma opção mais barata ou que dure mais?",
    question: "Uma mochila custa R$ 80 e dura 1 ano. Outra custa R$ 120 e dura 3 anos. Qual sai mais em conta?",
    options: ["A de R$ 80", "A de R$ 120", "As duas dão no mesmo"],
    answer: 1,
    explain: "Em 3 anos você gastaria R$ 240 com a mais barata. A de R$ 120 vale mais a pena."
  },
  {
    id: "plano-conquista",
    track: "escolhas-objetivos",
    name: "Meu plano de conquista",
    description: "Os passos para chegar na sua meta.",
    rewardCents: 2000,
    lesson: [
      "Para chegar na meta, divida o valor total pelo tempo que você tem. Assim descobre quanto guardar por semana.",
      "Meta de R$ 40 em 4 semanas? Guarde R$ 10 por semana. Passo a passo, você chega lá."
    ],
    tip: "Use a sua meta aqui no app: guarde o que ganhar nas aulas e acompanhe quanto falta.",
    question: "Para juntar R$ 30 em 3 semanas, quanto guardar por semana?",
    options: ["R$ 3", "R$ 10", "R$ 30"],
    answer: 1,
    explain: "30 ÷ 3 = 10 reais por semana."
  }
];
