# SURGE

A fast, free browser survival shooter. Waves close in from every edge — your craft fires on its own, so your job is to **stay alive, keep moving, and chain kills**. Build a combo for a bigger score multiplier, collect mint shards to level up, and survive the elites. How long can you last?

Live at **https://surge.paramain.com**.

Built as a single static page: HTML, CSS, and vanilla JS canvas. No build step, no dependencies, no tracking.

## Play

- **Move:** `WASD` / arrow keys, or drag on touch
- **Dash** (brief invulnerability): `Space` / `Shift`, or double-tap on touch
- **Pause:** `P` · **Mute:** `M`
- **Combo:** chain kills without getting hit to raise your score multiplier — taking a hit cuts it down.
- **Elites:** pink mini-bosses appear periodically and drop healing and screen-clearing bombs.
- Best score is saved locally in your browser.

## Run locally

It's a static site — open `index.html` directly, or serve the folder so the manifest and icons resolve over HTTP:

```bash
# any static server works; for example:
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to Vercel

This repo is ready to deploy as-is — no framework, no build command.

1. Push this folder to a new GitHub repository.
2. In Vercel, **Add New → Project** and import that repo.
3. Framework Preset: **Other**. Build Command: *(none)*. Output Directory: *(leave default — root)*.
4. Deploy.

`vercel.json` sets clean URLs and the manifest content type. The `<meta>` tags already point at `https://surge.paramain.com` — add that domain to the Vercel project once deployed.

## Project layout

```
index.html            game + UI (everything runs from here)
favicon.svg           site icon
og.svg                social share image (1200x630)
manifest.webmanifest  PWA metadata (installable / add to home screen)
vercel.json           static hosting config
```

### Note on the social image

`og.svg` is used for link previews. Some platforms (notably some older Twitter/Facebook crawlers) don't render SVG share images — if previews look blank there, export `og.svg` to a 1200x630 PNG (`og.png`) and point the `og:image` / `twitter:image` tags at it.
