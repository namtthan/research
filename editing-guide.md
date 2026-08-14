# Editing your site: a guide for someone who knows R/Python but not HTML

You already think in terms of syntax, structure, and reproducibility, so this will click faster than a typical "intro to HTML" course. The mental model: **HTML is your data structure (the content and its shape), CSS is your `theme()` call (how it looks)**. Same content, swap the CSS, totally different look — like `ggplot(data) + theme_bw()` vs `+ theme_minimal()`.

Your site has 5 files that matter:

| File                                  | What it controls                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `shared.css`                          | Colors, fonts, page width, nav bar — used by _both_ pages                           |
| `index.html`                          | Your homepage content + homepage-only styling                                       |
| `briefings.html`                      | The research brief page's content (barely any content — it's mostly rendered by JS) |
| `briefings.css`                       | Styling specific to the brief page (cards, tabs, search box)                        |
| `data/daily.json`, `data/weekly.json` | The actual brief stories — edited as data, not HTML                                 |

---

## 1. Setup (5 minutes, one time)

1. Install [VS Code](https://code.visualstudio.com/) (free). Open your `research` folder in it (File → Open Folder).
2. To preview: just double-click `index.html` in your file explorer — it opens in your browser. After every edit, save the file and hit refresh in the browser to see the change. No server, no build step, no compiling. This is much simpler than R/Python — HTML/CSS files are read directly by the browser.
3. **Best trick for learning:** in your browser, right-click any element on the page → **Inspect**. This opens DevTools. You can click on any CSS rule and edit values live — see the result instantly, and it resets when you refresh. Use this to experiment _before_ touching the real file. It's a sandbox with zero risk.

---

## 2. Reading HTML

```html
<h2 class="section-title">Publications</h2>
```

- `<h2>...</h2>` — a tag, opened and closed. Everything between is the content ("Publications").
- `class="section-title"` — a label. It doesn't do anything by itself; it's a hook that CSS grabs onto.
- Tags nest inside each other like parentheses in R — `<div><p>text</p></div>` is like `f(g(x))`. If you open a tag you must close it, and they must close in the reverse order they opened, or the layout breaks.

## 3. Reading CSS

Somewhere in `shared.css` or inside a `<style>` block you'll find:

```css
.section-title {
  font: 400 clamp(30px, 4vw, 42px)/1.2 var(--serif);
  max-width: 720px;
  margin-bottom: 42px;
}
```

The `.section-title` before the `{` matches the `class="section-title"` in the HTML — that's the whole connection mechanism. Everything inside `{ }` is `property:value;` pairs, semicolon-separated, like named arguments in a function call. `font-size` is one property; `color` is another.

**Gotcha to know now, not after you break something:** a missing `}` at the end of a rule breaks every rule that comes after it in that file, silently, with no error message — the browser just ignores what it can't parse. If a change makes the whole page look wrong (not just the one thing you touched), count your braces first.

---

## 4. Cookbook: the four things you asked for

### Change text size

Find the class in the relevant `<style>`/CSS file and edit `font-size`. Example — your role line under your name:

```css
.role {
  font-size: 19px;
  color: var(--muted);
  margin-bottom: 24px;
}
```

Change `19px` to `22px`, save, refresh.

Quick reference for your site (all in `index.html`'s `<style>` block unless noted):

- Overall body text size — `shared.css`, `body{font-size:17px}`
- Section headings ("01 · About", "Publications") — `.section-title`
- Card text in Research Focus — `.card p{font-size:15px}`
- Publication authors/journal line — `.meta{font-size:14px}`

### Change color

Don't hunt for individual colors — your whole site runs on a small set of variables defined once at the top of `shared.css`:

```css
:root {
  --accent: #2dd4bf; /* the teal — buttons, links, highlights */
  --text: #e8edec; /* main text */
  --muted: #9caaa8; /* secondary/gray text */
  --bg: #0a0e10; /* page background */
}
```

Change `--accent` once here and every button, link, and highlight across _both_ pages updates. This is the single highest-leverage edit you can make. Colors are hex codes (`#rrggbb`) — [htmlcolorcodes.com](https://htmlcolorcodes.com/) has a picker if you want a specific shade.

### Add a new line/field

The pattern for everything on this site is **copy an existing block, paste it, edit the text.** HTML doesn't care about extra whitespace or line breaks, only about matching tags. Three concrete examples:

**New publication** — in `index.html`, find one `<div class="pub">...</div>` block inside `<div class="pubs">`, copy the whole thing, paste it as a new sibling, then edit the year, title, authors/journal, DOI link, and status badge class (`status-published`, `status-accepted`, `status-inpress`, `status-revision`, or `status-preprint` — amber vs red is automatic based on which class you use).

**New timeline entry** (education/experience) — copy one `<div class="item">...</div>` inside `.timeline`, paste, edit dates/title/institution.

**New nav link** — this one has a catch worth knowing: `shared.css` only shares the _styling_ of the nav, not the actual list of links. The `<ul class="links">...</ul>` is typed out separately in `index.html` and in `briefings.html`. If you add a link, add it to **both files** or you'll reintroduce the exact "Background disappeared" bug we just fixed.

**Brief stories** (the daily/weekly feed) are the one exception — those live in `data/daily.json` and `data/weekly.json`, not in HTML. Copy one `{ "title": ..., "takeaway": ..., ... }` block inside the `stories` array, paste, edit the fields. JSON needs commas between entries and matching `{ }`/`[ ]` — same rules as a Python dict/list literal, so this should feel familiar.

### Add an image

1. Make a folder called `images` next to `index.html`, put your file in it (e.g. `images/headshot.jpg`).
2. Insert an `<img>` tag wherever you want it to appear:

```html
<img
  src="images/headshot.jpg"
  alt="Nam Than"
  style="max-width:100%;border-radius:10px"
/>
```

`src` is the file path (relative to the HTML file), `alt` is text shown if the image fails to load (also read by screen readers — always fill this in). `max-width:100%` stops it from overflowing on small screens.

---

## 5. Publishing your change

Editing the file only changes it on your computer. To make it live on `namtthan.github.io/research`:

- **Easiest, no setup:** on github.com, open the file, click the pencil (edit) icon, make your change in the browser, scroll down, click "Commit changes." Live in about a minute.
- **If you're using VS Code locally:** after saving, run in a terminal inside the folder:

```
git add .
git commit -m "describe what you changed"
git push
```

Either way — **always preview locally (double-click the HTML file) before you push**, so you're not debugging live on the internet.

---

## 6. When something looks broken

1. Right-click → Inspect → check the **Console** tab for red error text.
2. Count your braces `{ }` and tags `< >` in the section you just edited — an unclosed one is the #1 cause of "everything after this point looks wrong."
3. If you're stuck, paste me the block you edited and I'll spot it.
