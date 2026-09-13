# Cut & Fill - Itch.io Project Page

## Project Setup

**Title:** Cut & Fill  
**URL/Slug:** cut-fill  (live at https://thornsrl.itch.io/cut-fill)  
**Author:** Zach Thornsbury  
**Classification:** Game  
**Kind:** HTML (Web)  
**Release Date:** [Today's date]

---

## Description (Long)

Copy this entire text to the project description field:

---

A tactile puzzle game about moving earth and avoiding traffic.

You control a dozer to cut dirt from some cells and fill holes in others. But watch out—vehicles move through the site, and you'll fail if one hits you.

### What You'll Find

**25 hand-crafted campaign levels** ordered by measured difficulty, from simple grading to complex traffic navigation with gated haul roads and accelerating tempo.

**Three difficulty shifts** — Apprentice, Operator, Foreman — let you tackle the same puzzle at your own pace. Slower traffic? Fewer vehicles? Warning cells visible? All configurable.

**Random level generator** (three tiers) creates fresh procedural puzzles and proves they're solvable before you play them.

**Daily challenge** — the same puzzle for everyone, same day worldwide. Build a streak of personal bests.

**Level editor** with instant verification. Create and share custom levels using shareable codes — no backend, no accounts, no hosting bill.

**Time-trial mode** to compete against your own best times per level.

**Hint system** that works out a way forward from your current position, not just from the start. Earn hints by finishing levels at par.

### How to Play

**Objective:** Fill all holes and reach the exit without getting hit.

**Controls:**
- Desktop: Arrow keys or WASD to move, Space to act
- Touch: Swipe to move or use on-screen pad (configurable)

**Game symbols:**
- ▾ Orange pit = hole to fill
- ✓ Green pit = filled hole
- ◆ Dirt pile = push this
- Yellow dozer = you
- 🚗 Vehicles = avoid

**Key mechanics:**
- Push dirt into holes. It drops in permanently—waste a load and you might brick the level.
- Traffic advances one step per your move, including waits. Timing is everything, not reflexes.
- Red cells show exactly where vehicles land next turn (hidden on Foreman difficulty).
- You can only push, never pull. No infinite retries with the same dirt.

### Features

✅ 25 hand-designed levels + random generation + daily challenge  
✅ Built-in level editor + share codes (no server needed)  
✅ Time-trial mode with personal bests  
✅ Three difficulty shifts (same puzzle, different challenges)  
✅ Hint system (earned, not infinite)  
✅ Synthesized sound (no audio files)  
✅ Haptic feedback (Android)  
✅ Touch and keyboard controls, fully configurable  
✅ Zero network requests — save the single HTML file and it plays with no connection  
✅ No ads, no tracking, no paywalls  

### Play Now

Open `index.html` in any browser. No install, no build step, no server needed.

Plays on:
- Desktop (Chrome, Firefox, Safari, Edge)
- Mobile (iOS Safari, Chrome Android, Samsung Internet)
- Offline (download and double-click)

### Keyboard Reference

| Action | Key |
|--------|-----|
| Move | Arrow keys or WASD |
| Act | Space |
| Wait | Space or tap board |
| Undo | Z or U |
| Restart | R |
| Hint | H |

Panels are navigable with keyboard: arrows/WASD to move, Enter/Space to click.

### About

Built as a single self-contained HTML file. No build step, no dependencies, no external assets. The solver that verifies custom levels and generates random ones lives in the browser—publish a level and you're publishing an actual par, not a guess.

**Technology:**
- Vanilla JavaScript (ES6)
- CSS Grid + Flexbox
- WebAudio API (synthesized sound)
- Pure DOM rendering (no canvas)

**License:** Proprietary. All rights reserved. Not licensed for copying, modification, or redistribution. See LICENSE file.

---

## Short Description (tagline, ~50 chars)

"A tactile puzzle game about moving earth and avoiding traffic"

---

## Tags

puzzle, game, web, offline, browser, strategy, puzzle-game, casual, single-player, HTML

---

## Visibility & Rating

- Visibility: Public
- Rating: Everyone (E for Everyone)
- Category: Puzzle

---

## Screenshots

Place in `assets/screenshots/` folder (recommended sizes 800×600 or higher):

1. **Level Select** — Shows the campaign picker with multiple levels visible, demonstrating variety
2. **Active Gameplay** — Mid-game with dozer, dirt piles, holes, and traffic vehicles visible
3. **Settings Panel** — Showing available options (sound, haptics, touch mode, difficulty, time-trial)
4. **Difficult Level** — A complex puzzle showing gated haul roads or high traffic density

**How to capture:**
1. Open index.html in a browser (Chrome for best results)
2. Screenshot at 1280×720 (desktop) or similar
3. Crop to 800×600 for itch.io thumbnail
4. Format: PNG (no compression loss)

---

## Community & Feedback

Players can:
- Share custom level codes in comments
- Report bugs or suggestions
- Compete on time-trial leaderboards (local/personal)
- Play offline and sync when reconnected

---

## Post-Launch Checklist

After publishing:
- [ ] Test game loads in itch.io frame (windowed + fullscreen)
- [ ] Verify screenshots are visible
- [ ] Play a level in the frame to confirm playability
- [ ] Check mobile view on phone
- [ ] Share link with friends/communities
- [ ] Monitor comments for feedback
- [ ] Watch for crash reports in browser console (F12)

---

## Distribution Ideas

- Share on r/puzzlegames, r/indiegames
- Tweet to #indiegame #gamedev #puzzle
- Add to itch.io collections (Strategy, Puzzle, Browser)
- Link from personal website/portfolio
- Share custom level codes with community

---

## Future Additions (if desired)

Phase 2 ideas:
- Leaderboard (local export or cloud)
- Cosmetic skins for the dozer
- Additional campaign levels
- Mobile app wrapper (PWA)
- Social sharing for custom levels
- Video capture / GIF export

Keep the zero-network promise and single-file simplicity — no dependencies, no build step.
