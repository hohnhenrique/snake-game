# Snake  terminal snake game

https://hohnhenrique.github.io/snake-game/

Implementation of the classic Snake in **vanilla JavaScript**, rendered on `<canvas>`, with no frameworks or external dependencies. Visual theme inspired by retro detection terminals — the same style used in the Minesweeper project.

## Features

- Three speeds: slow, normal and fast (adjustable at any time)
- Keyboard controls (arrow keys or WASD), touch controls (on-screen buttons) or swipe gesture on the board
- Pause and resume (center button or spacebar)
- High score automatically saved in the browser's `localStorage`
- Instructions manual with objective, controls and rules
- Responsive, with `prefers-reduced-motion` support

## Technologies

- HTML5 (`<canvas>`)
- CSS3 (CSS variables, grid layout)
- JavaScript (ES6+, no libraries)

## How to run locally

There is no build step. Just open the `index.html` file in the browser, or run a simple local server:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then access `http://localhost:8000`.

## Project structure

```
snake/
├── index.html      # page structure
├── style.css        # styles and visual theme
├── script.js         # game logic
└── README.md
```

## Game logic

The core logic is in `script.js` and covers:

- **Game loop**: `setInterval` whose speed depends on the selected option (slow/normal/fast)
- **Movement**: the pending direction is only applied on the next "tick", avoiding instant reversals that would cause immediate collision with the snake's own body
- **Collisions**: with the board walls and with the snake's own body
- **Food**: randomly placed on a free cell each time it is eaten
- **High score**: compared and saved in `localStorage` whenever a match ends with a score higher than the previous one

## Possible future improvements

- Obstacles on the board
- "No walls" mode (the snake wraps around to the opposite side)
- Match history and statistics, like in Minesweeper
- Retro sound effects

## License

Free to use and modify.
# snake-game