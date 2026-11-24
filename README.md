# Day 12 — Ninefold

A landing page for Ninefold, a fictional brand and web studio in Bristol and Lisbon. It is built from the Day 12 reference in [../reference/](../reference/ninefold-reference.png), which was designed for this project.

Ninefold, its team, clients, projects, quotes, awards and prices are invented. Every form and booking is a browser-only preview: nothing is sent.

## Run

Requires Node.js 18 or newer. There is no build step.

```sh
cd Day-12/ninefold
npm start            # http://127.0.0.1:4415
```

## Brand

- **Logo:** concept B from [../reference/ninefold-logos.png](../reference/ninefold-logos.png). A strip of paper draws a 9 in ink on a tomato tile, then folds at its foot to show a butter-yellow back. The mark lives in [assets/icons/favicon.svg](assets/icons/favicon.svg) and as the `#logo-mark` symbol in the page.
- **Colour:** flat blocks of paper `#f1ede4`, ink `#121116`, cobalt `#2b3df5`, tomato `#ff5233` and butter `#ffd447`, with lilac on one project. There are no gradients anywhere, including in the CSS.
  - Where tomato is used as text on paper (the `+`, `%` and `wk` units and one card headline), it is the deeper `#e0401f` so it passes contrast.
- **Type:** Bricolage Grotesque, one self-hosted variable file covering weights 200 to 800, widths 75 to 100% and optical size. OFL licence in `assets/fonts/`.
  - Display type runs at its compressed width.
  - Headings are two-tone, and nothing is set in italics.

## Sections

| Section | Notes |
| --- | --- |
| Header | Logo, nav with a project count, a "booking for" status and **Start a project**. On desktop it tucks away while you scroll down and comes back when you scroll up. Below 1024px it becomes a full-screen menu. |
| Hero | Three lines of compressed display type:<ul><li>a pill-shaped team photo set inside the first line</li><li>"refuse" in a tomato block, beside a cobalt star disc</li><li>"to blend in." in grey</li></ul>A yellow sticker spins slowly beside the headline. Below a rule sit the intro, two buttons and a reel thumbnail. |
| Clients | Six invented client names, each set in its own style. |
| Band | A dark marquee of the services in giant type, separated by bursts. It pauses on hover. |
| Work | Filter buttons and six project cards:<ul><li>Branding and campaign work is shown as photography.</li><li>Website and app work is shown as screens designed and rendered for this page: the Northern Ferry site and ticket, the Halo app and the Saltbox shop.</li></ul>Each card opens a full case study with a lead image, the client, year, scope and credits, a few paragraphs, a gallery and what changed. A client quote appears only where there is one. Previous and next buttons step through all six. |
| Services | A four-row accordion. The open row turns cobalt and shows its price and description. |
| Numbers | Four big stats that count up when they scroll into view. |
| Process | A butter band of four steps, with progress bars that fill in view. |
| Studio | The group photo, a dark "Small team. Senior hands." panel and two team portraits. |
| Quote | A cobalt slider of three client quotes with previous/next buttons, beside an awards list. |
| Pricing | Sprint, Launch and Partner. Each button opens a booking preview. |
| Contact | A dark section with a large headline, email, offices and a brief form:<ul><li>multi-select buttons for services</li><li>single-select buttons for budget</li><li>name, email and message</li></ul> |
| Footer | Links, then a full-width tomato **ninefold** wordmark whose lower part is cut off by the bottom of the page. |

## Motion and micro-interactions

[assets/js/site-core.js](assets/js/site-core.js) is the shared motion and UI core. Here it runs:

- the hero intro, line by line
- reveals and photo zoom-ins
- Lenis smooth scroll
- the menu, the demo dialog and the quote slider
- the wordmark fit

[script.js](script.js) adds the page's own interactions:

- **Portfolio filters:**
  - Filtering re-lays the grid as even columns, and the cards that stay animate back in.
  - The result is announced to screen readers, for example "Showing 3 branding projects".
- **View case pill:** on desktop it follows the pointer over project cards with a little lag.
- **Case studies:** each card opens its case study in a dialog. Focus stays inside the dialog and returns to the card when it closes.
- **Card hovers:** the image eases in slightly.
- **Services accordion:** one row open at a time, animated open and closed.
- **Numbers and process bars:** the numbers count up and the process bars fill segment by segment.
- **Brief form:** checks your name and email, then writes a one-line summary of your picks.
- **Header:** tucks away on desktop while you scroll down.
- **Footer wordmark:** rises into place as the footer scrolls in.

CSS handles the rest:

- the sticker's slow spin, the burst turning on hover and the marquee
- the photo zoom inside the hero pill
- button arrows and link underlines

Under `prefers-reduced-motion` every animation and transition is off, the pointer pill and the header tuck are skipped, and every element simply renders.

## Verify

Keep `npm start` running, then run `npm run verify`. It uses Playwright and axe-core, with Day 06's install as a fallback. [scripts/verify.mjs](scripts/verify.mjs), set up by [verify.config.mjs](scripts/verify.config.mjs), checks:

- that there are no italics and no Unicode icon glyphs
- horizontal overflow every 20px from 320 to 1920
- that the hero fits one screen at 12 window shapes
- reduced motion
- 12px text and 44px targets at six widths
- WCAG 2.1 AA at 390 and 1440
- that the intro, Lenis and every reveal complete with motion on
- the dialog and the mobile menu
- the filters, the case summaries, the accordion, the quote slider, the brief form and the footer wordmark

`npm run icons` regenerates the favicons and the 1200×630 share image from the running page.

## Deploy

The page is static; upload the folder. Before publishing, replace `https://ninefold.example.com/` in the four absolute URLs at the top of [index.html](index.html). Photo credits are in [assets/PHOTOS.md](assets/PHOTOS.md).
