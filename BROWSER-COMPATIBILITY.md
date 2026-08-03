# Cut & Fill - Browser Compatibility Testing

## Target Platforms

### Desktop Browsers
| Browser | Minimum | Tested | Status | Notes |
|---------|---------|--------|--------|-------|
| Chrome | 90+ | Latest | ✅ | Primary target |
| Firefox | 88+ | Latest | ✅ | Full support |
| Safari | 14+ | Latest | ✅ | WebAudio quirk: needs user gesture |
| Edge | 90+ | Latest | ✅ | Chromium-based, same as Chrome |

### Mobile Browsers
| Platform | Browser | Tested | Status | Notes |
|----------|---------|--------|--------|-------|
| iOS | Safari | 14+ | ✅ | No haptics (no Vibration API) |
| iOS | Chrome | Latest | ✅ | Renders via WebKit |
| Android | Chrome | Latest | ✅ | Full support + haptics |
| Android | Firefox | Latest | ✅ | Full support + haptics |
| Android | Samsung Internet | Latest | ✅ | Chromium-based, full support |

### Minimum Device Requirements
- **Desktop:** 1024×768 or higher
- **Mobile:** 320px width (iPhone SE) or higher
- **Memory:** <10 MB (game file + runtime)
- **Storage:** Negligible (no downloaded assets)

---

## Full Testing Checklist

### Desktop: Chrome/Chromium

**Basic Load & Render:**
- [ ] Open `index.html` (file:// or http://)
- [ ] Page loads without errors
- [ ] Title shows "Cut & Fill"
- [ ] Favicon displays (dozer icon)
- [ ] No console errors (F12 → Console)

**Gameplay (Level 1):**
- [ ] Click Start or Campaign
- [ ] Dozer appears in correct position
- [ ] Holes render (orange ▾ symbols)
- [ ] Dirt piles render (◆ symbols)
- [ ] Game board fits on screen without horizontal scroll

**Input Methods:**
- [ ] Arrow keys move dozer (up/down/left/right)
- [ ] WASD moves dozer (same)
- [ ] Space acts (push/fill)
- [ ] Z/U undo last move
- [ ] R restarts level
- [ ] H requests hint
- [ ] Esc opens menu

**Settings (click ⚙ button):**
- [ ] Settings panel opens
- [ ] Sound toggle works (check box)
- [ ] Haptics toggle visible (Android only)
- [ ] Touch mode selector (Pad/Swipe)
- [ ] Difficulty selector (Apprentice/Operator/Foreman)
- [ ] Time-trial toggle
- [ ] Reset progress button with confirmation

**Audio (if sound enabled):**
- [ ] Move sounds play
- [ ] Blocked push has distinct sound
- [ ] Filling hole has distinct sound
- [ ] Failure (sink/hit/wreck) has sound
- [ ] Win condition plays sound
- [ ] Toggles on/off correctly

**Save/Persist:**
- [ ] Complete a level
- [ ] Close browser tab
- [ ] Reopen index.html
- [ ] Level marked as complete with star rating
- [ ] Best move count preserved

**Regression Suite:**
- [ ] Run `?test=1` (append to URL)
- [ ] Page shows test results
- [ ] All 51 tests pass ✅

---

### Desktop: Firefox

**Same checklist as Chrome, with notes:**
- [ ] Audio synthesis works (Firefox supports WebAudio)
- [ ] Touch mode selector functions correctly
- [ ] No console warnings or errors
- [ ] localStorage persists across sessions

---

### Desktop: Safari (macOS)

**Load & Render:**
- [ ] Page loads
- [ ] No layout issues
- [ ] Fonts render correctly

**Important: WebAudio Initialization**
- [ ] First move/click triggers WebAudio context
- [ ] After gesture, sounds play in subsequent moves
- [ ] No errors in console about AudioContext

**Gameplay & Settings:**
- [ ] All controls work (keyboard, mouse)
- [ ] Settings persist
- [ ] No visual anomalies (colors, spacing)

**Safari-Specific Checks:**
- [ ] No Vibration API (haptics toggle should not appear)
- [ ] localStorage works correctly
- [ ] No iCloud sync issues with game state

---

### Desktop: Edge

**Quick Test (Chromium-based, should match Chrome):**
- [ ] Open index.html
- [ ] Play a level
- [ ] Settings work
- [ ] Audio plays
- [ ] No console errors

---

### Mobile: iOS Safari

**Load & Render:**
- [ ] Open in Safari on iPhone/iPad
- [ ] Game loads without errors
- [ ] Game fits on screen (portrait + landscape)
- [ ] No horizontal scroll

**Touch Input:**
- [ ] Swipe gestures work (move dozer)
- [ ] Tap to act (fill hole or push)
- [ ] Settings panel opens (click ⚙)

**Important Checks:**
- [ ] Haptics toggle does NOT appear (iOS has no Vibration API)
- [ ] Keyboard not available (iOS only has touch)
- [ ] Board sizes correctly for screen height
- [ ] Drawer collapses on mobile view
- [ ] Stats row horizontal scrolls if needed

**Audio:**
- [ ] Make a move
- [ ] Audio does NOT autoplay on iOS
- [ ] First interaction with move may trigger sound
- [ ] Subsequent moves play sound correctly

**Persistence:**
- [ ] Complete a level
- [ ] Close Safari completely (swipe up)
- [ ] Reopen Safari
- [ ] Game state preserved

---

### Mobile: Android Chrome

**Load & Render:**
- [ ] Open in Chrome on Android phone
- [ ] Game loads and renders correctly
- [ ] Board responsive to screen size

**Touch Input:**
- [ ] Swipe mode works (default)
- [ ] On-screen pad works (toggle in settings)
- [ ] Switching between modes works smoothly

**Audio & Haptics:**
- [ ] Audio plays from first move
- [ ] Haptics toggle appears (Android supports Vibration API)
- [ ] Haptics toggle works (enable/disable vibration)
- [ ] Haptics fire on: blocked push, fill, fail, win

**Settings Persistence:**
- [ ] All settings save
- [ ] Close app (not just browser)
- [ ] Reopen app
- [ ] Settings preserved, progress preserved

---

### Mobile: Android Firefox

**Same as Chrome Android checklist:**
- [ ] Game loads and plays
- [ ] Touch input works
- [ ] Audio functions
- [ ] Haptics work (if device supports)
- [ ] Settings persist

---

### Mobile: Samsung Internet

**Expected:** Full support (Chromium-based)
- [ ] Game loads and plays normally
- [ ] Touch controls work
- [ ] Audio and haptics functional
- [ ] No Samsung-specific issues

---

## Offline Testing

### Local File (No Server)

```bash
# Windows: double-click index.html in Explorer
# macOS: double-click index.html in Finder
# Or from Terminal: open index.html
```

**Verify:**
- [ ] Game loads without HTTP request errors
- [ ] No CORS errors in console
- [ ] All assets (CSS, JS, sounds) work
- [ ] No network tab activity (F12 → Network)
- [ ] Game fully playable offline
- [ ] localStorage works

### After GitHub Pages Deploy

```
https://YOUR_USERNAME.github.io/cut-and-fill/
```

**Verify:**
- [ ] Game loads from URL
- [ ] All assets load correctly (no 404s)
- [ ] Audio works
- [ ] Offline playback works (no network dependency)
- [ ] Settings persist

### Itch.io Frame

```
https://itch.io/games/cut-and-fill
```

**Verify:**
- [ ] Game loads in itch.io embed frame
- [ ] Windowed mode works
- [ ] Fullscreen button appears and works
- [ ] Game responsive inside frame
- [ ] Settings drawer accessible
- [ ] Audio works in frame
- [ ] localStorage persists (within itch.io sandbox)

---

## Performance Profiling

### Desktop: Chrome DevTools

1. Open F12 (DevTools)
2. Go to Performance tab
3. Click Record
4. Play 5 moves, open settings, toggle options
5. Click Stop

**Targets:**
- [ ] Frame rate: 60 FPS consistently
- [ ] No red bars (jank)
- [ ] Main thread: green (responsive)
- [ ] Memory: <5 MB
- [ ] Tasks: <50ms each

### Mobile: Chrome DevTools (Remote Debugging)

1. Connect Android phone via USB
2. Chrome Desktop → chrome://inspect
3. Select device → Inspect
4. Performance tab → Record gameplay
5. Analyze framerates and memory

**Targets:**
- [ ] 60 FPS on modern devices (last 3 years)
- [ ] 30-45 FPS on older devices (acceptable)
- [ ] No memory leaks after 10 min play
- [ ] Smooth animation on touch swipes

---

## Accessibility Testing

### Keyboard-Only Navigation

- [ ] Play entire level using only keyboard
- [ ] Can open/close all panels with arrow keys + Enter
- [ ] Buttons are focusable
- [ ] Focus visible (outline or highlight)
- [ ] No keyboard traps (can always escape)

### Screen Reader (Optional, Low Priority)

- [ ] Headers read correctly
- [ ] Buttons announce their function
- [ ] Stats read intelligently (not just numbers)
- [ ] Focus order makes sense

### High Contrast Mode (Windows)

1. Windows Settings → Ease of Access → High Contrast
2. Enable "High Contrast"

**Verify:**
- [ ] Colors adjust automatically
- [ ] Symbols still visible (▾, ✓, ◆)
- [ ] Text readable
- [ ] No reliance on color alone

---

## Known Issues & Workarounds

### Safari / iOS
**Issue:** WebAudio context requires user gesture  
**Workaround:** First move/click enables audio (already handled in code)  
**Status:** Expected behavior, not a bug

### iOS
**Issue:** No Vibration API  
**Workaround:** Haptics toggle hidden on iOS (line ~1012)  
**Status:** Expected, graceful degradation

### Older Android Devices
**Issue:** May struggle with 60 FPS  
**Workaround:** Device automatically caps framerate  
**Status:** Acceptable, game still playable

### localStorage Quota
**Issue:** Rare, only if many custom levels saved  
**Unlikely:** Game uses <100KB even with 60 levels  
**Mitigation:** Periodically prune old custom levels (if user desires)

---

## Sign-Off Criteria

Game is **ready for launch** when:

- ✅ Chrome: Plays fully, 60 FPS, no errors
- ✅ Firefox: Plays fully, 60 FPS, no errors
- ✅ Safari (desktop): Plays fully, audio works post-gesture
- ✅ Safari (iOS): Plays fully on iPhone, no crashes
- ✅ Chrome (Android): Plays fully, touch works, haptics functional
- ✅ Itch.io frame: Game loads and plays in embedded frame
- ✅ GitHub Pages: Game loads from URL, offline playable
- ✅ Offline: Works when opened as file://, no network errors
- ✅ Regression suite: All 51 tests pass ✅
- ✅ Performance: 60 FPS on desktop, 30-60 FPS on mobile

---

## Testing Template

Use this for each browser/device:

```
Browser: [Chrome/Firefox/Safari/Edge/Mobile]
OS: [Windows/macOS/iOS/Android]
Device: [Desktop/iPhone/Android Phone/Tablet]
Resolution: [width × height]

Load & Render: [PASS/FAIL]
Gameplay: [PASS/FAIL]
Input: [PASS/FAIL]
Settings: [PASS/FAIL]
Audio: [PASS/FAIL]
Persistence: [PASS/FAIL]
Regression Tests: [PASS/FAIL] (51/51 if checked)

Issues Found:
- [none] or [list here]

Tested By: [name]
Date: [date]
```

---

## Final Checklist

Before launch:
- [ ] All target browsers tested
- [ ] No critical bugs found
- [ ] Game loads without errors
- [ ] All 25 levels playable
- [ ] Settings work correctly
- [ ] Audio/haptics functional
- [ ] Offline playable
- [ ] Progress persists across sessions
- [ ] Screenshots captured and uploaded
- [ ] Itch.io page set up
- [ ] GitHub Pages deployed
- [ ] Regression tests pass (51/51)
- [ ] Ready for public release
