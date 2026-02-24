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

    todayPuzzle.levels.forEach((level, index) => {
      const levelDiv = document.createElement('div');
      levelDiv.className = 'level';
      levelDiv.innerHTML = `
        <h2>Level ${index + 1}</h2>
        <p>Numbers: ${level.numbers.join(', ')}</p>
        <input type="text" placeholder="Type your equation" id="input-${index}">
        <button onclick="checkAnswer(${index}, [${level.numbers.join(', ')}])">Check</button>
        <p id="feedback-${index}"></p>
      `;
      container.appendChild(levelDiv);
    });
  });

// Check answer with all permutations
function checkAnswer(levelIndex, numbers) {
  const input = document.getElementById(`input-${levelIndex}`).value.replace(/\s/g,'');
  const feedback = document.getElementById(`feedback-${levelIndex}`);

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

  // Permutations of numbers
  function permute(arr) {
    if (arr.length <= 1) return [arr];
    let result = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = permute([...arr.slice(0,i), ...arr.slice(i+1)]);
      for (const r of rest) result.push([arr[i], ...r]);
    }
    return result;
  }

  const numbersPermutations = permute(numbers);

  // All operator combinations
  function opCombos(length) {
    if (length === 0) return [[]];
    const smaller = opCombos(length - 1);
    let result = [];
    for (const s of smaller) {
      for (const op of ['+','-','*','/']) result.push([...s, op]);
    }
    return result;
  }

  const operatorsCombinations = opCombos(numbers.length - 1);

  // Evaluate left-to-right
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

  // Check if any permutation with operators gives 11
  let isValid = false;
  for (const perm of numbersPermutations) {
    for (const opCombo of operatorsCombinations) {
      if (evalLTR(perm, opCombo) === 11) {
        isValid = true;
        break;
      }
    }
    if (isValid) break;
  }

  feedback.textContent = isValid ? "Correct!" : "No, try again!";
  feedback.classList.toggle("correct", isValid);
}
