// First Finance · MVP v3 (um aluno + família)
// Depende de content.js: student, tracks, modules.

const INITIAL_DEPOSIT_CENTS = 12000;
const STATE_VERSION = 3;
const STORAGE_KEY = "first-finance-v3";
const OPENING_DEPOSIT_ID = "opening-deposit";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (cents) => currency.format(cents / 100);
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
const fullDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (selector) => document.querySelector(selector);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let state;
let lesson = null;
let pendingConfirm = null;
let historyFilter = "all";

/* ------------------------------------------------------------------
   Estado e regras da conta
   ------------------------------------------------------------------ */

function initialState() {
  return {
    version: STATE_VERSION,
    completedModuleIds: [],
    firstTryIds: [],
    attempts: {},
    goal: null,
    goalsAchieved: 0,
    requests: [],
    movements: [{
      id: OPENING_DEPOSIT_ID,
      type: "deposit",
      amountCents: INITIAL_DEPOSIT_CENTS,
      date: new Date().toISOString(),
      description: "Mesada da trilha"
    }]
  };
}

const sum = (s, test) => s.movements.filter(test).reduce((total, m) => total + m.amountCents, 0);
const rewardBudget = () => modules.reduce((total, m) => total + m.rewardCents, 0);

function balances(s = state) {
  const deposits = sum(s, (m) => m.type === "deposit");
  const withdrawals = sum(s, (m) => m.type === "withdrawal");
  const contributions = sum(s, (m) => m.type === "goal-contribution");
  const earned = sum(s, (m) => m.type === "reward-earned");
  const redeemedAvailable = sum(s, (m) => m.type === "redemption" && m.source === "available");
  const redeemedGoal = sum(s, (m) => m.type === "redemption" && m.source === "goal");
  const goalSaved = sum(s, (m) => m.type === "goal-save");
  const done = new Set(s.completedModuleIds);
  const incomplete = modules.filter((m) => !done.has(m.id)).reduce((total, m) => total + m.rewardCents, 0);
  const pending = s.requests.filter((r) => r.status === "pending").reduce((total, r) => total + r.amountCents, 0);

  const free = deposits - withdrawals - rewardBudget();
  const available = earned - redeemedAvailable - goalSaved;
  const goal = goalSaved + contributions - redeemedGoal;
  return {
    deposits, withdrawals, contributions, earned, free, goal, pending,
    available,
    spendable: available - pending,
    locked: free + incomplete,
    incomplete,
    redeemed: redeemedAvailable + redeemedGoal,
    net: deposits - withdrawals + contributions
  };
}

function validate(s) {
  const fail = (message) => { throw new Error(message); };
  if (!s || s.version !== STATE_VERSION || !Array.isArray(s.completedModuleIds) || !Array.isArray(s.firstTryIds) || !Array.isArray(s.movements) || !Array.isArray(s.requests) || typeof s.attempts !== "object") fail("Formato inválido.");
  if (rewardBudget() !== INITIAL_DEPOSIT_CENTS) fail("Recompensas não fecham com a mesada.");

  const ids = new Set(modules.map((m) => m.id));
  const done = new Set(s.completedModuleIds);
  if (done.size !== s.completedModuleIds.length || [...done].some((id) => !ids.has(id))) fail("Conclusões inconsistentes.");
  if (s.firstTryIds.some((id) => !done.has(id))) fail("Acertos de primeira inconsistentes.");
  if (s.goal !== null && (typeof s.goal.name !== "string" || !s.goal.name.trim() || !Number.isSafeInteger(s.goal.targetCents) || s.goal.targetCents <= 0)) fail("Meta inválida.");

  const types = ["deposit", "withdrawal", "reward-earned", "redemption", "goal-save", "goal-contribution"];
  const seen = new Set();
  const rewarded = new Set();
  for (const m of s.movements) {
    if (!m.id || seen.has(m.id) || !types.includes(m.type) || !Number.isSafeInteger(m.amountCents) || m.amountCents <= 0 || !Number.isFinite(Date.parse(m.date)) || typeof m.description !== "string") fail("Movimentação inválida.");
    seen.add(m.id);
    if (m.type === "redemption" && !["available", "goal"].includes(m.source)) fail("Resgate sem origem.");
    if (m.type === "reward-earned") {
      const module = modules.find((item) => item.id === m.moduleId);
      if (!module || rewarded.has(module.id) || !done.has(module.id) || m.amountCents !== module.rewardCents) fail("Recompensa inconsistente.");
      rewarded.add(module.id);
    }
  }
  if ([...done].some((id) => !rewarded.has(id))) fail("Aula concluída sem recompensa.");
  const opening = s.movements.filter((m) => m.id === OPENING_DEPOSIT_ID);
  if (opening.length !== 1 || opening[0].amountCents !== INITIAL_DEPOSIT_CENTS) fail("Depósito inicial ausente.");
  for (const r of s.requests) {
    if (!r.id || !Number.isSafeInteger(r.amountCents) || r.amountCents <= 0 || !["pending", "approved", "declined"].includes(r.status)) fail("Pedido inválido.");
  }

  const b = balances(s);
  if (b.free < 0 || b.available < 0 || b.goal < 0 || b.spendable < 0) fail("Saldo negativo.");
  if (b.locked + b.available + b.goal + b.redeemed !== b.net) fail("A conta não fecha.");
  if (s.goal === null && b.goal !== 0) fail("Dinheiro guardado sem meta.");
}

function clone(s) {
  return JSON.parse(JSON.stringify(s));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      validate(parsed);
      return parsed;
    }
  } catch { /* estado salvo inválido ou armazenamento indisponível */ }
  const fresh = initialState();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch { /* segue em memória */ }
  return fresh;
}

// Aplica uma mudança: valida o estado novo, salva e redesenha. Se algo não fechar, nada muda.
function commit(mutate) {
  const next = clone(state);
  mutate(next);
  try {
    validate(next);
  } catch {
    return false;
  }
  state = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* segue em memória */ }
  render();
  return true;
}

const newId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();

/* ------------------------------------------------------------------
   Selos
   ------------------------------------------------------------------ */

const icons = {
  check: '<path d="M6 12.5l4 4 8-9" />',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>',
  flag: '<path d="M7 20V5m0 0h9l-2 3.5 2 3.5H7" />',
  coin: '<circle cx="12" cy="12" r="7"/><path d="M12 8.5v7M9.8 10.2c0-1 1-1.7 2.2-1.7s2.2.6 2.2 1.5c0 2-4.4 1.2-4.4 3.3 0 .9 1 1.6 2.2 1.6s2.2-.7 2.2-1.7"/>',
  trophy: '<path d="M8 5h8v4a4 4 0 01-8 0V5zM8 7H5.5a2.5 2.5 0 002.7 3M16 7h2.5a2.5 2.5 0 01-2.7 3M12 13v3m-3 3h6m-5-3h4"/>',
  book: '<path d="M5 6.5c2.5-1 5-1 7 .5 2-1.5 4.5-1.5 7-.5v11c-2.5-1-5-1-7 .5-2-1.5-4.5-1.5-7-.5v-11zM12 7v11"/>'
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

function stamps(s = state) {
  const done = new Set(s.completedModuleIds);
  const trackDone = tracks.some((t) => modules.filter((m) => m.track === t.id).every((m) => done.has(m.id)));
  return [
    { id: "primeira", icon: "check", name: "Primeira aula", how: "Conclua uma aula", on: done.size >= 1 },
    { id: "de-primeira", icon: "target", name: "De primeira", how: "Acerte 3 desafios na primeira tentativa", on: s.firstTryIds.length >= 3 },
    { id: "trilha", icon: "flag", name: "Parte completa", how: "Termine as 3 aulas de uma parte da trilha", on: trackDone },
    { id: "poupadora", icon: "coin", name: "Poupadora", how: "Guarde dinheiro na sua meta", on: s.movements.some((m) => m.type === "goal-save") },
    { id: "meta", icon: "trophy", name: "Meta conquistada", how: "Complete uma meta", on: s.goalsAchieved >= 1 },
    { id: "caderno", icon: "book", name: "Caderno completo", how: "Conclua as 6 aulas", on: done.size === modules.length }
  ];
}

/* ------------------------------------------------------------------
   Visão da criança
   ------------------------------------------------------------------ */

function nextModule() {
  return modules.find((m) => !state.completedModuleIds.includes(m.id)) || null;
}

function renderIntro() {
  const next = nextModule();
  const doneCount = state.completedModuleIds.length;
  $("#greeting").textContent = `Oi, ${student.name}!`;
  const b = balances();
  const left = modules.length - doneCount;
  let says;
  if (doneCount === 0) says = "Oi! Eu sou o Pingo. De pingo em pingo, a gente enche o cofrinho. Bora começar?";
  else if (!next) says = "Você completou a trilha inteira! Tô muito orgulhoso de você.";
  else if (b.pending > 0) says = "Seu pedido foi para a família. Enquanto isso, que tal mais uma aula?";
  else if (left === 1) says = "Falta só uma aula para completar a trilha!";
  else says = `Faltam ${left} aulas. A próxima vale ${money(next.rewardCents)}!`;
  $("#pingo-says").textContent = says;
  $("#side-progress-text").textContent = `${doneCount} de ${modules.length} aulas`;
  $("#side-progress-fill").style.width = `${Math.round((doneCount / modules.length) * 100)}%`;
  const button = $("#continue-button");
  if (next) {
    const position = modules.indexOf(next) + 1;
    $("#intro-line").textContent = doneCount === 0
      ? `Sua trilha tem 6 aulas curtas. Cada uma que você terminar libera ${money(next.rewardCents)} da sua mesada.`
      : `Você já fez ${doneCount} de 6 aulas. A próxima é a aula ${position}: ${next.name}`;
    button.textContent = doneCount === 0 ? "Começar a primeira aula" : "Continuar trilha";
    button.dataset.module = next.id;
    button.hidden = false;
  } else {
    $("#intro-line").textContent = "Você terminou todas as aulas da trilha. Agora é cuidar bem do que conquistou.";
    button.hidden = true;
  }
}

function renderTrail() {
  const next = nextModule();
  $("#trail-count").textContent = `${state.completedModuleIds.length} de ${modules.length} aulas concluídas`;
  $("#trail").innerHTML = modules.map((m, i) => {
    const done = state.completedModuleIds.includes(m.id);
    const isNext = next && next.id === m.id;
    const firstOfTrack = i === 0 || modules[i - 1].track !== m.track;
    const status = done ? "Concluída" : isNext ? "Próxima aula" : `Vale ${money(m.rewardCents)}`;
    return `
      <li style="--c: var(--c${i % 4})" class="stop${done ? " is-done" : ""}${isNext ? " is-next" : ""}${firstOfTrack ? " has-track" : ""}">
        ${firstOfTrack ? `<span class="stop-track tape-${tracks.findIndex((t) => t.id === m.track)}">${tracks.find((t) => t.id === m.track).name}</span>` : ""}
        <button class="node" type="button" data-module="${m.id}" aria-label="Aula ${i + 1}: ${m.name}. ${status}">
          ${done ? icon("check") : `<span>${i + 1}</span>`}
        </button>
        <span class="stop-name"><mark>${m.name}</mark></span>
        <span class="stop-status">${status}</span>
      </li>`;
  }).join("");
  requestAnimationFrame(drawTrailLine);
}

// Desenha o caminho que liga as aulas. A parte já percorrida fica em tinta cheia.
function drawTrailLine() {
  const wrap = $(".trail-wrap");
  const svg = $("#trail-line");
  const nodes = [...document.querySelectorAll("#trail .node")];
  if (!wrap || nodes.length === 0) return;
  const box = wrap.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
  const points = nodes.map((node) => {
    const r = node.getBoundingClientRect();
    return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2];
  });
  const vertical = points.length > 1 && Math.abs(points[1][0] - points[0][0]) < 4;
  const path = (pts) => pts.map(([x, y], i) => {
    if (i === 0) return `M${x} ${y}`;
    const [px, py] = pts[i - 1];
    if (vertical) return `L${x} ${y}`;
    const mx = (px + x) / 2;
    return `C${mx} ${py} ${mx} ${y} ${x} ${y}`;
  }).join(" ");
  let doneUntil = -1;
  modules.forEach((m, i) => { if (state.completedModuleIds.includes(m.id) && i === doneUntil + 1) doneUntil = i; });
  svg.innerHTML = `
    <path d="${path(points)}" class="line-todo"/>
    ${doneUntil >= 1 ? `<path d="${path(points.slice(0, doneUntil + 1))}" class="line-done"/>` : ""}
  `;
}

function renderWallet() {
  const b = balances();
  const lastRequest = [...state.requests].reverse()[0];
  let note = "";
  if (b.pending > 0) note = `Você pediu ${money(b.pending)}. Agora é só esperar a família responder.`;
  else if (lastRequest && lastRequest.status === "approved" && !lastRequest.seen) note = `A família aprovou seu pedido de ${money(lastRequest.amountCents)}.`;
  else if (lastRequest && lastRequest.status === "declined" && !lastRequest.seen) note = `A família recusou o pedido de ${money(lastRequest.amountCents)}. Que tal conversar sobre isso?`;
  else if (b.spendable === 0 && b.incomplete > 0) note = "Termine uma aula para liberar dinheiro.";

  $("#wallet").innerHTML = `
    <h3>Seu dinheiro</h3>
    <p class="wallet-main"><span class="wallet-label">Pode usar</span><strong class="amount amount-xl">${money(b.spendable)}</strong></p>
    <dl class="ledger">
      <div><dt>Esperando resposta da família</dt><dd>${money(b.pending)}</dd></div>
      <div><dt>Libera com as próximas aulas</dt><dd>${money(b.incomplete)}</dd></div>
      <div><dt>Guardado na meta</dt><dd>${money(b.goal)}</dd></div>
      <div><dt>Já recebido</dt><dd>${money(b.redeemed)}</dd></div>
    </dl>
    ${b.spendable > 0 ? `<button id="request-button" class="button button-primary" type="button">Pedir ${money(b.spendable)} para a família</button>` : ""}
    ${note ? `<p class="hint">${esc(note)}</p>` : ""}
  `;
}

function renderGoal() {
  const b = balances();
  const goal = state.goal;
  if (!goal) {
    $("#goal").innerHTML = `
      <h3>Sua meta</h3>
      <p class="goal-empty">${state.goalsAchieved > 0 ? `Você já conquistou ${state.goalsAchieved} ${state.goalsAchieved === 1 ? "meta" : "metas"}. Qual é a próxima?` : "Tem alguma coisa que você quer muito? Crie uma meta e guarde o dinheiro das aulas nela."}</p>
      <form id="goal-form" class="goal-form">
        <label>O que você quer<input name="name" type="text" maxlength="40" placeholder="Uma bicicleta, um livro…" required></label>
        <label>Quanto custa
          <span class="money-input"><span aria-hidden="true">R$</span><input name="target" type="number" min="1" max="5000" step="0.01" inputmode="decimal" placeholder="0,00" required></span>
        </label>
        <button class="button button-secondary" type="submit">Criar meta</button>
      </form>`;
    return;
  }
  const pct = Math.min(100, Math.round((b.goal / goal.targetCents) * 100));
  const missing = Math.max(0, goal.targetCents - b.goal);
  const canSave = Math.min(b.spendable, missing);
  const reached = missing === 0;
  $("#goal").innerHTML = `
    <h3>Sua meta</h3>
    <p class="goal-name">${esc(goal.name)}</p>
    <div class="ruler" role="progressbar" aria-label="Quanto já foi guardado" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
      <div class="ruler-fill" style="width:${pct}%"></div>
    </div>
    <p class="goal-numbers"><strong class="amount">${money(b.goal)}</strong> de ${money(goal.targetCents)}</p>
    <p class="goal-missing">${reached ? "Você chegou lá." : `Faltam ${money(missing)}.`}${b.contributions > 0 ? ` A família ajudou com ${money(b.contributions)}.` : ""}</p>
    <div class="goal-actions">
      ${reached
        ? '<button class="button button-primary" type="button" data-goal="achieve">Usar o dinheiro da meta</button>'
        : canSave > 0 ? `<button class="button button-secondary" type="button" data-goal="save">Guardar ${money(canSave)}</button>` : '<p class="muted">Quando você liberar mais dinheiro nas aulas, dá para guardar aqui.</p>'}
      ${b.goal === 0 ? '<button class="link" type="button" data-goal="remove">Trocar de meta</button>' : ""}
    </div>`;
}

function renderStamps() {
  const list = stamps();
  $("#stamps-count").textContent = `${list.filter((s) => s.on).length} de ${list.length}`;
  $("#stamps").innerHTML = list.map((s, i) => `
    <li class="sticker${s.on ? " is-on" : ""}" style="--c: var(--c${i % 4}); --tilt: ${[-4, 3, -2, 5, -5, 2][i]}deg">
      <span class="sticker-face">${s.on ? icon(s.icon) : `<span class="sticker-number">${i + 1}</span>`}</span>
      <span class="stamp-name">${s.name}</span>
      <span class="stamp-how">${s.on ? "Colada no álbum" : s.how}</span>
    </li>`).join("");
}

/* ------------------------------------------------------------------
   Aula e desafio
   ------------------------------------------------------------------ */

function openLesson(moduleId) {
  const module = modules.find((m) => m.id === moduleId);
  if (!module) return;
  lesson = { module, step: "read", tries: 0, result: null };
  renderLesson();
  $("#lesson-dialog").showModal();
}

function renderLesson() {
  const { module, step, result } = lesson;
  const position = modules.indexOf(module) + 1;
  const done = state.completedModuleIds.includes(module.id);
  const steps = `<ol class="sheet-steps" aria-label="Etapas"><li class="is-on">Leitura</li><li class="${step === "quiz" ? "is-on" : ""}">Desafio</li></ol>`;

  if (step === "read") {
    $("#lesson-body").innerHTML = `
      ${steps}
      <p class="sheet-kicker">Aula ${position} de ${modules.length}</p>
      <h2 id="lesson-title">${module.name}</h2>
      ${module.lesson.map((p) => `<p class="lesson-p">${p}</p>`).join("")}
      <aside class="lesson-tip"><svg class="tip-pingo" aria-hidden="true"><use href="#pingo"/></svg><div><strong>Dica do Pingo</strong><p>${module.tip}</p></div></aside>
      <div class="sheet-actions"><button class="button button-primary" type="button" data-step="quiz">${done ? "Refazer o desafio" : "Ir para o desafio"}</button></div>`;
    return;
  }

  $("#lesson-body").innerHTML = `
    ${steps}
    <p class="sheet-kicker">Desafio da aula ${position}</p>
    <h2 id="lesson-title">${module.question}</h2>
    <div class="options">
      ${module.options.map((option, i) => {
        let cls = "";
        if (result && result.correct && i === module.answer) cls = " is-right";
        if (result && !result.correct && i === result.choice) cls = " is-wrong";
        return `<button class="option${cls}" type="button" data-choice="${i}"${result && result.correct ? " disabled" : ""}><span class="option-key">${"ABC"[i]}</span><span>${option}</span></button>`;
      }).join("")}
    </div>
    ${result && result.correct ? `
      <div class="celebrate" role="status">
        <div class="burst" aria-hidden="true">${Array.from({ length: 14 }, (_, k) => `<i style="--a:${k * 25.7}deg; --d:${60 + (k % 3) * 18}px; --c: var(--c${k % 4})"></i>`).join("")}</div>
        <svg class="celebrate-pingo" aria-hidden="true"><use href="#pingo-feliz"/></svg>
        <p><strong>${result.headline}</strong> ${module.explain}</p>
      </div>` : ""}
    ${result && !result.correct ? '<p class="answer-note is-wrong" role="status">Quase! Releia a aula se quiser e tente de novo. O Pingo acredita em você.</p>' : ""}
    <div class="sheet-actions">
      ${result && result.correct
        ? '<button class="button button-primary" type="button" data-step="close">Voltar para a trilha</button>'
        : '<button class="link" type="button" data-step="read">Reler a aula</button>'}
    </div>`;
}

function answer(choice) {
  const { module } = lesson;
  const correct = choice === module.answer;
  const alreadyDone = state.completedModuleIds.includes(module.id);
  lesson.tries += 1;

  if (alreadyDone) {
    lesson.result = { correct, choice, headline: "Isso mesmo." };
    renderLesson();
    return;
  }

  const stampsBefore = new Set(stamps().filter((s) => s.on).map((s) => s.id));
  const ok = commit((s) => {
    s.attempts[module.id] = (s.attempts[module.id] || 0) + 1;
    if (correct) {
      s.completedModuleIds.push(module.id);
      if (s.attempts[module.id] === 1) s.firstTryIds.push(module.id);
      s.movements.push({ id: `reward:${module.id}`, type: "reward-earned", moduleId: module.id, amountCents: module.rewardCents, date: now(), description: `Aula concluída: ${module.name}` });
    }
  });
  lesson.result = { correct, choice, headline: ok ? `Acertou! +${money(module.rewardCents)} no seu cofrinho.` : "Acertou!" };
  renderLesson();
  if (correct && ok) {
    const fresh = stamps().find((s) => s.on && !stampsBefore.has(s.id));
    if (fresh) toast(`Figurinha nova: ${fresh.name}`);
  }
}

/* ------------------------------------------------------------------
   Ações da criança
   ------------------------------------------------------------------ */

function requestMoney() {
  const b = balances();
  if (b.spendable <= 0) return;
  if (commit((s) => {
    s.requests.forEach((r) => { r.seen = true; });
    s.requests.push({ id: newId("request"), amountCents: b.spendable, status: "pending", date: now() });
  })) toast(`Pedido de ${money(b.spendable)} enviado para a família.`);
}

function createGoal(form) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim().slice(0, 40);
  const targetCents = Math.round(Number(data.get("target")) * 100);
  if (!name || !Number.isSafeInteger(targetCents) || targetCents <= 0) return;
  commit((s) => { s.goal = { name, targetCents, createdAt: now() }; });
}

function saveToGoal() {
  const b = balances();
  const amount = Math.min(b.spendable, state.goal.targetCents - b.goal);
  if (amount <= 0) return;
  const hadStamp = stamps().find((s) => s.id === "poupadora").on;
  if (commit((s) => s.movements.push({ id: newId("goal-save"), type: "goal-save", amountCents: amount, date: now(), description: `Guardado na meta: ${s.goal.name}` }))) {
    toast(hadStamp ? `${money(amount)} guardados na meta.` : "Figurinha nova: Poupadora");
  }
}

function achieveGoal() {
  const b = balances();
  const goal = state.goal;
  if (!goal || b.goal < goal.targetCents) return;
  if (commit((s) => {
    s.movements.push({ id: newId("redemption"), type: "redemption", source: "goal", amountCents: b.goal, date: now(), description: `Meta conquistada: ${goal.name}` });
    s.goal = null;
    s.goalsAchieved += 1;
  })) toast(`Meta conquistada: ${goal.name}`);
}

/* ------------------------------------------------------------------
   Visão da família
   ------------------------------------------------------------------ */

function renderFamily() {
  const b = balances();
  const pending = state.requests.filter((r) => r.status === "pending");

  const badge = $("#family-badge");
  badge.hidden = pending.length === 0;
  badge.textContent = pending.length;
  badge.setAttribute("aria-label", `${pending.length} pedido${pending.length === 1 ? "" : "s"} esperando resposta`);
  const navBadge = $("#nav-requests-badge");
  navBadge.hidden = pending.length === 0;
  navBadge.textContent = pending.length;

  const summary = [
    ["Mesada depositada", b.deposits - b.withdrawals, "Total que você colocou, menos retiradas"],
    ["Liberado pelas aulas", b.earned, `${state.completedModuleIds.length} de ${modules.length} aulas concluídas`],
    ["Guardado na meta", b.goal, state.goal ? state.goal.name : "Sem meta no momento"],
    ["Já recebido pela Sofia", b.redeemed, "Pedidos aprovados e metas usadas"],
    ["Saldo livre", b.free, "Pode retirar quando quiser"]
  ];
  $("#family-summary").innerHTML = summary.map(([label, value, help]) => `
    <div class="summary-item"><dt>${label}</dt><dd><span class="amount">${money(value)}</span><small>${esc(help)}</small></dd></div>`).join("");

  // Pedidos
  const decided = state.requests.filter((r) => r.status !== "pending").slice(-3).reverse();
  $("#requests").innerHTML = `
    <div class="block-head">
      <h2 id="requests-title">Pedidos da Sofia</h2>
      <p class="section-note">${pending.length ? "Esperando sua resposta." : "Nenhum pedido esperando resposta."}</p>
    </div>
    ${pending.map((r) => `
      <div class="request">
        <div class="request-copy">
          <strong>${student.name} pediu ${money(r.amountCents)}</strong>
          <span>Dinheiro liberado nas aulas, pedido em ${fullDate.format(new Date(r.date))}</span>
        </div>
        <div class="request-actions">
          <button class="button button-ghost" type="button" data-request="${r.id}" data-decision="declined">Recusar</button>
          <button class="button button-primary" type="button" data-request="${r.id}" data-decision="approved">Aprovar e entregar</button>
        </div>
      </div>`).join("")}
    ${decided.length ? `<ul class="request-log">${decided.map((r) => `<li>${shortDate.format(new Date(r.date))}: pedido de ${money(r.amountCents)} ${r.status === "approved" ? "aprovado" : "recusado"}</li>`).join("")}</ul>` : ""}
  `;
  $("#requests").classList.toggle("has-pending", pending.length > 0);

  // Aulas
  const firstTry = state.firstTryIds.length;
  $("#learning-note").textContent = state.completedModuleIds.length
    ? `${firstTry} de ${state.completedModuleIds.length} desafios acertados na primeira tentativa.`
    : "A Sofia ainda não começou a trilha.";
  $("#lessons-body").innerHTML = modules.map((m, i) => {
    const done = state.completedModuleIds.includes(m.id);
    const tries = state.attempts[m.id] || 0;
    const reward = state.movements.find((mv) => mv.type === "reward-earned" && mv.moduleId === m.id);
    let status = '<span class="status status-todo">Não começou</span>';
    if (done) status = `<span class="status status-done">Concluída em ${shortDate.format(new Date(reward.date))}</span>`;
    else if (tries > 0) status = '<span class="status status-trying">Tentando</span>';
    return `
      <tr>
        <th scope="row"><span class="lesson-index">${i + 1}</span>${m.name}</th>
        <td>${status}</td>
        <td>${tries === 0 ? "–" : tries}${done && tries === 1 ? " <span class=\"muted\">(de primeira)</span>" : ""}</td>
        <td class="num">${money(m.rewardCents)}</td>
      </tr>`;
  }).join("");

  // Meta
  const goal = state.goal;
  if (!goal) {
    $("#family-goal").innerHTML = `<p class="muted">${state.goalsAchieved ? `A Sofia já conquistou ${state.goalsAchieved} ${state.goalsAchieved === 1 ? "meta" : "metas"} e ainda não criou a próxima.` : "A Sofia ainda não criou uma meta. Uma boa conversa: o que ela gostaria de conquistar?"}</p>`;
  } else {
    const pct = Math.min(100, Math.round((b.goal / goal.targetCents) * 100));
    const missing = Math.max(0, goal.targetCents - b.goal);
    $("#family-goal").innerHTML = `
      <p class="goal-name">${esc(goal.name)}</p>
      <div class="ruler" role="progressbar" aria-label="Progresso da meta" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="ruler-fill" style="width:${pct}%"></div></div>
      <p class="goal-numbers"><strong class="amount">${money(b.goal)}</strong> de ${money(goal.targetCents)}${b.contributions ? `, sendo ${money(b.contributions)} da família` : ""}</p>
      ${missing > 0 ? `
        <form id="contribution-form" class="op-form op-inline">
          <label for="contribution-amount">Ajudar na meta</label>
          <div class="money-input"><span aria-hidden="true">R$</span><input id="contribution-amount" type="number" min="0.01" max="${(missing / 100).toFixed(2)}" step="0.01" inputmode="decimal" placeholder="até ${money(missing).replace("R$", "").trim()}" required></div>
          <button class="button button-secondary" type="submit">Colocar na meta</button>
        </form>` : '<p class="muted">Meta completa. A Sofia já pode usar o dinheiro.</p>'}`;
  }

  // Operações
  $("#free-balance").textContent = money(b.free);
  $("#withdrawal-amount").max = (b.free / 100).toFixed(2);
  $("#withdrawal-form button").disabled = b.free === 0;
  $("#withdrawal-amount").disabled = b.free === 0;

  renderHistory();
}

function renderHistory() {
  const kinds = {
    deposit: { label: "Depósito", dir: "in" },
    withdrawal: { label: "Retirada", dir: "out" },
    "reward-earned": { label: "Liberado por aula", dir: "move" },
    redemption: { label: "Entregue à Sofia", dir: "out" },
    "goal-save": { label: "Sofia guardou na meta", dir: "move" },
    "goal-contribution": { label: "Ajuda na meta", dir: "in" }
  };
  const rows = [...state.movements]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .filter((m) => historyFilter === "all" || kinds[m.type].dir === historyFilter);
  $("#history").innerHTML = rows.length ? rows.map((m) => {
    const k = kinds[m.type];
    const sign = k.dir === "in" ? "+" : k.dir === "out" ? "−" : "";
    return `
      <li class="entry entry-${k.dir}">
        <time datetime="${m.date}">${fullDate.format(new Date(m.date))}</time>
        <span class="entry-copy"><strong>${k.label}</strong><span>${esc(m.description)}</span></span>
        <span class="entry-amount">${sign}${money(m.amountCents)}</span>
      </li>`;
  }).join("") : '<li class="muted">Nada por aqui com esse filtro.</li>';
}

function decideRequest(id, decision) {
  const request = state.requests.find((r) => r.id === id && r.status === "pending");
  if (!request) return;
  const ok = commit((s) => {
    const r = s.requests.find((item) => item.id === id);
    r.status = decision;
    r.seen = false;
    r.decidedAt = now();
    if (decision === "approved") {
      s.movements.push({ id: newId("redemption"), type: "redemption", source: "available", amountCents: r.amountCents, date: now(), description: "Pedido da Sofia aprovado" });
    }
  });
  if (ok) toast(decision === "approved" ? `Pedido aprovado. Entregue ${money(request.amountCents)} à Sofia.` : "Pedido recusado.");
}

function askConfirm({ title, message, action, onConfirm }) {
  pendingConfirm = onConfirm;
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  $("#confirm-ok").textContent = action;
  $("#confirm-dialog").returnValue = "";
  $("#confirm-dialog").showModal();
}

function feedback(message, kind = "") {
  const el = $("#ops-feedback");
  el.textContent = message;
  el.className = `feedback${kind ? ` is-${kind}` : ""}`;
}

/* ------------------------------------------------------------------
   Geral
   ------------------------------------------------------------------ */

function render() {
  renderIntro();
  renderTrail();
  renderWallet();
  renderGoal();
  renderStamps();
  renderFamily();
}

let toastTimer;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.hidden = false;
  el.classList.remove("is-leaving");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add("is-leaving");
    setTimeout(() => { el.hidden = true; }, 300);
  }, 3200);
}

function showView(view) {
  const family = view === "family";
  $("#student-view").hidden = family;
  $("#family-view").hidden = !family;
  $("#tab-student").setAttribute("aria-selected", String(!family));
  $("#tab-family").setAttribute("aria-selected", String(family));
  document.body.classList.toggle("is-family", family);
  $("#nav-student").hidden = family;
  $("#nav-family").hidden = !family;
  $("#side-progress").hidden = family;
  const nav = family ? "#nav-family" : "#nav-student";
  document.querySelectorAll(`${nav} .nav-link`).forEach((link, i) => {
    link.classList.toggle("is-active", i === 0);
    if (i === 0) link.setAttribute("aria-current", "true"); else link.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "auto" });
  if (!family) requestAnimationFrame(drawTrailLine);
}

/* ------------------------------------------------------------------
   Eventos
   ------------------------------------------------------------------ */

$("#tab-student").addEventListener("click", () => showView("student"));
$("#tab-family").addEventListener("click", () => showView("family"));
$(".view-toggle").addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const target = document.activeElement.id === "tab-student" ? "#tab-family" : "#tab-student";
  $(target).focus();
  showView(target === "#tab-family" ? "family" : "student");
});

$("#continue-button").addEventListener("click", (event) => openLesson(event.currentTarget.dataset.module));
$("#trail").addEventListener("click", (event) => {
  const node = event.target.closest("[data-module]");
  if (node) openLesson(node.dataset.module);
});

$("#lesson-body").addEventListener("click", (event) => {
  const choice = event.target.closest("[data-choice]");
  if (choice && !choice.disabled) { answer(Number(choice.dataset.choice)); return; }
  const step = event.target.closest("[data-step]")?.dataset.step;
  if (step === "quiz") { lesson.step = "quiz"; lesson.result = null; renderLesson(); }
  if (step === "read") { lesson.step = "read"; lesson.result = null; renderLesson(); }
  if (step === "close") $("#lesson-dialog").close();
});
$("#lesson-close").addEventListener("click", () => $("#lesson-dialog").close());
$("#lesson-dialog").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });

$("#wallet").addEventListener("click", (event) => { if (event.target.closest("#request-button")) requestMoney(); });
$("#goal").addEventListener("submit", (event) => { if (event.target.id === "goal-form") { event.preventDefault(); createGoal(event.target); } });
$("#goal").addEventListener("click", (event) => {
  const action = event.target.closest("[data-goal]");
  if (!action || action.disabled) return;
  if (action.dataset.goal === "save") saveToGoal();
  if (action.dataset.goal === "achieve") achieveGoal();
  if (action.dataset.goal === "remove") commit((s) => { s.goal = null; });
});

$("#requests").addEventListener("click", (event) => {
  const button = event.target.closest("[data-request]");
  if (!button) return;
  const request = state.requests.find((r) => r.id === button.dataset.request);
  if (button.dataset.decision === "approved") {
    askConfirm({
      title: `Aprovar ${money(request.amountCents)}?`,
      message: "O valor sai do saldo da Sofia no app. Combine com ela como vai entregar o dinheiro.",
      action: "Aprovar",
      onConfirm: () => decideRequest(request.id, "approved")
    });
  } else {
    decideRequest(request.id, "declined");
  }
});

$("#family-goal").addEventListener("submit", (event) => {
  if (event.target.id !== "contribution-form") return;
  event.preventDefault();
  const cents = Math.round($("#contribution-amount").valueAsNumber * 100);
  const missing = state.goal.targetCents - balances().goal;
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > missing) return;
  askConfirm({
    title: `Colocar ${money(cents)} na meta?`,
    message: `O valor vai direto para a meta "${state.goal.name}".`,
    action: "Colocar na meta",
    onConfirm: () => {
      if (commit((s) => s.movements.push({ id: newId("goal-contribution"), type: "goal-contribution", amountCents: cents, date: now(), description: `Para a meta: ${s.goal.name}` }))) {
        toast(`${money(cents)} colocados na meta da Sofia.`);
      }
    }
  });
});

$("#deposit-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const cents = Math.round($("#deposit-amount").valueAsNumber * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0) { feedback("Digite um valor maior que zero.", "warn"); return; }
  askConfirm({
    title: `Depositar ${money(cents)}?`,
    message: "O valor entra como saldo livre da mesada.",
    action: "Depositar",
    onConfirm: () => {
      if (commit((s) => s.movements.push({ id: newId("deposit"), type: "deposit", amountCents: cents, date: now(), description: "Depósito extra" }))) {
        feedback(`Depósito de ${money(cents)} feito.`, "ok");
        event.target.reset();
      }
    }
  });
});

$("#withdrawal-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const cents = Math.round($("#withdrawal-amount").valueAsNumber * 100);
  const free = balances().free;
  if (!Number.isSafeInteger(cents) || cents <= 0) { feedback("Digite um valor maior que zero.", "warn"); return; }
  if (cents > free) { feedback(`O saldo livre é ${money(free)}. O dinheiro das aulas fica reservado para a Sofia.`, "warn"); return; }
  askConfirm({
    title: `Retirar ${money(cents)}?`,
    message: "O valor sai do saldo livre. O que a Sofia já ganhou nas aulas não é afetado.",
    action: "Retirar",
    onConfirm: () => {
      if (commit((s) => s.movements.push({ id: newId("withdrawal"), type: "withdrawal", amountCents: cents, date: now(), description: "Retirada do saldo livre" }))) {
        feedback(`Retirada de ${money(cents)} feita.`, "ok");
        event.target.reset();
      }
    }
  });
});

$("#confirm-dialog").addEventListener("close", () => {
  const run = pendingConfirm;
  pendingConfirm = null;
  if ($("#confirm-dialog").returnValue === "ok" && run) run();
});

document.querySelector(".filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  historyFilter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach((b) => {
    const on = b === button;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", String(on));
  });
  renderHistory();
});

$("#reset-demo").addEventListener("click", () => {
  state = initialState();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* segue em memória */ }
  render();
  toast("Demonstração recomeçada.");
});

window.addEventListener("resize", () => requestAnimationFrame(drawTrailLine));

// Menu lateral: destaca a seção que está na tela.
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const nav = entry.target.closest("#family-view") ? "#nav-family" : "#nav-student";
    document.querySelectorAll(`${nav} .nav-link`).forEach((link) => {
      const on = link.getAttribute("href") === `#${entry.target.id}`;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "true"); else link.removeAttribute("aria-current");
    });
  });
}, { rootMargin: "-20% 0px -75% 0px" });
["trilha", "dinheiro", "figurinhas", "resumo", "requests", "aulas", "meta", "mesada", "extrato"].forEach((id) => sectionObserver.observe(document.getElementById(id)));
document.fonts?.ready.then(() => requestAnimationFrame(drawTrailLine));

state = load();
render();
