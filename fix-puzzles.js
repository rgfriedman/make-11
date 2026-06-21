const fs = require('fs');
const puzzles = JSON.parse(fs.readFileSync('puzzles.json', 'utf8'));

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

function isSolvable(numbers) {
  for (const perm of permute(numbers)) {
    for (const ops of opCombos(numbers.length - 1)) {
      if (evalLTR(perm, ops) === 11) return true;
    }
  }
  return false;
}

// Generate a random solvable set of n numbers (1-9)
function randomSolvable(size, rng) {
  // Shuffle attempts with a seeded-ish approach to get variety
  for (let attempt = 0; attempt < 10000; attempt++) {
    const nums = Array.from({ length: size }, () => Math.floor(Math.random() * 9) + 1);
    if (isSolvable(nums)) return nums;
  }
  throw new Error(`Could not find solvable set of size ${size}`);
}

let fixed = 0;
for (const puzzle of puzzles) {
  puzzle.levels.forEach((level, i) => {
    if (!isSolvable(level.numbers)) {
      const replacement = randomSolvable(level.numbers.length);
      console.log(`Fixing ${puzzle.date} Level ${i+1}: [${level.numbers.join(', ')}] → [${replacement.join(', ')}]`);
      level.numbers = replacement;
      fixed++;
    }
  });
}

fs.writeFileSync('puzzles.json', JSON.stringify(puzzles, null, 2));
console.log(`\nFixed ${fixed} puzzles and saved puzzles.json.`);
