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

let unsolvable = [];
let checked = 0;

for (const puzzle of puzzles) {
  puzzle.levels.forEach((level, i) => {
    checked++;
    if (!isSolvable(level.numbers)) {
      unsolvable.push({ date: puzzle.date, level: i + 1, numbers: level.numbers });
    }
  });
}

console.log(`Checked ${checked} levels across ${puzzles.length} puzzles.`);
if (unsolvable.length === 0) {
  console.log('✅ All puzzles are solvable!');
} else {
  console.log(`❌ Found ${unsolvable.length} unsolvable level(s):\n`);
  unsolvable.forEach(u => {
    console.log(`  ${u.date} — Level ${u.level}: [${u.numbers.join(', ')}]`);
  });
}
