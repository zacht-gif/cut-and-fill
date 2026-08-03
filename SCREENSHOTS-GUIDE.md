# Screenshot Capture Guide for Itch.io

## Overview

You need 2-4 gameplay screenshots showing different aspects of the game. Recommended size: **800×600 pixels** or higher (itch.io will resize).

## Recommended Screenshots

### Screenshot 1: Level Select Screen
**Shows:** Campaign progression, variety of levels, star ratings

**How to capture:**
1. Open `index.html` in Chrome
2. Game loads on title screen
3. Click "Campaign" button (or let it load automatically)
4. You'll see the level picker showing all 25 levels
5. Take screenshot at 1280×720 resolution
6. Crop to 800×600 if needed

**Why:** Shows players the 25-level campaign and progression system

---

### Screenshot 2: Active Gameplay
**Shows:** Game board with dozer, dirt, holes, and traffic

**How to capture:**
1. Start a campaign level (pick any level 3+ for visual interest)
2. Play 2-3 moves to show active gameplay
3. Position dozer somewhere interesting (not in a corner)
4. Make sure there's visible traffic (vehicles on roads)
5. Take screenshot at 1280×720
6. Crop to 800×600

**Pro tip:** Level 15 (Haul Road) or Level 17 (Night Shift) show traffic well

**Why:** Demonstrates the core gameplay and visual style

---

### Screenshot 3: Settings Panel
**Shows:** Customization options available to players

**How to capture:**
1. From any level, press Esc or click the settings button (⚙)
2. Settings panel opens showing:
   - Sound toggle
   - Haptics toggle
   - Touch mode selector (Pad/Swipe)
   - Difficulty selector (Apprentice/Operator/Foreman)
   - Time-trial mode toggle
   - Reset progress button
3. Take screenshot
4. Crop to 800×600

**Why:** Shows the depth of customization and player agency

---

### Screenshot 4: Difficult Level (Optional)
**Shows:** Complex gameplay with multiple mechanics

**Recommendation:** Use Level 24 (Tempo) or Level 25 (Graveyard Shift)

**How to capture:**
1. Start Level 24 or 25
2. Play a few moves to show the board state
3. Ensure traffic and terrain elements are visible
4. Take screenshot at 1280×720
5. Crop to 800×600

**Why:** Demonstrates the range from puzzle to strategy challenge

---

## File Format & Sizing

**Format:** PNG (no compression loss)

**Dimensions:**
- Capture at: 1280×720 (landscape, common aspect ratio)
- Itch.io accepts: 640×480 and up
- Recommended upload: 800×600 or 1024×768

**How to crop in Windows:**
1. Take screenshot (Print Screen or Shift+Print Screen)
2. Open Paint (included with Windows)
3. Paste image
4. Use crop tool to select area
5. Image → Crop to selection
6. File → Export As → Save as PNG

---

## Uploading to Itch.io

1. Go to your game's project page
2. Click "Edit" → "Edit Screenshots"
3. For each screenshot:
   - Click "Upload screenshot"
   - Select your PNG file (800×600 or higher)
   - Drag to reorder (optional)
   - First screenshot is the thumbnail
4. Click "Save" when done

---

## Screenshot Checklist

- [ ] Level select showing all 25 levels with stars/progress
- [ ] Active gameplay showing dozer, dirt, holes, and traffic
- [ ] Settings panel showing customization options
- [ ] (Optional) Complex level showing depth of gameplay
- [ ] All images at 800×600 or higher
- [ ] All images in PNG format
- [ ] Images not too small or hard to read
- [ ] Images uploaded to itch.io project page

---

## Tips for Good Screenshots

✅ **DO:**
- Capture during actual gameplay (not title screen)
- Show multiple game elements (terrain, vehicles, dozer)
- Use standard resolution (1280×720 or similar)
- Keep screenshots clear and readable
- Order them to tell a story (pick → play → customize)

❌ **DON'T:**
- Screenshot at 4K (makes fonts tiny when resized)
- Take blurry or partial screenshots
- Show error messages or console
- Screenshot only one small element

---

## Alternative: Video Capture

If you want a more dynamic showcase, itch.io also supports **short video** (MP4). Many game pages include a 15-30 second clip showing gameplay.

**To create a video clip:**
1. Use screen recorder (Windows: Win+G, or OBS)
2. Record 15-30 seconds of gameplay
3. Include: level load → 3 moves → settings toggle → win screen
4. Export as MP4
5. Upload to itch.io (optional, screenshots are fine alone)

---

## Storage

Place final screenshots in:
```
cut-and-fill/assets/screenshots/
  - 01-level-select.png
  - 02-gameplay.png
  - 03-settings.png
  - 04-difficulty.png
```

(Git will ignore these per `.gitignore` settings)
