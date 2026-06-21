# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

This is a static site with no build step. Open `index.html` directly in a browser, or serve it with any local HTTP server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

The `fetch('puzzles.json')` call in `script.js` requires a server — it won't work when opened as a `file://` URL.

## Architecture

The entire app is three files with no dependencies or frameworks:

- **`index.html`** — shell with a single `<div id="levels-container">` that JS populates at runtime
- **`script.js`** — all game logic; reads `puzzles.json` on load, builds the UI, and handles answer checking and surrender
- **`puzzles.json`** — the puzzle data source; one entry per date with three levels, each containing a `numbers` array

### Answer validation logic

The game has a deliberate constraint: `checkAnswer` does **not** evaluate the user's expression string directly. Instead it:
1. Extracts all integers from the typed expression
2. Verifies they match the required numbers exactly (sorted comparison)
3. Brute-forces every permutation of the numbers against every operator combination using left-to-right evaluation (`evalLTR`) — no standard operator precedence
4. Accepts the answer if **any** permutation with operators evaluates to 11

This means the game accepts any expression that uses the right numbers, as long as at least one ordering of those numbers with some operators reaches 11. The user's actual expression grouping is checked only for the parentheses-around-`*`-and-`/` requirement, not for correctness of the value typed.

### Adding new puzzles

Add entries to `puzzles.json` in the format:
```json
{
  "date": "YYYY-MM-DD",
  "levels": [
    { "numbers": [a, b, c] },
    { "numbers": [a, b, c, d] },
    { "numbers": [a, b, c, d, e] }
  ]
}
```

Level 1 uses 3 numbers (1 pt), level 2 uses 4 numbers (2 pts), level 3 uses 5 numbers (3 pts). The `find(p => p.date === todayStr)` lookup is a simple linear scan — duplicate dates will silently return the first match.
