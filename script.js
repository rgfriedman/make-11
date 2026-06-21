const levelPoints = [1, 2, 3];
const scored = [false, false, false];

// Load today's puzzle
fetch('puzzles.json')
  .then(res => res.json())
  .then(data => {
    const todayStr = new Date().toISOString().slice(0,10);
    const todayPuzzle = data.find(p => p.date === todayStr);
    const container = document.getElementById('levels-container');

    if (!todayPuzzle) {
      container.innerHTML = "<p>No puzzle for today.</p>";
      return;
    }

    // Daily score banner
    const scoreBanner = document.createElement('div');
    scoreBanner.id = 'score-banner';
    scoreBanner.innerHTML = `<span id="daily-score">Daily Score: 0 / 6</span>`;
    container.appendChild(scoreBanner);

    todayPuzzle.levels.forEach((level, index) => {
      const pts = levelPoints[index];
      const levelDiv = document.createElement('div');
      levelDiv.className = 'level';
      levelDiv.innerHTML = `
        <h2>Level ${index + 1} <span class="level-points">(${pts} pt${pts > 1 ? 's' : ''})</span></h2>
        <p>Numbers: ${level.numbers.join(', ')}</p>
        <input type="text" placeholder="Type your equation" id="input-${index}">
        <button onclick="checkAnswer(${index}, [${level.numbers.join(', ')}])">Check</button>
        <button class="surrender-btn" onclick="surrender(${index}, [${level.numbers.join(', ')}])">🏳️ Surrender</button>
        <p id="feedback-${index}"></p>
        <p id="score-${index}" class="level-score"></p>
      `;
      container.appendChild(levelDiv);
    });
  });

function updateScoreBanner() {
  const total = scored.reduce((sum, earned, i) => sum + (earned ? levelPoints[i] : 0), 0);
  document.getElementById('daily-score').textContent = `Daily Score: ${total} / 6`;
}

// Shared helpers
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
    let n = nums[i+1];
    let op = ops[i];
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

// Check answer with all permutations
function checkAnswer(levelIndex, numbers) {
  const input = document.getElementById(`input-${levelIndex}`).value.replace(/\s/g,'');
  const feedback = document.getElementById(`feedback-${levelIndex}`);
  const scoreEl = document.getElementById(`score-${levelIndex}`);

  if (scored[levelIndex]) return;

  // Require parentheses around * and /
  let depth = 0;
  for (const ch of input) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if ((ch === '*' || ch === '/') && depth === 0) {
      feedback.textContent = "Use parentheses around * and / (e.g. (3*4)+2)";
      feedback.classList.remove("correct");
      return;
    }
  }

  // Extract numbers from user input
  const numsUsed = input.match(/\d+/g)?.map(Number) || [];

  // Quick check: all numbers must be used once
  const numsSorted = [...numsUsed].sort();
  const targetSorted = [...numbers].sort();
  if (numsSorted.join(',') !== targetSorted.join(',')) {
    feedback.textContent = "No, try again!";
    feedback.classList.remove("correct");
    return;
  }

  // Check if any permutation with operators gives 11
  let isValid = false;
  for (const perm of permute(numbers)) {
    for (const opCombo of opCombos(numbers.length - 1)) {
      if (evalLTR(perm, opCombo) === 11) {
        isValid = true;
        break;
      }
    }
    if (isValid) break;
  }

  if (isValid) {
    scored[levelIndex] = true;
    const pts = levelPoints[levelIndex];
    feedback.textContent = "🎆 Correct! 🎆";
    feedback.classList.add("correct");
    scoreEl.textContent = `+${pts} point${pts > 1 ? 's' : ''} earned!`;
    scoreEl.className = 'level-score earned';
    updateScoreBanner();
  } else {
    feedback.textContent = "No, try again!";
    feedback.classList.remove("correct");
  }
}

function surrender(levelIndex, numbers) {
  const feedback = document.getElementById(`feedback-${levelIndex}`);
  const scoreEl = document.getElementById(`score-${levelIndex}`);

  if (scored[levelIndex]) return;

  for (const perm of permute(numbers)) {
    for (const ops of opCombos(numbers.length - 1)) {
      if (evalLTR(perm, ops) === 11) {
        const expr = perm.map((n, i) => i === 0 ? n : `${ops[i-1]}${n}`).join(' ');
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
