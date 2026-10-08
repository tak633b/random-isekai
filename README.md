# Random Isekai

English | [日本語](README.ja.md)

A browser game where you live one whole life in another world, a year at a time, until it ends. Pick one of 16 worlds (a sword-and-sorcery kingdom, a land of shrines and samurai, a cultivation continent, a steam-powered capital, a neon megacity, a star empire, modern Earth with dungeons, a post-collapse wasteland and more) or let everything be random. Whether you survive each year is a roll of the dice, and the odds come from the world's danger, your race's lifespan, the status you were born into, your job, your stats, your reincarnation perk and whatever happened that year.

You can also live the same setup hundreds of times and see how long people actually last in that world.

![A life in progress: the scene with family and companions at the top, the timeline on the left, portrait, stats and people on the right](docs/images/life-en.png)

## How it plays

1. On the title screen, choose "Reborn at random" or "Choose your rebirth".
2. In setup you can pick the world, how strong magic and special powers are, how dangerous and war-torn it is, and your race, sex, status, talent, reincarnation perk, how you arrive (reborn as a baby, remember later, summoned, or a native with no past life), how much you remember, and your name. Anything you leave on "Random" is decided at birth.
3. The arrival scene tells you how your last life ended and where you were born this time.
4. Advance one year, ten years, or to the end. When a choice comes up, you make it. A panel shows what is most likely to kill you this year.
5. When you die you get a record: age, cause, a one-line "why" with the numbers behind it, who was with you at the end, the main events and the full timeline.
6. "Run this setup many times" lives it again 100 or 1000 times and sums up the results.

![The setup screen with world cards and character options](docs/images/setup-en.png)

## Many lives, one setup

Everything you chose, and everything that was chosen for you, stays fixed; only luck changes. You get the distribution of ages at death, the mean, median and longest, the share who reached 20, 40, 60 and so on, the breakdown by cause, and the most common deaths. You can compare three temperaments for automatic choices (careful, normal, reckless) side by side.

![1000 lives: age distribution, survival by age, causes of death, temperament comparison](docs/images/trials-en.png)

## Where the odds come from

Each world's mortality is anchored to a real historical life table: the medieval kingdom to late-medieval England, the land of shrines to rural Edo-period Japan, the dark fantasy world to somewhere between the Black Death and the Thirty Years' War, and modern Earth with dungeons to present-day Japan. Every world has an infant mortality rate, an under-five rate, a childhood rate, an age-independent adult hazard (the Makeham term) and an ageing slope (Gompertz). Race, status and job multiply on top.

- Long-lived races such as elves and dwarves age more slowly once grown (elves at 0.1 times the human rate), but monsters and accidents strike per calendar year, so many still die young.
- Adventurers die to monsters several times more often than commoners, less so as they level up.
- War, great plagues and famines are not folded into the yearly baseline. They happen as rare events of their own.
- Perks act on specific causes. Regeneration cuts deaths in combat; modern medical knowledge cuts deaths from disease. Showier perks draw assassins and show trials.

For 3000 automatic lives as a human commoner with no perk, the mean age at death lands within ±2 years of the reference life expectancy in all 16 worlds (`src/engine/mortality.test.ts`). The research notes are in `docs/research/` (Japanese) and the formulas in `docs/DESIGN.md`.

## What's inside

- 902 events and 232 death descriptions, in Japanese and English. Conditions (world type, life stage, status, job, race, perk, past-life memory, story flags) are declarative, so new events need no code.
- People: family, friends, party members, mentors, rivals, nemeses, lovers, spouses, children, familiars and disciples. Each has a closeness score from 0 to 100 and shared memories, and ages and dies on their own life table.
- All pixel art is drawn on canvas at runtime, with no image files. Scenes are 320×100 across 16 worlds, 16 places, 4 times of day and the seasons. Portraits are 48×56 and full-body sprites 32×48, covering 27 races and 42 jobs.
- You can close the tab and continue later. Up to 20 past lives are kept in localStorage. No server is needed.

<p align="center"><img src="docs/images/death-en.png" width="640" alt="A death record: grave scene, age, cause, the why line and the people at the end"></p>

## Running it

```
npm install
npm run dev      # http://localhost:5288
npm test         # vitest
npm run build    # tsc and vite build
```

`scripts/e2e.mjs` is a Playwright playthrough. It imports Playwright from an absolute path on the author's machine, so change that import line elsewhere.

## A note on sources

The game is built from common isekai tropes. It does not use the settings, names or text of any particular work.

## License

MIT
