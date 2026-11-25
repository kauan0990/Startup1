// Conteúdo pedagógico do First Finance.
// Cada módulo tem uma mini-lição, uma dica e um desafio de múltipla escolha.
// A soma das recompensas de cada nível precisa ser igual à mesada inicial (R$ 120,00).

const learningLevels = [
  {
    id: "fundamental-1",
    name: "Fundamental I",
    grade: "5º ano",
    tracks: [
      {
        id: "meu-dinheiro",
        name: "Meu dinheiro",
        icon: "🪙",
        color: "sun",
        description: "Entenda o valor do dinheiro nas escolhas do dia a dia.",
        modules: [
          {
            id: "origem-dinheiro",
            name: "De onde vem o dinheiro?",
            description: "Conheça diferentes formas de receber e usar dinheiro.",
            rewardCents: 2000,
            lesson: [
              "O dinheiro não nasce em árvore! Os adultos recebem dinheiro em troca do trabalho que fazem: o salário.",
              "Você também pode receber dinheiro: de mesada, de presente ou ajudando em algum projeto. Cada real é fruto do esforço de alguém."
            ],
            tip: "Antes de gastar, lembre: quanto tempo de trabalho custou esse dinheiro?",
            question: "De onde vem o salário que os adultos recebem?",
            options: ["Do trabalho que eles fazem", "De uma máquina que imprime para todo mundo", "De achar moedas na rua"],
            answer: 0,
            explain: "Isso! O salário é o pagamento pelo trabalho. Por isso o dinheiro tem valor."
          },
          {
            id: "necessidade-vontade",
            name: "Necessidade ou vontade?",
            description: "Aprenda a diferenciar o que precisamos do que desejamos.",
            rewardCents: 2000,
            lesson: [
              "Necessidade é algo que precisamos para viver bem: comida, água, material da escola, remédio.",
              "Vontade é algo legal de ter, mas que dá para esperar: um brinquedo novo, um doce, um jogo."
            ],
            tip: "Vontade não é proibida! Ela só entra na fila depois das necessidades.",
            question: "Qual destes é uma NECESSIDADE?",
            options: ["Um videogame novo", "O caderno para a escola", "Um sorvete de sobremesa"],
            answer: 1,
            explain: "Exato! O caderno é necessário para estudar. Os outros são vontades, e tudo bem tê-las de vez em quando."
          },
          {
            id: "escolhas-dia",
            name: "Escolhas do dia a dia",
            description: "Veja como pequenas decisões mudam o que sobra.",
            rewardCents: 2000,
            lesson: [
              "Toda vez que escolhemos comprar uma coisa, deixamos de comprar outra. Isso se chama escolha!",
              "Se você gasta R$ 5 em balas todo dia, no fim da semana foram R$ 35. Pequenos gastos somam muito."
            ],
            tip: "Faça a conta: quanto esse gasto pequeno vira em uma semana? E em um mês?",
            question: "Se você guardar R$ 2 por dia, quanto terá depois de 10 dias?",
            options: ["R$ 12", "R$ 20", "R$ 2"],
            answer: 1,
            explain: "Mandou bem! 2 × 10 = 20. Guardar um pouquinho todo dia faz o dinheiro crescer."
          }
        ]
      },
      {
        id: "escolhas-objetivos",
        name: "Escolhas e objetivos",
        icon: "🎯",
        color: "sky",
        description: "Planeje pequenas metas e descubra como chegar até elas.",
        modules: [
          {
            id: "sonho-meta",
            name: "Do sonho à meta",
            description: "Transforme uma vontade em um objetivo possível.",
            rewardCents: 2000,
            lesson: [
              "Um sonho vira meta quando tem três coisas: o QUÊ você quer, QUANTO custa e QUANDO quer conseguir.",
              "\"Quero uma bicicleta\" é um sonho. \"Quero juntar R$ 300 para a bicicleta até dezembro\" é uma meta!"
            ],
            tip: "Escreva sua meta e coloque num lugar onde você veja todo dia.",
            question: "Qual frase é uma META de verdade?",
            options: ["Quero ser rico", "Quero juntar R$ 60 para um livro em 3 meses", "Um dia eu compro alguma coisa"],
            answer: 1,
            explain: "Perfeito! Tem o quê (livro), quanto (R$ 60) e quando (3 meses)."
          },
          {
            id: "comparar-opcoes",
            name: "Compare suas opções",
            description: "Pense antes de escolher como usar seu dinheiro.",
            rewardCents: 2000,
            lesson: [
              "O mesmo produto pode ter preços diferentes em lugares diferentes. Comparar ajuda a economizar.",
              "Também vale comparar a qualidade: às vezes o mais barato quebra logo e sai mais caro no fim."
            ],
            tip: "Pergunte sempre: existe uma opção mais barata ou que dure mais?",
            question: "Uma mochila custa R$ 80 e dura 1 ano. Outra custa R$ 120 e dura 3 anos. Qual sai mais em conta?",
            options: ["A de R$ 80", "A de R$ 120", "As duas são iguais"],
            answer: 1,
            explain: "Isso aí! Para 3 anos você gastaria R$ 240 com a mais barata. A de R$ 120 vale mais a pena."
          },
          {
            id: "plano-conquista",
            name: "Meu plano de conquista",
            description: "Organize os passos para alcançar sua meta.",
            rewardCents: 2000,
            lesson: [
              "Para chegar à meta, divida o valor total pelo tempo que você tem. Assim descobre quanto guardar por semana.",
              "Meta de R$ 40 em 4 semanas? Guarde R$ 10 por semana. Passo a passo, você chega lá!"
            ],
            tip: "Use o cofrinho do app: guarde suas recompensas na sua meta e veja a barra encher.",
            question: "Para juntar R$ 30 em 3 semanas, quanto guardar por semana?",
            options: ["R$ 3", "R$ 10", "R$ 30"],
            answer: 1,
            explain: "Certinho! 30 ÷ 3 = 10 reais por semana."
          }
        ]
      }
    ]
  },
  {
    id: "fundamental-2",
    name: "Fundamental II",
    grade: "8º ano",
    tracks: [
      {
        id: "orcamento-sem-misterio",
        name: "Orçamento sem mistério",
        icon: "📊",
        color: "sun",
        description: "Organize entradas, gastos e prioridades.",
        modules: [
          {
            id: "mapa-gastos",
            name: "Mapa dos meus gastos",
            description: "Identifique para onde vai o dinheiro.",
            rewardCents: 2000,
            lesson: [
              "Sabe aquela sensação de \"pra onde foi meu dinheiro?\" A resposta está em anotar cada gasto, por menor que seja.",
              "Depois de uma semana anotando, agrupe por categoria: lanche, transporte, jogos, presentes. O padrão aparece."
            ],
            tip: "Use o bloco de notas do celular: valor + o que foi. Leva 5 segundos.",
            question: "Qual é o primeiro passo para controlar seus gastos?",
            options: ["Parar de gastar com tudo", "Anotar para onde o dinheiro vai", "Pedir mais mesada"],
            answer: 1,
            explain: "Isso! Não dá para melhorar o que você não mede."
          },
          {
            id: "orcamento-equilibrado",
            name: "Um orçamento equilibrado",
            description: "Distribua recursos entre necessidades e planos.",
            rewardCents: 2000,
            lesson: [
              "Uma regra simples para dividir o que você recebe: 50% para o essencial, 30% para o que você curte e 20% para guardar.",
              "Não precisa ser exato. O importante é que guardar faça parte do plano, e não seja só o que sobra."
            ],
            tip: "Guarde primeiro, gaste depois. Separar a parte da poupança logo que recebe funciona melhor.",
            question: "Recebeu R$ 100 de mesada. Pela regra 50-30-20, quanto vai para guardar?",
            options: ["R$ 50", "R$ 30", "R$ 20"],
            answer: 2,
            explain: "Mandou bem! 20% de R$ 100 = R$ 20 para a poupança."
          },
          {
            id: "imprevistos",
            name: "Preparação para imprevistos",
            description: "Entenda por que reservar uma parte faz diferença.",
            rewardCents: 2000,
            lesson: [
              "Fone quebrou, perdeu o passe do ônibus, celular caiu… Imprevistos acontecem com todo mundo.",
              "Uma reserva de emergência é um dinheiro guardado só para esses momentos. Ela evita que você fique na mão ou precise pedir emprestado."
            ],
            tip: "Reserva de emergência não é para comprar o tênis em promoção. É para emergência mesmo!",
            question: "Para que serve uma reserva de emergência?",
            options: ["Comprar coisas em promoção", "Cobrir gastos inesperados", "Emprestar para os amigos"],
            answer: 1,
            explain: "Exato! Ela te protege quando algo inesperado acontece."
          }
        ]
      },
      {
        id: "consumo-consciente",
        name: "Consumo consciente",
        icon: "🛒",
        color: "coral",
        description: "Avalie escolhas de consumo com atenção e responsabilidade.",
        modules: [
          {
            id: "publicidade-escolhas",
            name: "Publicidade e escolhas",
            description: "Reconheça influências antes de comprar.",
            rewardCents: 2000,
            lesson: [
              "Propagandas e influenciadores são feitos para despertar vontade. Muitos posts \"espontâneos\" são, na verdade, publicidade paga.",
              "Sinais de alerta: \"só hoje\", \"últimas unidades\", contagem regressiva. Isso cria pressa para você não pensar."
            ],
            tip: "Viu algo e quer muito? Espere 48 horas. Se ainda quiser, aí sim pense em comprar.",
            question: "Um anúncio diz \"SÓ HOJE! ÚLTIMAS UNIDADES!\". Qual é a melhor atitude?",
            options: ["Comprar rápido antes que acabe", "Respirar e avaliar se você realmente precisa", "Compartilhar com todo mundo"],
            answer: 1,
            explain: "Isso! A pressa é uma técnica de venda. Decisões boas precisam de calma."
          },
          {
            id: "preco-valor",
            name: "Preço, valor e comparação",
            description: "Compare alternativas para decidir melhor.",
            rewardCents: 2000,
            lesson: [
              "Preço é quanto custa. Valor é o quanto aquilo é útil ou importante para você. Nem sempre andam juntos.",
              "Compare o preço por unidade: um pacote de 6 por R$ 12 (R$ 2 cada) é melhor que 1 por R$ 2,50."
            ],
            tip: "Nos mercados, a etiqueta costuma mostrar o preço por kg ou por litro. Use isso!",
            question: "Qual sai mais barato por unidade?",
            options: ["4 sucos por R$ 10", "1 suco por R$ 3", "2 sucos por R$ 6"],
            answer: 0,
            explain: "Boa! R$ 10 ÷ 4 = R$ 2,50 cada, mais barato que R$ 3."
          },
          {
            id: "poupanca-projetos",
            name: "Poupança para projetos",
            description: "Planeje uma meta de médio prazo.",
            rewardCents: 2000,
            lesson: [
              "Metas de médio prazo levam alguns meses: um fone bom, uma viagem da escola, um curso.",
              "Defina o valor, o prazo e quanto guardar por mês. Acompanhar a evolução mantém a motivação."
            ],
            tip: "Crie sua meta no cofrinho do app e guarde suas recompensas nela.",
            question: "Quer R$ 240 em 6 meses. Quanto guardar por mês?",
            options: ["R$ 24", "R$ 40", "R$ 60"],
            answer: 1,
            explain: "Certo! 240 ÷ 6 = R$ 40 por mês."
          }
        ]
      }
    ]
  },
  {
    id: "ensino-medio",
    name: "Ensino Médio",
    grade: "2º ano do Ensino Médio",
    tracks: [
      {
        id: "planejamento-financeiro",
        name: "Planejamento financeiro",
        icon: "🧭",
        color: "sun",
        description: "Crie um plano alinhado às suas prioridades e objetivos.",
        modules: [
          {
            id: "metas-orcamento",
            name: "Metas e orçamento",
            description: "Conecte objetivos a um plano financeiro realista.",
            rewardCents: 2000,
            lesson: [
              "Metas SMART são Específicas, Mensuráveis, Atingíveis, Relevantes e Temporais. \"Juntar R$ 1.200 para o intercâmbio até julho\" é SMART.",
              "O orçamento é a ponte entre renda e metas: ele mostra quanto você consegue direcionar todo mês sem passar aperto."
            ],
            tip: "Revise o orçamento todo mês. A vida muda e o plano também.",
            question: "Qual meta é mais SMART?",
            options: ["Economizar mais", "Juntar R$ 900 em 9 meses para um notebook", "Nunca mais gastar"],
            answer: 1,
            explain: "Isso! É específica, mensurável e tem prazo: R$ 100 por mês."
          },
          {
            id: "reserva-emergencia",
            name: "Reserva de emergência",
            description: "Calcule a importância de se preparar para imprevistos.",
            rewardCents: 2000,
            lesson: [
              "Para adultos, a recomendação comum é ter de 3 a 6 meses do custo de vida guardados, em um lugar seguro e de fácil acesso.",
              "Sem reserva, um imprevisto pode virar dívida no cartão, com juros que estão entre os mais altos do mercado."
            ],
            tip: "Liquidez é a facilidade de transformar um investimento em dinheiro. Reserva precisa de liquidez alta.",
            question: "Alguém gasta R$ 2.000 por mês. Qual reserva mínima é recomendada?",
            options: ["R$ 2.000", "R$ 6.000", "R$ 500"],
            answer: 1,
            explain: "Exato! 3 meses × R$ 2.000 = R$ 6.000 como ponto de partida."
          },
          {
            id: "juros-tempo",
            name: "Juros e passagem do tempo",
            description: "Compare cenários e entenda o efeito dos juros.",
            rewardCents: 2000,
            lesson: [
              "Juros compostos são \"juros sobre juros\": o rendimento de cada mês passa a render também no mês seguinte.",
              "Por isso o tempo é o maior aliado de quem investe e o maior inimigo de quem tem dívida."
            ],
            tip: "Começar cedo, mesmo com pouco, costuma valer mais que começar tarde com muito.",
            question: "R$ 100 rendendo 10% ao ano, com juros compostos. Quanto terá após 2 anos?",
            options: ["R$ 120", "R$ 121", "R$ 110"],
            answer: 1,
            explain: "Mandou bem! 100 × 1,1 = 110 no 1º ano; 110 × 1,1 = 121 no 2º."
          }
        ]
      },
      {
        id: "credito-investimentos",
        name: "Crédito e investimentos",
        icon: "📈",
        color: "coral",
        description: "Conheça compromissos, possibilidades e riscos financeiros.",
        modules: [
          {
            id: "credito-custo",
            name: "Crédito: custo e cuidado",
            description: "Avalie o custo total antes de assumir crédito.",
            rewardCents: 2000,
            lesson: [
              "Crédito é usar hoje um dinheiro que você vai pagar amanhã, quase sempre com juros.",
              "O CET (Custo Efetivo Total) reúne juros, taxas e tarifas. É o número que mostra quanto o crédito custa de verdade."
            ],
            tip: "Parcelado \"sem juros\"? Confira se o preço à vista tem desconto. Se tiver, os juros estão embutidos.",
            question: "Um celular custa R$ 1.000 à vista ou 12× de R$ 100. Qual o custo extra do parcelado?",
            options: ["R$ 0", "R$ 100", "R$ 200"],
            answer: 2,
            explain: "Isso! 12 × 100 = R$ 1.200, ou seja, R$ 200 a mais que à vista."
          },
          {
            id: "perfil-risco",
            name: "Risco e perfil",
            description: "Relacione riscos a objetivos e prazos.",
            rewardCents: 2000,
            lesson: [
              "Todo investimento tem risco. Em geral, quanto maior o retorno esperado, maior o risco de perder ou oscilar.",
              "Objetivos de curto prazo pedem investimentos mais estáveis. Prazos longos toleram mais oscilação."
            ],
            tip: "Desconfie de promessas de retorno alto e garantido. Isso é sinal clássico de golpe.",
            question: "Para um dinheiro que você vai usar em 3 meses, o mais adequado é:",
            options: ["Um investimento estável e de fácil resgate", "Ações de uma empresa que acabou de abrir", "Uma criptomoeda nova que \"vai bombar\""],
            answer: 0,
            explain: "Exato! Prazo curto combina com baixo risco e liquidez."
          },
          {
            id: "investimento-diversificacao",
            name: "Diversificação na prática",
            description: "Entenda por que existem diferentes alternativas.",
            rewardCents: 2000,
            lesson: [
              "Diversificar é não colocar todos os ovos na mesma cesta: espalhar o dinheiro entre tipos diferentes de investimento.",
              "Se um vai mal, os outros podem compensar. Assim o risco total da carteira diminui."
            ],
            tip: "Diversificar também vale entre prazos: parte para curto, parte para longo prazo.",
            question: "O que significa diversificar?",
            options: ["Colocar tudo no investimento que mais rendeu ano passado", "Distribuir entre diferentes investimentos", "Trocar de investimento todo dia"],
            answer: 1,
            explain: "Isso aí! Distribuir reduz o impacto de um único resultado ruim."
          }
        ]
      }
    ]
  }
];

const demoStudents = [
  { id: "sofia", name: "Sofia", age: 10, levelId: "fundamental-1", theme: "kids", pronoun: "Aluna" },
  { id: "lucas", name: "Lucas", age: 13, levelId: "fundamental-2", theme: "teen", pronoun: "Aluno" },
  { id: "bia", name: "Bia", age: 16, levelId: "ensino-medio", theme: "teen", pronoun: "Aluna" }
];
