// First Finance · MVP v2
// Depende de content.js (learningLevels, demoStudents).

const INITIAL_DEPOSIT_CENTS = 12000;
const DEMO_STATE_VERSION = 2;
const STORAGE_PREFIX = "first-finance-v2:";
const STUDENT_KEY = "first-finance-v2:student";
const OPENING_DEPOSIT_ID = "opening-deposit";
const REWARD_MOVEMENT_PREFIX = "reward-earned:";
const XP_PER_MODULE = 100;
const XP_PERFECT_BONUS = 50;

const ranks = [
  { min: 0, name: "Semente", icon: "🌱" },
  { min: 150, name: "Broto", icon: "🌿" },
  { min: 350, name: "Muda", icon: "🪴" },
  { min: 600, name: "Árvore", icon: "🌳" },
  { min: 850, name: "Floresta", icon: "🏞️" }
];

const goalEmojis = ["🚲", "🎮", "📚", "🎧", "⚽", "🎨", "✈️", "🎁"];

const mascotTips = [
  "Oi! Eu sou o Cofi. Vamos fazer seu dinheiro crescer?",
  "Guarde primeiro, gaste depois. Esse é o meu segredo!",
  "Cada módulo concluído vira recompensa no seu cofrinho.",
  "Que tal criar uma meta? Ver a barra enchendo é muito bom!",
  "Acertar o desafio de primeira vale XP bônus. ⚡"
];

let student = null;
let demoState;
let pendingFinancialOperation = null;
let activeLesson = null;

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (cents) => currency.format(cents / 100);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Armazenamento seguro ---------- */

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { localStorage.setItem(key, value); },
  trySet(key, value) { try { localStorage.setItem(key, value); } catch { /* sem armazenamento */ } }
};

/* ---------- Estado ---------- */

function createInitialDemoState() {
  return {
    version: DEMO_STATE_VERSION,
    completedModuleIds: [],
    perfectModuleIds: [],
    goal: null,
    goalsAchieved: 0,
    movements: [{
      id: OPENING_DEPOSIT_ID,
      type: "deposit",
      amountCents: INITIAL_DEPOSIT_CENTS,
      date: new Date().toISOString(),
      description: "Depósito inicial da demonstração"
    }]
  };
}

function getActiveLevel() {
  return learningLevels.find((level) => level.id === student.levelId);
}

function getActiveModules() {
  return getActiveLevel().tracks.flatMap((track) => track.modules);
}

function getRewardTotal(level) {
  return level.tracks.flatMap((track) => track.modules).reduce((total, module) => total + module.rewardCents, 0);
}

function sumMovements(state, predicate) {
  return state.movements.filter(predicate).reduce((total, movement) => total + movement.amountCents, 0);
}

function getAccountBalances(state = demoState, level = getActiveLevel()) {
  const modules = level.tracks.flatMap((track) => track.modules);
  const completedIds = new Set(state.completedModuleIds);
  const grossDepositsCents = sumMovements(state, (m) => m.type === "deposit");
  const withdrawalsCents = sumMovements(state, (m) => m.type === "withdrawal");
  const rewardBudgetCents = getRewardTotal(level);
  const earnedCents = sumMovements(state, (m) => m.type === "reward-earned");
  const redeemedCents = sumMovements(state, (m) => m.type === "redemption");
  const redeemedFromGoalCents = sumMovements(state, (m) => m.type === "redemption" && m.source === "goal");
  const goalSavedCents = sumMovements(state, (m) => m.type === "goal-save");
  const incompleteRewardCents = modules.filter((module) => !completedIds.has(module.id)).reduce((total, module) => total + module.rewardCents, 0);
  const netFundingCents = grossDepositsCents - withdrawalsCents;
  const freeCents = netFundingCents - rewardBudgetCents;
  const goalCents = goalSavedCents - redeemedFromGoalCents;
  const availableCents = earnedCents - (redeemedCents - redeemedFromGoalCents) - goalSavedCents;
  const lockedCents = freeCents + incompleteRewardCents;

  return { grossDepositsCents, withdrawalsCents, rewardBudgetCents, freeCents, earnedCents, lockedCents, availableCents, goalCents, redeemedCents, netFundingCents };
}

function assertAccountInvariants(state = demoState) {
  if (!state || state.version !== DEMO_STATE_VERSION || !Array.isArray(state.completedModuleIds) || !Array.isArray(state.perfectModuleIds) || !Array.isArray(state.movements) || !Number.isSafeInteger(state.goalsAchieved) || state.goalsAchieved < 0) {
    throw new Error("O estado da demonstração possui um formato inválido.");
  }

  for (const level of learningLevels) {
    if (getRewardTotal(level) !== INITIAL_DEPOSIT_CENTS) {
      throw new Error(`As recompensas de ${level.name} não correspondem à mesada fictícia.`);
    }
  }

  if (state.goal !== null && (typeof state.goal !== "object" || typeof state.goal.name !== "string" || !state.goal.name.trim() || !Number.isSafeInteger(state.goal.targetCents) || state.goal.targetCents <= 0 || !goalEmojis.includes(state.goal.emoji))) {
    throw new Error("A meta de poupança é inválida.");
  }

  const level = getActiveLevel();
  const moduleById = new Map(level.tracks.flatMap((track) => track.modules).map((module) => [module.id, module]));
  const completedIds = new Set(state.completedModuleIds);
  const movementIds = new Set();
  const rewardedModuleIds = new Set();

  if (completedIds.size !== state.completedModuleIds.length || [...completedIds].some((id) => !moduleById.has(id))) {
    throw new Error("As conclusões dos módulos estão inconsistentes.");
  }
  if (new Set(state.perfectModuleIds).size !== state.perfectModuleIds.length || state.perfectModuleIds.some((id) => !completedIds.has(id))) {
    throw new Error("Os bônus de desafio estão inconsistentes.");
  }

  const allowedTypes = ["deposit", "withdrawal", "reward-earned", "redemption", "goal-save"];
  for (const movement of state.movements) {
    if (!movement.id || movementIds.has(movement.id) || !allowedTypes.includes(movement.type) || !Number.isSafeInteger(movement.amountCents) || movement.amountCents <= 0 || !Number.isFinite(Date.parse(movement.date)) || typeof movement.description !== "string" || !movement.description.trim()) {
      throw new Error("O histórico contém uma movimentação inválida ou duplicada.");
    }
    movementIds.add(movement.id);

    if (movement.type === "redemption" && !["available", "goal"].includes(movement.source)) {
      throw new Error("Resgate sem origem definida.");
    }
    if (movement.type === "reward-earned") {
      const module = moduleById.get(movement.moduleId);
      if (!module || movement.amountCents !== module.rewardCents || rewardedModuleIds.has(module.id) || !completedIds.has(module.id)) {
        throw new Error("O histórico de recompensas dos módulos está inconsistente.");
      }
      rewardedModuleIds.add(module.id);
    }
  }

  const openingDeposits = state.movements.filter((movement) => movement.id === OPENING_DEPOSIT_ID);
  if (openingDeposits.length !== 1 || openingDeposits[0].type !== "deposit" || openingDeposits[0].amountCents !== INITIAL_DEPOSIT_CENTS) {
    throw new Error("O depósito inicial da demonstração está ausente ou duplicado.");
  }
  if ([...completedIds].some((id) => !rewardedModuleIds.has(id))) {
    throw new Error("Há módulos concluídos sem movimentação de recompensa.");
  }

  const b = getAccountBalances(state, level);
  const allocated = b.lockedCents + b.availableCents + b.goalCents + b.redeemedCents;
  if (b.freeCents < 0 || b.availableCents < 0 || b.goalCents < 0 || b.redeemedCents < 0 || allocated !== b.netFundingCents) {
    throw new Error("Os saldos da demonstração não respeitam a invariável da conta.");
  }
  if (state.goal === null && b.goalCents !== 0) {
    throw new Error("Há saldo guardado sem meta ativa.");
  }
}

function cloneDemoState(state) {
  return {
    version: state.version,
    completedModuleIds: [...state.completedModuleIds],
    perfectModuleIds: [...state.perfectModuleIds],
    goal: state.goal ? { ...state.goal } : null,
    goalsAchieved: state.goalsAchieved,
    movements: state.movements.map((movement) => ({ ...movement }))
  };
}

function storageKey() {
  return `${STORAGE_PREFIX}${student.id}`;
}

function persistDemoState(state) {
  assertAccountInvariants(state);
  storage.set(storageKey(), JSON.stringify(state));
}

function loadDemoState() {
  const initialState = createInitialDemoState();
  try {
    const stored = storage.get(storageKey());
    if (stored === null) {
      storage.trySet(storageKey(), JSON.stringify(initialState));
      return initialState;
    }
    const parsed = JSON.parse(stored);
    assertAccountInvariants(parsed);
    return parsed;
  } catch {
    storage.trySet(storageKey(), JSON.stringify(initialState));
    return initialState;
  }
}

function commitDemoState(nextState) {
  try {
    persistDemoState(nextState);
    demoState = nextState;
    return true;
  } catch {
    // Sem armazenamento (ex.: navegação privada restrita): mantém em memória se o estado for válido.
    try {
      assertAccountInvariants(nextState);
      demoState = nextState;
      return true;
    } catch {
      return false;
    }
  }
}

function makeMovementId(type, state = demoState) {
  return `${type}-${Date.now()}-${state.movements.length}`;
}

/* ---------- Gamificação ---------- */

function getXp(state = demoState) {
  return state.completedModuleIds.length * XP_PER_MODULE + state.perfectModuleIds.length * XP_PERFECT_BONUS;
}

function getRankInfo(xp) {
  let index = 0;
  ranks.forEach((rank, i) => { if (xp >= rank.min) index = i; });
  const current = ranks[index];
  const next = ranks[index + 1] || null;
  const progress = next ? Math.round(((xp - current.min) / (next.min - current.min)) * 100) : 100;
  return { current, next, progress };
}

function getBadges(state = demoState) {
  const level = getActiveLevel();
  const completed = new Set(state.completedModuleIds);
  const anyTrackDone = level.tracks.some((track) => track.modules.every((module) => completed.has(module.id)));
  const allModules = getActiveModules().length;
  const saved = state.movements.some((movement) => movement.type === "goal-save");
  return [
    { id: "primeiro-passo", icon: "👣", name: "Primeiro passo", hint: "Conclua 1 módulo", unlocked: completed.size >= 1 },
    { id: "curioso", icon: "🔎", name: "Mente curiosa", hint: "Conclua 3 módulos", unlocked: completed.size >= 3 },
    { id: "trilha", icon: "🏁", name: "Trilha completa", hint: "Termine uma trilha inteira", unlocked: anyTrackDone },
    { id: "genio", icon: "🧠", name: "Gênio do desafio", hint: "Acerte 3 desafios de primeira", unlocked: state.perfectModuleIds.length >= 3 },
    { id: "poupador", icon: "🐷", name: "Poupador", hint: "Guarde dinheiro em uma meta", unlocked: saved },
    { id: "sonho", icon: "🌟", name: "Sonho realizado", hint: "Complete uma meta de poupança", unlocked: state.goalsAchieved >= 1 },
    { id: "mestre", icon: "👑", name: "Mestre das finanças", hint: "Conclua todos os módulos", unlocked: completed.size === allModules }
  ];
}

/* ---------- Renderização: aluno ---------- */

function renderHeader() {
  const level = getActiveLevel();
  document.body.dataset.theme = student.theme;
  document.querySelector(".context-level").textContent = `${level.grade} · ${level.name}`;
  document.querySelector(".hero-name").textContent = student.name;
  document.querySelector(".student-avatar").textContent = student.name.charAt(0);
  document.querySelector(".guardian-student-name").textContent = student.name;
  document.querySelector(".hero-description").textContent = student.theme === "kids"
    ? "Pequenas escolhas de hoje. Grandes planos para amanhã."
    : "Seu dinheiro, suas regras. Aprenda a jogar esse jogo a seu favor.";

  const xp = getXp();
  const { current, next, progress } = getRankInfo(xp);
  document.querySelector("#xp-pill strong").textContent = xp;
  document.querySelector("#rank-badge").textContent = `${current.icon} ${current.name}`;
  document.querySelector("#sidebar-rank").textContent = `${current.icon} ${current.name}`;
  document.querySelector("#sidebar-xp").textContent = `${xp} XP`;
  document.querySelector("#hero-xp-fill").style.width = `${progress}%`;
  document.querySelector("#sidebar-xp-fill").style.width = `${progress}%`;
  document.querySelector(".hero .xp-bar").setAttribute("aria-valuenow", String(progress));
  document.querySelector("#xp-next").textContent = next
    ? `Faltam ${next.min - xp} XP para ${next.icon} ${next.name}`
    : "Nível máximo! Você é uma referência. 🎉";
}

function renderModule(module, index, track) {
  const completed = demoState.completedModuleIds.includes(module.id);
  const perfect = demoState.perfectModuleIds.includes(module.id);
  return `
    <article class="module-card${completed ? " is-complete" : ""}" data-module-id="${module.id}">
      <div class="module-badge" aria-hidden="true">${completed ? "✓" : index + 1}</div>
      <div class="module-copy">
        <span class="module-number">MÓDULO ${String(index + 1).padStart(2, "0")}${perfect ? ' · <span class="perfect-tag">⚡ de primeira</span>' : ""}</span>
        <h4>${module.name}</h4>
        <p class="module-description">${module.description}</p>
        <div class="module-meta">
          <span class="chip chip-money">💰 ${money(module.rewardCents)}</span>
          <span class="chip chip-xp">⚡ ${XP_PER_MODULE}${perfect ? ` + ${XP_PERFECT_BONUS}` : ""} XP</span>
          <span class="chip">📖 2 min</span>
        </div>
      </div>
      <div class="module-action">
        <button class="completion-button${completed ? " is-complete" : ""}" type="button" data-open-lesson="${module.id}" data-track="${track.id}">${completed ? "Rever aula" : "Começar"}</button>
      </div>
    </article>
  `;
}

function renderTrack(track) {
  const completedCount = track.modules.filter((module) => demoState.completedModuleIds.includes(module.id)).length;
  const percentage = Math.round((completedCount / track.modules.length) * 100);
  return `
    <section class="track-section track-${track.color}" aria-labelledby="track-${track.id}">
      <div class="track-heading">
        <span class="track-icon" aria-hidden="true">${track.icon}</span>
        <div class="track-title">
          <h3 id="track-${track.id}">${track.name}</h3>
          <p class="track-description">${track.description}</p>
        </div>
        <p class="track-meta"><strong>${completedCount}/${track.modules.length}</strong><span>módulos</span></p>
      </div>
      <div class="progress-track" role="progressbar" aria-label="Progresso: ${track.name}" aria-valuemin="0" aria-valuemax="${track.modules.length}" aria-valuenow="${completedCount}">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
      <div class="module-list">
        ${track.modules.map((module, index) => renderModule(module, index, track)).join("")}
      </div>
    </section>
  `;
}

function renderLearning() {
  renderHeader();
  document.querySelector("#learning-content").innerHTML = getActiveLevel().tracks.map(renderTrack).join("");
  renderBadges();
}

function renderBadges() {
  const badges = getBadges();
  const unlockedCount = badges.filter((badge) => badge.unlocked).length;
  document.querySelector("#badges-count").textContent = `${unlockedCount} de ${badges.length} desbloqueadas`;
  document.querySelector("#badges-content").innerHTML = badges.map((badge) => `
    <article class="badge-card${badge.unlocked ? " is-unlocked" : ""}">
      <span class="badge-icon" aria-hidden="true">${badge.unlocked ? badge.icon : "🔒"}</span>
      <strong>${badge.name}</strong>
      <span class="badge-hint">${badge.unlocked ? "Desbloqueada!" : badge.hint}</span>
    </article>
  `).join("");
}

function renderGoalCard(b) {
  if (!demoState.goal) {
    return `
      <form id="goal-form" class="goal-card goal-empty">
        <div class="goal-empty-copy">
          <p class="eyebrow">COFRINHO DE METAS</p>
          <h3>Crie sua meta 🎯</h3>
          <p>Escolha algo que você quer conquistar e guarde suas recompensas nela.</p>
        </div>
        <fieldset class="emoji-picker">
          <legend>Escolha um ícone</legend>
          ${goalEmojis.map((emoji, i) => `<label><input type="radio" name="emoji" value="${emoji}"${i === 0 ? " checked" : ""}><span>${emoji}</span></label>`).join("")}
        </fieldset>
        <div class="goal-fields">
          <label>O que você quer?<input name="name" type="text" maxlength="40" placeholder="Ex.: Bicicleta nova" required></label>
          <label>Quanto custa?<span class="finance-input-row"><span class="finance-prefix" aria-hidden="true">R$</span><input name="target" type="number" min="1" max="10000" step="0.01" inputmode="decimal" placeholder="60,00" required></span></label>
        </div>
        <button class="primary-button" type="submit">Criar meta</button>
      </form>
    `;
  }
  const goal = demoState.goal;
  const percent = Math.min(100, Math.round((b.goalCents / goal.targetCents) * 100));
  const reached = b.goalCents >= goal.targetCents;
  const missing = Math.max(0, goal.targetCents - b.goalCents);
  const canSave = b.availableCents > 0 && !reached;
  return `
    <div class="goal-card${reached ? " is-reached" : ""}">
      <div class="goal-top">
        <span class="goal-emoji" aria-hidden="true">${goal.emoji}</span>
        <div>
          <p class="eyebrow">MINHA META</p>
          <h3>${escapeHtml(goal.name)}</h3>
        </div>
        ${b.goalCents === 0 ? '<button class="link-button" type="button" data-goal-action="cancel">Trocar meta</button>' : ""}
      </div>
      <div class="goal-jar" role="progressbar" aria-label="Progresso da meta" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
        <div class="goal-jar-fill" style="width:${percent}%"></div>
        <span class="goal-jar-label">${percent}%</span>
      </div>
      <p class="goal-numbers"><strong>${money(b.goalCents)}</strong> de ${money(goal.targetCents)}${reached ? "" : ` · faltam ${money(missing)}`}</p>
      <div class="goal-actions">
        ${reached
          ? '<button class="primary-button celebrate" type="button" data-goal-action="achieve">Conquistar meta 🎉</button>'
          : `<button class="primary-button" type="button" data-goal-action="save"${canSave ? "" : " disabled"}>Guardar ${money(Math.min(b.availableCents, missing))} na meta</button>`}
      </div>
    </div>
  `;
}

function renderRewards(notice = "Conclua módulos para liberar parte da sua mesada fictícia.", noticeType = "") {
  const b = getAccountBalances();
  document.querySelector("#reward-content").innerHTML = `
    <div class="balance-grid" aria-label="Saldos da mesada fictícia">
      <div class="balance-card is-locked">
        <span class="balance-icon" aria-hidden="true">🔒</span>
        <span class="balance-label">Bloqueado</span>
        <strong class="balance-value">${money(b.lockedCents)}</strong>
        <span class="balance-help">Libera ao concluir módulos</span>
      </div>
      <div class="balance-card is-available">
        <span class="balance-icon" aria-hidden="true">💰</span>
        <span class="balance-label">Disponível</span>
        <strong class="balance-value">${money(b.availableCents)}</strong>
        <span class="balance-help">Pode resgatar ou guardar</span>
      </div>
      <div class="balance-card is-goal">
        <span class="balance-icon" aria-hidden="true">🐷</span>
        <span class="balance-label">Na meta</span>
        <strong class="balance-value">${money(b.goalCents)}</strong>
        <span class="balance-help">Guardado para seu sonho</span>
      </div>
      <div class="balance-card is-redeemed">
        <span class="balance-icon" aria-hidden="true">✅</span>
        <span class="balance-label">Resgatado</span>
        <strong class="balance-value">${money(b.redeemedCents)}</strong>
        <span class="balance-help">Já foi para você</span>
      </div>
    </div>
    <div class="reward-layout">
      ${renderGoalCard(b)}
      <div class="redeem-card">
        <p class="eyebrow">RESGATE</p>
        <h3>Usar agora</h3>
        <p class="deposit-line"><span>Mesada fictícia depositada</span><strong>${money(b.grossDepositsCents)}</strong></p>
        <p class="reward-notice${noticeType ? ` ${noticeType}` : ""}" role="status" aria-live="polite">${notice}</p>
        <button class="redeem-button" type="button"${b.availableCents === 0 ? " disabled" : ""}>Resgatar ${money(b.availableCents)}</button>
      </div>
    </div>
  `;
}

/* ---------- Aula + desafio ---------- */

function openLesson(moduleId) {
  const level = getActiveLevel();
  const track = level.tracks.find((item) => item.modules.some((module) => module.id === moduleId));
  const module = track.modules.find((item) => item.id === moduleId);
  activeLesson = { module, track, step: "read", attempts: 0 };
  renderLessonStep();
  document.querySelector("#lesson-dialog").showModal();
}

function renderLessonStep(feedback = null) {
  const { module, track, step } = activeLesson;
  const completed = demoState.completedModuleIds.includes(module.id);
  const body = document.querySelector("#lesson-body");

  if (step === "read") {
    body.innerHTML = `
      <p class="eyebrow">${track.icon} ${track.name.toUpperCase()}</p>
      <h2 id="lesson-title">${module.name}</h2>
      <div class="lesson-steps" aria-hidden="true"><span class="is-on"></span><span></span></div>
      ${module.lesson.map((paragraph) => `<p class="lesson-text">${paragraph}</p>`).join("")}
      <div class="lesson-tip">
        <svg class="tip-mascot" aria-hidden="true"><use href="#cofi"/></svg>
        <p><strong>Dica do Cofi:</strong> ${module.tip}</p>
      </div>
      <div class="lesson-actions">
        <button class="primary-button" type="button" data-lesson-action="quiz">${completed ? "Refazer desafio" : "Bora pro desafio →"}</button>
      </div>
    `;
    return;
  }

  const answered = feedback !== null;
  body.innerHTML = `
    <p class="eyebrow">⚡ DESAFIO</p>
    <h2 id="lesson-title">${module.question}</h2>
    <div class="lesson-steps" aria-hidden="true"><span class="is-on"></span><span class="is-on"></span></div>
    <div class="quiz-options" role="group" aria-label="Alternativas">
      ${module.options.map((option, index) => {
        let state = "";
        if (answered && index === module.answer && feedback.correct) state = " is-correct";
        if (answered && index === feedback.choice && !feedback.correct) state = " is-wrong";
        return `<button class="quiz-option${state}" type="button" data-answer="${index}"${answered && feedback.correct ? " disabled" : ""}><span class="quiz-letter">${"ABC"[index]}</span>${option}</button>`;
      }).join("")}
    </div>
    ${answered ? `
      <div class="quiz-feedback ${feedback.correct ? "is-correct" : "is-wrong"}" role="status">
        ${feedback.correct ? `<strong>${feedback.message}</strong> ${module.explain}` : "<strong>Quase!</strong> Releia a dica e tente de novo. Você consegue!"}
      </div>` : ""}
    <div class="lesson-actions">
      ${answered && feedback.correct
        ? '<button class="primary-button" type="button" data-lesson-action="close">Continuar</button>'
        : '<button class="link-button" type="button" data-lesson-action="read">← Voltar para a aula</button>'}
    </div>
  `;
}

function answerQuestion(choice) {
  const { module } = activeLesson;
  activeLesson.attempts += 1;
  const correct = choice === module.answer;
  if (!correct) {
    renderLessonStep({ correct: false, choice });
    return;
  }
  const alreadyDone = demoState.completedModuleIds.includes(module.id);
  const perfect = activeLesson.attempts === 1;
  let message = "Revisão feita!";
  if (!alreadyDone) {
    const result = completeModule(module.id, perfect);
    message = result ? `+${money(module.rewardCents)} e +${XP_PER_MODULE + (perfect ? XP_PERFECT_BONUS : 0)} XP!` : "Não foi possível salvar.";
  }
  renderLessonStep({ correct: true, choice, message });
}

function completeModule(moduleId, perfect) {
  const module = getActiveModules().find((item) => item.id === moduleId);
  if (!module || demoState.completedModuleIds.includes(moduleId)) {
    return false;
  }
  const badgesBefore = new Set(getBadges().filter((badge) => badge.unlocked).map((badge) => badge.id));
  const rankBefore = getRankInfo(getXp()).current.name;

  const nextState = cloneDemoState(demoState);
  nextState.completedModuleIds.push(moduleId);
  if (perfect) nextState.perfectModuleIds.push(moduleId);
  nextState.movements.push({
    id: `${REWARD_MOVEMENT_PREFIX}${moduleId}`,
    type: "reward-earned",
    moduleId,
    amountCents: module.rewardCents,
    date: new Date().toISOString(),
    description: `Recompensa conquistada: ${module.name}`
  });
  if (!commitDemoState(nextState)) {
    renderRewards("Não foi possível salvar o progresso neste navegador.", "is-warning");
    return false;
  }

  renderLearning();
  renderRewards(`${money(module.rewardCents)} liberados! Resgate agora ou guarde na sua meta.`, "is-success");
  renderGuardianDashboard();
  celebrate();

  const rankAfter = getRankInfo(getXp()).current;
  if (rankAfter.name !== rankBefore) toast(`${rankAfter.icon} Você subiu para ${rankAfter.name}!`);
  getBadges().filter((badge) => badge.unlocked && !badgesBefore.has(badge.id)).forEach((badge) => toast(`${badge.icon} Conquista desbloqueada: ${badge.name}`));
  return true;
}

/* ---------- Cofrinho ---------- */

function createGoal(form) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const targetCents = Math.round(Number(data.get("target")) * 100);
  const emoji = String(data.get("emoji"));
  if (!name || !Number.isSafeInteger(targetCents) || targetCents <= 0 || !goalEmojis.includes(emoji)) {
    renderRewards("Preencha o nome e um valor válido para a meta.", "is-warning");
    return;
  }
  const nextState = cloneDemoState(demoState);
  nextState.goal = { name: name.slice(0, 40), targetCents, emoji };
  if (commitDemoState(nextState)) {
    renderRewards(`Meta criada: ${emoji} ${escapeHtml(name)}. Agora é guardar!`, "is-success");
    setMascot("Meta criada! Cada real guardado te deixa mais perto. 💪");
  }
}

function saveToGoal() {
  const b = getAccountBalances();
  const goal = demoState.goal;
  if (!goal || b.availableCents <= 0) return;
  const amountCents = Math.min(b.availableCents, goal.targetCents - b.goalCents);
  if (amountCents <= 0) return;
  const hadSaved = getBadges().find((badge) => badge.id === "poupador").unlocked;
  const nextState = cloneDemoState(demoState);
  nextState.movements.push({
    id: makeMovementId("goal-save", nextState),
    type: "goal-save",
    amountCents,
    date: new Date().toISOString(),
    description: `Guardado na meta: ${goal.name}`
  });
  if (!commitDemoState(nextState)) {
    renderRewards("Não foi possível salvar neste navegador.", "is-warning");
    return;
  }
  const reached = getAccountBalances().goalCents >= goal.targetCents;
  renderRewards(reached ? "Meta completa! Clique em conquistar para comemorar. 🎉" : `${money(amountCents)} guardados na meta. Continue assim!`, "is-success");
  renderBadges();
  renderGuardianDashboard();
  if (!hadSaved) toast("🐷 Conquista desbloqueada: Poupador");
  if (reached) celebrate();
}

function achieveGoal() {
  const b = getAccountBalances();
  const goal = demoState.goal;
  if (!goal || b.goalCents < goal.targetCents) return;
  const nextState = cloneDemoState(demoState);
  nextState.movements.push({
    id: makeMovementId("redemption", nextState),
    type: "redemption",
    source: "goal",
    amountCents: b.goalCents,
    date: new Date().toISOString(),
    description: `Meta conquistada: ${goal.name}`
  });
  nextState.goal = null;
  nextState.goalsAchieved += 1;
  if (!commitDemoState(nextState)) return;
  renderRewards(`${goal.emoji} Você conquistou "${escapeHtml(goal.name)}"! ${money(b.goalCents)} resgatados na demonstração.`, "is-success");
  renderBadges();
  renderGuardianDashboard();
  celebrate(true);
  if (nextState.goalsAchieved === 1) toast("🌟 Conquista desbloqueada: Sonho realizado");
}

function cancelGoal() {
  // A troca só é liberada com a meta vazia: o que já foi guardado continua comprometido com ela.
  if (getAccountBalances().goalCents > 0) {
    renderRewards("Você já guardou dinheiro nesta meta. Conclua-a antes de trocar.", "is-warning");
    return;
  }
  const nextState = cloneDemoState(demoState);
  nextState.goal = null;
  if (commitDemoState(nextState)) renderRewards("Meta removida. Crie uma nova quando quiser!");
}

function redeemAvailable() {
  const b = getAccountBalances();
  if (b.availableCents === 0) {
    renderRewards("Não há valor disponível para resgate.", "is-warning");
    return;
  }
  const nextState = cloneDemoState(demoState);
  nextState.movements.push({
    id: makeMovementId("redemption", nextState),
    type: "redemption",
    source: "available",
    amountCents: b.availableCents,
    date: new Date().toISOString(),
    description: "Resgate demonstrativo do saldo disponível"
  });
  if (!commitDemoState(nextState)) {
    renderRewards("Não foi possível salvar o resgate neste navegador.", "is-warning");
    return;
  }
  renderRewards(`Resgate demonstrativo de ${money(b.availableCents)} concluído. Nenhum pagamento real foi realizado.`, "is-success");
  renderGuardianDashboard();
}

/* ---------- Responsáveis ---------- */

function renderGuardianDashboard() {
  const b = getAccountBalances();
  const metrics = [
    { label: "Total depositado", value: money(b.grossDepositsCents) },
    { label: "Saldo livre", value: money(b.freeCents) },
    { label: "Recompensas conquistadas", value: money(b.earnedCents) },
    { label: "Guardado em meta", value: money(b.goalCents) },
    { label: "Total resgatado", value: money(b.redeemedCents) },
    { label: "XP do aluno", value: `${getXp()} XP` }
  ];
  document.querySelector("#guardian-metrics").innerHTML = metrics.map((metric) => `
    <article class="guardian-metric">
      <span class="guardian-metric-label">${metric.label}</span>
      <strong class="guardian-metric-value">${metric.value}</strong>
    </article>
  `).join("");
  renderGuardianProgress();
  renderGuardianFinancialControls();
  renderGuardianHistory();
}

function renderGuardianProgress() {
  const level = getActiveLevel();
  const modules = getActiveModules();
  const completedCount = demoState.completedModuleIds.length;
  const progressPercent = Math.round((completedCount / modules.length) * 100);
  const goal = demoState.goal;

  const tracksMarkup = level.tracks.map((track) => {
    const trackCompletedCount = track.modules.filter((module) => demoState.completedModuleIds.includes(module.id)).length;
    const rows = track.modules.map((module) => {
      const completed = demoState.completedModuleIds.includes(module.id);
      const perfect = demoState.perfectModuleIds.includes(module.id);
      return `
        <div class="guardian-module-row${completed ? " is-complete" : ""}">
          <div class="guardian-module-copy">
            <strong>${module.name}</strong>
            <span>${completed ? (perfect ? "Concluído · acertou de primeira" : "Concluído") : "Pendente"}</span>
          </div>
          <span class="guardian-module-reward">${money(module.rewardCents)} ${completed ? "conquistados" : "ao concluir"}</span>
        </div>`;
    }).join("");
    return `
      <section class="guardian-track" aria-labelledby="guardian-track-${track.id}">
        <div class="guardian-track-heading">
          <div><h3 id="guardian-track-${track.id}">${track.icon} ${track.name}</h3><p>${track.description}</p></div>
          <span>${trackCompletedCount} de ${track.modules.length} módulos</span>
        </div>
        <div class="progress-track" role="progressbar" aria-label="Progresso: ${track.name}" aria-valuemin="0" aria-valuemax="${track.modules.length}" aria-valuenow="${trackCompletedCount}">
          <div class="progress-fill" style="width: ${Math.round((trackCompletedCount / track.modules.length) * 100)}%"></div>
        </div>
        <div class="guardian-module-list">${rows}</div>
      </section>`;
  }).join("");

  document.querySelector("#guardian-learning-progress").innerHTML = `
    <div class="guardian-progress-summary">
      <div class="guardian-progress-copy">
        <span>Progresso geral · ${level.name}</span>
        <strong>${completedCount} de ${modules.length} módulos concluídos</strong>
        <span>${goal ? `Meta atual: ${goal.emoji} ${escapeHtml(goal.name)} (${money(goal.targetCents)})` : "Sem meta de poupança ativa"} · Metas conquistadas: ${demoState.goalsAchieved}</span>
      </div>
      <span class="guardian-progress-percent">${progressPercent}%</span>
      <div class="progress-track" role="progressbar" aria-label="Progresso geral do aluno" aria-valuemin="0" aria-valuemax="${modules.length}" aria-valuenow="${completedCount}">
        <div class="progress-fill" style="width: ${progressPercent}%"></div>
      </div>
    </div>
    <div class="guardian-track-list">${tracksMarkup}</div>
  `;
}

function setGuardianFeedback(message, type = "") {
  const feedback = document.querySelector("#guardian-operation-feedback");
  feedback.textContent = message;
  feedback.className = `reward-notice guardian-operation-feedback${type ? ` ${type}` : ""}`;
}

function renderGuardianFinancialControls() {
  const freeCents = getAccountBalances().freeCents;
  const input = document.querySelector("#withdrawal-amount");
  const button = document.querySelector("#withdrawal-form .finance-submit");
  input.max = (freeCents / 100).toFixed(2);
  input.disabled = freeCents === 0;
  button.disabled = freeCents === 0;
  document.querySelector("#withdrawal-available").textContent = money(freeCents);
}

function renderGuardianHistory() {
  const labels = { deposit: "Depósito", withdrawal: "Retirada", "reward-earned": "Recompensa conquistada", redemption: "Resgate", "goal-save": "Guardado na meta" };
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const movements = [...demoState.movements].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  document.querySelector("#guardian-history").innerHTML = `
    <div class="history-heading">
      <h3>Histórico de movimentações</h3>
      <span>${movements.length} ${movements.length === 1 ? "movimentação" : "movimentações"}</span>
    </div>
    <ol class="movement-list">
      ${movements.map((movement) => {
        const outgoing = movement.type === "withdrawal";
        const prefix = movement.type === "deposit" || movement.type === "reward-earned" ? "+" : outgoing ? "-" : "";
        return `
          <li class="movement-row movement-${movement.type}">
            <div class="movement-copy">
              <span class="movement-type">${labels[movement.type]}</span>
              <strong>${escapeHtml(movement.description)}</strong>
              <time datetime="${movement.date}">${dateFormatter.format(new Date(movement.date))}</time>
            </div>
            <span class="movement-amount${outgoing ? " is-outgoing" : ""}">${prefix}${money(movement.amountCents)}</span>
          </li>`;
      }).join("")}
    </ol>
  `;
}

function applyGuardianOperation(type, amountCents) {
  const isDeposit = type === "deposit";
  if (!isDeposit && amountCents > getAccountBalances().freeCents) {
    setGuardianFeedback("O valor excede o saldo livre disponível para retirada.", "is-warning");
    return false;
  }
  const nextState = cloneDemoState(demoState);
  nextState.movements.push({
    id: makeMovementId(type, nextState),
    type,
    amountCents,
    date: new Date().toISOString(),
    description: isDeposit ? "Depósito demonstrativo do responsável" : "Retirada demonstrativa do saldo livre"
  });
  if (!commitDemoState(nextState)) {
    setGuardianFeedback(`Não foi possível salvar ${isDeposit ? "o depósito" : "a retirada"} neste navegador.`, "is-warning");
    return false;
  }
  setGuardianFeedback(`${isDeposit ? "Depósito" : "Retirada"} de ${money(amountCents)} confirmad${isDeposit ? "o" : "a"} na demonstração.`, "is-success");
  renderRewards(isDeposit ? "Depósito demonstrativo registrado no saldo livre." : "Retirada demonstrativa registrada; recompensas do aluno preservadas.", "is-success");
  renderGuardianDashboard();
  return true;
}

function openOperationConfirmation(type, amountCents) {
  const isDeposit = type === "deposit";
  pendingFinancialOperation = { type, amountCents };
  document.querySelector("#operation-dialog-title").textContent = isDeposit ? "Confirmar depósito" : "Confirmar retirada";
  document.querySelector("#operation-dialog-message").textContent = isDeposit
    ? `Adicionar ${money(amountCents)} ao saldo livre da demonstração?`
    : `Retirar ${money(amountCents)} do saldo livre da demonstração?`;
  document.querySelector("#operation-confirm").textContent = isDeposit ? "Confirmar depósito" : "Confirmar retirada";
  document.querySelector("#operation-dialog").showModal();
}

function handleGuardianForm(type) {
  return (event) => {
    event.preventDefault();
    const amount = document.querySelector(`#${type}-amount`).valueAsNumber;
    const amountCents = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amountCents <= 0) {
      setGuardianFeedback(`Informe um valor positivo para ${type === "deposit" ? "o depósito" : "a retirada"}.`, "is-warning");
      return;
    }
    if (type === "withdrawal" && amountCents > getAccountBalances().freeCents) {
      setGuardianFeedback("O valor excede o saldo livre disponível para retirada.", "is-warning");
      return;
    }
    openOperationConfirmation(type, amountCents);
  };
}

/* ---------- Visual: confete, toasts, mascote ---------- */

function toast(message) {
  const region = document.querySelector("#toast-region");
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  region.appendChild(item);
  while (region.children.length > 3) region.firstElementChild.remove();
  setTimeout(() => item.classList.add("is-leaving"), 3200);
  setTimeout(() => item.remove(), 3700);
}

function setMascot(text) {
  document.querySelector("#mascot-bubble").textContent = text;
}

function celebrate(big = false) {
  if (reducedMotion) return;
  const canvas = document.querySelector("#confetti");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ["#FFC83D", "#FF7A59", "#6FD3FF", "#C8F169", "#8B6CFF"];
  const pieces = Array.from({ length: big ? 180 : 90 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 200,
    y: canvas.height * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 4,
    size: Math.random() * 8 + 5,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));
  let frame = 0;
  (function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vx *= 0.99;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      ctx.restore();
    });
    frame += 1;
    if (frame < 140) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
}

/* ---------- Navegação e perfis ---------- */

function toggleView() {
  const showGuardian = document.querySelector("#guardian-view").hidden;
  document.querySelector("#student-view").hidden = showGuardian;
  document.querySelector("#guardian-view").hidden = !showGuardian;
  document.querySelector("#view-switch").textContent = showGuardian ? "Voltar para visão do aluno" : "Visão dos responsáveis";
  document.querySelector("#view-switch").setAttribute("aria-expanded", String(showGuardian));
  document.querySelector(".context-label").textContent = showGuardian ? "VISÃO DO RESPONSÁVEL" : "ESPAÇO DO ALUNO";
  if (showGuardian) renderGuardianDashboard();
  window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
}

function selectStudent(studentId) {
  student = demoStudents.find((item) => item.id === studentId) || demoStudents[0];
  storage.trySet(STUDENT_KEY, student.id);
  document.querySelector("#student-select").value = student.id;
  demoState = loadDemoState();
  setMascot(student.theme === "kids" ? mascotTips[0] : "E aí! Bora dominar suas finanças? Cada desafio vale XP. ⚡");
  renderLearning();
  renderRewards();
  renderGuardianDashboard();
}

function resetDemo() {
  if (!commitDemoState(createInitialDemoState())) {
    renderRewards("Não foi possível reiniciar a demonstração neste navegador.", "is-warning");
    return;
  }
  renderLearning();
  renderRewards("Demonstração reiniciada. Todos os valores voltaram ao início.", "is-success");
  renderGuardianDashboard();
}

/* ---------- Eventos ---------- */

document.querySelector("#student-select").innerHTML = demoStudents
  .map((item) => `<option value="${item.id}">${item.name} · ${learningLevels.find((level) => level.id === item.levelId).grade}</option>`)
  .join("");
document.querySelector("#student-select").addEventListener("change", (event) => selectStudent(event.target.value));

document.querySelector("#learning-content").addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-lesson]");
  if (button) openLesson(button.dataset.openLesson);
});

document.querySelector("#lesson-body").addEventListener("click", (event) => {
  const answer = event.target.closest("[data-answer]");
  if (answer && !answer.disabled) {
    answerQuestion(Number(answer.dataset.answer));
    return;
  }
  const action = event.target.closest("[data-lesson-action]")?.dataset.lessonAction;
  if (action === "quiz") { activeLesson.step = "quiz"; activeLesson.attempts = 0; renderLessonStep(); }
  if (action === "read") { activeLesson.step = "read"; renderLessonStep(); }
  if (action === "close") document.querySelector("#lesson-dialog").close();
});
document.querySelector("#lesson-close").addEventListener("click", () => document.querySelector("#lesson-dialog").close());
document.querySelector("#lesson-dialog").addEventListener("click", (event) => {
  if (event.target.id === "lesson-dialog") event.target.close();
});

document.querySelector("#reward-content").addEventListener("click", (event) => {
  const redeem = event.target.closest(".redeem-button");
  if (redeem && !redeem.disabled) { redeemAvailable(); return; }
  const action = event.target.closest("[data-goal-action]");
  if (!action || action.disabled) return;
  if (action.dataset.goalAction === "save") saveToGoal();
  if (action.dataset.goalAction === "achieve") achieveGoal();
  if (action.dataset.goalAction === "cancel") cancelGoal();
});
document.querySelector("#reward-content").addEventListener("submit", (event) => {
  if (event.target.id === "goal-form") { event.preventDefault(); createGoal(event.target); }
});

document.querySelector("#reset-demo").addEventListener("click", resetDemo);
document.querySelector("#view-switch").addEventListener("click", toggleView);
document.querySelector("#deposit-form").addEventListener("submit", handleGuardianForm("deposit"));
document.querySelector("#withdrawal-form").addEventListener("submit", handleGuardianForm("withdrawal"));

document.querySelector("#operation-dialog-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const operation = pendingFinancialOperation;
  pendingFinancialOperation = null;
  document.querySelector("#operation-dialog").close();
  if (operation && applyGuardianOperation(operation.type, operation.amountCents)) {
    document.querySelector(`#${operation.type}-form`).reset();
  }
});
document.querySelector("#operation-cancel").addEventListener("click", () => {
  pendingFinancialOperation = null;
  document.querySelector("#operation-dialog").close();
  setGuardianFeedback("Operação cancelada. Nenhum saldo foi alterado.");
});
document.querySelector("#operation-dialog").addEventListener("cancel", () => { pendingFinancialOperation = null; });

// Destaca a seção visível no menu lateral.
const navLinks = [...document.querySelectorAll(".nav-link")];
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${entry.target.id}`;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
  });
}, { rootMargin: "-40% 0px -55% 0px" });
["aprendizagem", "conquistas", "recompensas"].forEach((id) => observer.observe(document.getElementById(id)));

// Dica do mascote muda a cada 12 segundos.
let tipIndex = 0;
setInterval(() => {
  if (document.hidden || student.theme !== "kids") return;
  tipIndex = (tipIndex + 1) % mascotTips.length;
  setMascot(mascotTips[tipIndex]);
}, 12000);

selectStudent(storage.get(STUDENT_KEY) || demoStudents[0].id);
