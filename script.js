const levelPoints = [1, 2, 3];
const scored = [false, false, false];

// ── localStorage helpers ──────────────────────────────────────────────
const STORAGE_KEY = 'make11_history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveToday(score, levelsScored) {
  const history = loadHistory();
  const todayStr = new Date().toISOString().slice(0, 10);
  const existing = history.findIndex(e => e.date === todayStr);
  const entry = { date: todayStr, score, levels: levelsScored };
  if (existing >= 0) history[existing] = entry;
  else history.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

// ── Tab switching ─────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.remove('hidden');
  event.target.classList.add('active');
  if (name === 'stats') renderStats();
}

// ── Stats rendering ───────────────────────────────────────────────────
function renderStats() {
  const history = loadHistory().sort((a, b) => a.date.localeCompare(b.date));

  // Summary numbers
  const played = history.length;
  const avg = played ? (history.reduce((s, e) => s + e.score, 0) / played).toFixed(1) : '0.0';

  // Streak calculation
  let streak = 0, bestStreak = 0, current = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (let i = history.length - 1; i >= 0; i--) {
    const expected = new Date(Date.now() - (history.length - 1 - i) * 86400000 * 0).toISOString().slice(0,10);
    // Walk backwards from today counting consecutive days
    if (i === history.length - 1) {
      streak = (history[i].date === today) ? 1 : 0;
    } else {
      const prev = new Date(history[i + 1].date);
      const curr = new Date(history[i].date);
      const diffDays = Math.round((prev - curr) / 86400000);
      if (diffDays === 1 && streak > 0) streak++;
      else if (i === history.length - 2 && history[i].date !== today) streak = 0;
    }
  }
  // Simpler streak: count backwards from today
  streak = 0;
  const dateSet = new Set(history.map(e => e.date));
  let check = new Date();
  while (true) {
    const ds = check.toISOString().slice(0, 10);
    if (dateSet.has(ds)) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }
  // Best streak
  let run = 0;
  for (let i = 0; i < history.length; i++) {
    if (i === 0) { run = 1; }
    else {
      const prev = new Date(history[i-1].date);
      const curr = new Date(history[i].date);
      const diff = Math.round((curr - prev) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    }
    bestStreak = Math.max(bestStreak, run);
  }

  document.getElementById('stat-played').textContent = played;
  document.getElementById('stat-avg').textContent = avg;
  document.getElementById('stat-streak').textContent = streak;
  document.getElementById('stat-best-streak').textContent = bestStreak;

  // Score distribution (0–6)
  const counts = Array(7).fill(0);
  history.forEach(e => counts[e.score]++);
  const maxCount = Math.max(...counts, 1);
  const todayScore = history.find(e => e.date === today)?.score ?? null;

  const distEl = document.getElementById('score-distribution');
  distEl.innerHTML = counts.map((count, pts) => {
    const pct = Math.round((count / maxCount) * 100);
    const isToday = pts === todayScore;
    return `
      <div class="dist-row">
        <div class="dist-label">${pts}</div>
        <div class="dist-bar-wrap">
          <div class="dist-bar ${isToday ? 'today' : ''}" style="width: ${pct || 2}%">
            ${count > 0 ? count : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  // Recent history list
  const histEl = document.getElementById('history-list');
  if (!history.length) {
    histEl.innerHTML = '<p class="no-history">No games played yet. Come back after today\'s puzzle!</p>';
    return;
  }
  histEl.innerHTML = [...history].reverse().slice(0, 30).map(e => {
    const stars = '⭐'.repeat(e.score) + '·'.repeat(6 - e.score);
    const isToday = e.date === today;
    return `
      <div class="history-row ${isToday ? 'today' : ''}">
        <span class="history-date">${formatDate(e.date)}${isToday ? ' <em>today</em>' : ''}</span>
        <span class="history-stars">${stars}</span>
        <span class="history-score">${e.score}/6</span>
      </div>`;
  }).join('');
}

function formatDate(str) {
  const [y, m, d] = str.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Puzzle loading ────────────────────────────────────────────────────
fetch('puzzles.json')
  .then(res => res.json())
  .then(data => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPuzzle = data.find(p => p.date === todayStr);
    const container = document.getElementById('levels-container');

    if (!todayPuzzle) {
      container.innerHTML = "<p>No puzzle for today.</p>";
      return;
    }

    // Check if already completed today
    const history = loadHistory();
    const todayEntry = history.find(e => e.date === todayStr);
    if (todayEntry) {
      todayEntry.levels.forEach((earned, i) => { scored[i] = earned; });
    }

    // Score banner
    const scoreBanner = document.createElement('div');
    scoreBanner.id = 'score-banner';
    scoreBanner.innerHTML = `
      <span id="daily-score">Daily Score: 0 / 6</span>
      <div class="score-stars">
        ${[0,1,2,3,4,5].map(i => `<span class="star" id="star-${i}">⭐</span>`).join('')}
      </div>
    `;
    container.appendChild(scoreBanner);

    todayPuzzle.levels.forEach((level, index) => {
      const pts = levelPoints[index];
      const levelDiv = document.createElement('div');
      levelDiv.className = `level level-${index}`;
      levelDiv.id = `level-card-${index}`;

      const numberChips = level.numbers.map(n => `<span>${n}</span>`).join('');

      levelDiv.innerHTML = `
        <h2>Level ${index + 1} <span class="level-points">${pts} pt${pts > 1 ? 's' : ''}</span></h2>
        <div class="numbers-display">${numberChips}</div>
        <div class="input-row">
          <input type="text" placeholder="e.g. (3*4)-1" id="input-${index}">
          <button class="check-btn" onclick="checkAnswer(${index}, [${level.numbers.join(', ')}])">Check</button>
        </div>
        <button class="surrender-btn" onclick="surrender(${index}, [${level.numbers.join(', ')}])">🏳️ Give up &amp; reveal answer</button>
        <p class="feedback" id="feedback-${index}"></p>
        <p class="level-score" id="score-${index}"></p>
      `;
      container.appendChild(levelDiv);
    });

    // Restore already-scored state
    updateScoreBanner();
    scored.forEach((earned, i) => {
      if (earned) {
        const pts = levelPoints[i];
        document.getElementById(`feedback-${i}`).textContent = '🎆 Correct!';
        document.getElementById(`feedback-${i}`).classList.add('correct');
        document.getElementById(`score-${i}`).textContent = `+${pts} point${pts > 1 ? 's' : ''} earned!`;
        document.getElementById(`score-${i}`).className = 'level-score earned';
      }
    });
  });

// ── Score banner ──────────────────────────────────────────────────────
function updateScoreBanner() {
  const total = scored.reduce((sum, earned, i) => sum + (earned ? levelPoints[i] : 0), 0);
  document.getElementById('daily-score').textContent = `Daily Score: ${total} / 6`;
  for (let i = 0; i < 6; i++) {
    document.getElementById(`star-${i}`).classList.toggle('lit', i < total);
  }
  saveToday(total, [...scored]);
}

// ── Helpers ───────────────────────────────────────────────────────────
function permute(arr) {
  if (arr.length <= 1) return [arr];
  let result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = permute([...arr.slice(0,i), ...arr.slice(i+1)]);
    for (const r of rest) result.push([arr[i], ...r]);
  }
  return result;
}

function opCombos(length) {
  if (length === 0) return [[]];
  const smaller = opCombos(length - 1);
  let result = [];
  for (const s of smaller) {
    for (const op of ['+','-','*','/']) result.push([...s, op]);
  }
  return result;
}

function evalLTR(nums, ops) {
  let res = nums[0];
  for (let i = 0; i < ops.length; i++) {
    const n = nums[i+1], op = ops[i];
    if (op === '+') res += n;
    else if (op === '-') res -= n;
    else if (op === '*') res *= n;
    else if (op === '/') {
      if (n === 0 || res % n !== 0) return null;
      res = Math.floor(res / n);
    }
  }
  return res;
}

function animateCard(index, type) {
  const card = document.getElementById(`level-card-${index}`);
  card.classList.remove('pop', 'shake');
  void card.offsetWidth;
  card.classList.add(type);
  card.addEventListener('animationend', () => card.classList.remove(type), { once: true });
}

// ── Game logic ────────────────────────────────────────────────────────
function checkAnswer(levelIndex, numbers) {
  const input = document.getElementById(`input-${levelIndex}`).value.replace(/\s/g,'');
  const feedback = document.getElementById(`feedback-${levelIndex}`);
  const scoreEl = document.getElementById(`score-${levelIndex}`);

  if (scored[levelIndex]) return;

  let depth = 0;
  for (const ch of input) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if ((ch === '*' || ch === '/') && depth === 0) {
      feedback.textContent = "Wrap * and / in parentheses, e.g. (3*4)+2";
      feedback.classList.remove("correct");
      animateCard(levelIndex, 'shake');
      return;
    }
  }

  const numsUsed = input.match(/\d+/g)?.map(Number) || [];
  if ([...numsUsed].sort().join(',') !== [...numbers].sort().join(',')) {
    feedback.textContent = "No, try again!";
    feedback.classList.remove("correct");
    animateCard(levelIndex, 'shake');
    return;
  }

  let isValid = false;
  outer: for (const perm of permute(numbers)) {
    for (const opCombo of opCombos(numbers.length - 1)) {
      if (evalLTR(perm, opCombo) === 11) { isValid = true; break outer; }
    }
  }

  if (isValid) {
    scored[levelIndex] = true;
    const pts = levelPoints[levelIndex];
    feedback.textContent = "🎆 Correct!";
    feedback.classList.add("correct");
    scoreEl.textContent = `+${pts} point${pts > 1 ? 's' : ''} earned!`;
    scoreEl.className = 'level-score earned';
    animateCard(levelIndex, 'pop');
    updateScoreBanner();
  } else {
    feedback.textContent = "No, try again!";
    feedback.classList.remove("correct");
    animateCard(levelIndex, 'shake');
  }
}

function surrender(levelIndex, numbers) {
  const feedback = document.getElementById(`feedback-${levelIndex}`);
  const scoreEl = document.getElementById(`score-${levelIndex}`);
  if (scored[levelIndex]) return;

  for (const perm of permute(numbers)) {
    for (const ops of opCombos(numbers.length - 1)) {
      if (evalLTR(perm, ops) === 11) {
        let expr = String(perm[0]);
        for (let i = 0; i < ops.length; i++) {
          expr = `(${expr} ${ops[i]} ${perm[i+1]})`;
        }
        expr = expr.slice(1, -1);
        feedback.textContent = `🏳️ Answer: ${expr} = 11`;
        feedback.classList.remove("correct");
        scoreEl.textContent = `0 points earned`;
        scoreEl.className = 'level-score';
        return;
      }
    }
  }
  feedback.textContent = "🏳️ No solution found.";
  feedback.classList.remove("correct");
}
