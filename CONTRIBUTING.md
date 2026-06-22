# Contributing to SURGE

Thanks for your interest in improving SURGE. This is a small, dependency-free
project, so getting started is quick.

## Development setup

There is no build step. The game is plain HTML, CSS, and ES modules. You only
need a static file server because the browser blocks ES module imports over
`file://`.

```bash
git clone https://github.com/kamoras/surge.git
cd surge
python3 -m http.server 8000
# open http://localhost:8000
```

Any static server works (`npx serve`, `php -S`, the VS Code Live Server
extension, etc.).

## Project layout

See the "Project layout" section of the [README](README.md#project-layout).
The short version:

- Balance and content live in `js/data.js` (enemy + upgrade tables).
- Simulation lives in `js/update.js`, `js/entities.js`, and `js/combat.js`.
- Rendering is isolated in `js/render.js` and only ever reads state.
- DOM access goes through `js/hud.js` and `js/dom.js`.

Keeping those boundaries intact is the main thing that keeps the code easy to
work in — please preserve them.

## Code style

- 2-space indentation, semicolons, single quotes (enforced loosely by
  `.editorconfig`).
- Match the surrounding style; keep comments focused on the "why".
- No build tooling and no runtime dependencies. Please don't add a bundler or
  npm packages without opening an issue to discuss it first.

## Submitting changes

1. Fork the repo and create a branch off `main`.
2. Make your change and test it in a browser (start a run, level up, take a
   hit, trigger an elite). CI runs a syntax check on the modules, but it does
   not play the game for you.
3. Open a pull request describing what changed and how you verified it.

## Reporting bugs and ideas

Use the issue templates under **Issues → New issue**. Include your browser and,
for bugs, the steps to reproduce.
