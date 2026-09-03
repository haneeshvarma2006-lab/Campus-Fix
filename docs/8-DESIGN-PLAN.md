# 🎨 The Design Plan

> Why CampusFix looks the way it does.

---

## 🎯 Who we designed for

**One person:** a student on a **mid-range Android phone**, on **college Wi-Fi
or mobile data**, standing in a corridor next to something broken.

They are not at a desk. They are not patient. They have **one hand free**.

Every decision below comes from that one sentence.

---

## 💥 The lesson that shaped everything

Version 2 looked stunning on a laptop. On a phone it **lagged**.

We measured why. It was **not** 3D and **not** big images — there were none.
It was paint cost:

| Found in v2 | Count |
|---|---|
| `backdrop-filter` (frosted glass) | 18 |
| Blur effects | 16 |
| — one of them 100px blur on a 34vw element | 😬 |
| Animations looping forever in the background | 12 |

A phone GPU repaints all of that **every frame, forever**. It never gets to rest.

> 🧠 **The lesson:** pretty is not the same as fast. A phone shows you which.

---

## 📜 The four rules

Written at the top of `client/src/styles/index.css` so nobody forgets:

| # | Rule | Why |
|---|---|---|
| 1️⃣ | **No webfonts** | System font renders instantly, zero downloads, no text flash |
| 2️⃣ | **No `backdrop-filter`, no big blurs, no `mix-blend-mode`** | These are exactly what drops frames |
| 3️⃣ | **Animate only `transform` and `opacity`** — on interaction, never looping | The only two properties the GPU handles for free |
| 4️⃣ | **Flat colour over gradients** | Cheap to paint, and it scales cleanly |

---

## 🗺️ The visual idea: a campus map

One idea, used everywhere, so the app feels like **one thing**:

```
Soft green ground  →  white buildings  →  coloured pins for issues
```

It shows up in three places:

- 🏠 The **landing page** hero
- 🧭 The **Campus** page
- 📍 The **location picker** when reporting

**Orange pin** = open issues (with the count). **Green pin** = all clear.

Hand-drawn SVG on a 100×100 grid. **~2 KB.**

---

## 🎨 The colours

Every colour is a **variable**, defined once. Change one line, the whole app follows.

### Brand

| Token | Light | Dark |
|---|---|---|
| `--brand` | `#4B3FE4` 🟣 | `#8B80FF` |

### Status — these double as the map pin colours

| Status | Colour | Meaning |
|---|---|---|
| 🟠 `--reported` | `#B4690E` | Nobody has looked yet |
| 🔵 `--assigned` | `#1F5FA8` | Someone owns it |
| 🟣 `--progress` | `#6D3FC4` | Being worked on |
| 🟢 `--fixed` | `#17795E` | Done |
| ⚪ `--rejected` | `#6B7280` | Closed without a fix |

**One colour = one meaning**, everywhere. A green dot always means fixed —
on a card, on the map, in the timeline, in the dashboard.

### 🌗 Dark mode

Not an afterthought — **every token has a dark value**. Same names, different
values. No component knows which theme it's in.

---

## 🔤 The type scale

Seven sizes. No more.

| Class | Size | Used for |
|---|---|---|
| `.t-hero` | 30 → 52px | Landing headline |
| `.t-h1` | 23 → 30px | Page titles |
| `.t-h2` | 19px | Section titles |
| `.t-h3` | 16px | Card titles |
| `.t-body` | 15px | Normal text |
| `.t-sm` | 14px | Secondary text |
| `.t-xs` | 12.5px | Labels, counts |

> The two big ones use `clamp()` — they shrink on a phone and grow on a laptop
> **without a media query**.

---

## 👍 Built for thumbs

| Rule | Value | Why |
|---|---|---|
| Minimum button height | **44px** | Smallest comfortable tap target |
| Input font size | **16px** | Anything smaller makes **iOS zoom in** on focus |
| Bottom tab bar | Home · Campus · **Report** · My reports | Thumb reaches the bottom, not the top |
| The Report button | Raised circle in the middle | The one thing they came to do |

Only **one** breakpoint matters: **780px**. Below it, phone. Above it, desktop.

---

## 📝 Reporting = 4 questions, not 1 form

A long form on a phone is a wall. So we broke it into four screens:

| Step | Question | How they answer |
|---|---|---|
| 1️⃣ | **What's wrong?** | Tap an emoji tile |
| 2️⃣ | **Where is it?** | Tap a place |
| 3️⃣ | **What happened?** | Short title + detail |
| 4️⃣ | **Add a photo?** | Camera, or skip |

- ✅ Most steps are **one tap**
- ✅ Nothing is sent until the last step
- ✅ Going back **keeps your answers**
- ✅ A progress bar shows how much is left

---

## 🚦 Showing progress honestly

A report moves along a **rail**:

```
Reported ──→ Assigned ──→ In progress ──→ Fixed
```

But a **rejected** report never reaches the end. So instead of freezing the bar
halfway and leaving people guessing, we replace it entirely with one clear line:

> ✕ **Closed without a fix** — and the reason.

> 🧠 A progress bar that can never finish is a lie. Say the real thing instead.

---

## 🚫 What we deliberately refused

| Refused | Why |
|---|---|
| ❌ Three.js / WebGL | Melts phone GPUs |
| ❌ Tailwind | Extra build step, extra thing to learn |
| ❌ Google Fonts | Extra download, text flashes on load |
| ❌ A map library | 2 KB of SVG does the job |
| ❌ Redux | React state is plenty here |
| ❌ Copying Fable 5.1 | It's a showcase for a laptop. This is a tool for a corridor. |

---

## 🛡️ The design has a test

A missing CSS rule is **silent** — the element renders, just unstyled, and
nothing warns you. It bit us three times during the rebuild:

- Selected filter chips looked **unselected**
- Timeline dots were all **grey**
- Loading placeholders were **invisible**

So now:

```bash
npm run check:styles
```

It compares every class name the JSX asks for against every class the
stylesheet defines, and **fails** on a name with no rule.

---

## 🧠 Remember this

| | |
|---|---|
| 📱 | Designed for **one hand, mid-range Android, bad signal** |
| 🐌 | v2 lagged from **paint cost**, not 3D — pretty ≠ fast |
| 🗺️ | One visual idea — **the campus map** — used everywhere |
| 🎨 | One colour = one meaning, in both themes |
| 👍 | **44px** targets, **16px** inputs, bottom tab bar |
| 4️⃣ | Reporting is **4 questions**, not one long form |
| 🛡️ | The design system has a **test that fails** |
