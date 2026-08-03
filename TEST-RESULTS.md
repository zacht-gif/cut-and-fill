# Cut & Fill - Test Results

## Validation Suite (Python)
**Status:** ✅ PASS

- All 25 levels validated
- All levels solvable on all 3 shifts (apprentice, operator, foreman)
- All par values verified as optimal
- No authoring errors detected

```
25 levels from index.html
all levels solvable on all 3 shift(s), all pars correct
```

## Regression Suite (JavaScript/Node.js)
**Status:** ✅ PASS (51/51 checks)

### Game Mechanics
- ✅ Solutions cover every level (25 levels / 25 solutions)
- ✅ Reference solutions replay to a win at par
- ✅ Solver agrees with every recorded par
- ✅ Levels beyond browser search budget properly capped (5 of 25)

### Failure Conditions
- ✅ Driving into soft ground sinks you
- ✅ Parking in a live lane gets you hit
- ✅ Dirt left in a lane causes a wreck
- ✅ Failed run is frozen until undo
- ✅ Undo revives a failed run exactly

### Game Rules
- ✅ Timed levels stay solvable on all three shifts
- ✅ Star system: par or better = 3 stars
- ✅ Star system: within 25% over par = 2 stars
- ✅ Star system: finished = at least 1 star
- ✅ Unplayed levels = no stars

### Hint System
- ✅ Hints refused when stock empty
- ✅ Using a hint costs one and marks run as assisted
- ✅ Finishing at par awards a hint
- ✅ Same site cannot be farmed for hints
- ✅ Unaided par run marked as clean
- ✅ Using undo marks run as not clean
- ✅ No-op undo leaves run clean

### Persistence
- ✅ Scores keyed by level name, not position
- ✅ Progress saved correctly in localStorage

### Audio System
- ✅ Blocked push cues correctly
- ✅ Driving with nothing to push is silent
- ✅ Shifting a load sounds like a push
- ✅ Finishing site sounds like winning
- ✅ Soft ground swallowing load has cue
- ✅ Run failure sounds like failure

### Share Code System
- ✅ Share codes round-trip exactly
- ✅ Corrupted codes rejected, not half-read
- ✅ Verified site reports true optimum
- ✅ Unsolvable site refused

### Editor Validation
- ✅ Site with no dozer refused
- ✅ Insufficient loads for holes refused
- ✅ Excessive loads (beyond certainty) refused
- ✅ All guarantees that published par is real

### Input & Animation
- ✅ Moves faster than animation stop animating
- ✅ Deliberate moves animate again
- ✅ Tap is exactly one step
- ✅ Newest held direction wins
- ✅ Releasing newest falls back to held direction
- ✅ Losing focus stops movement
- ✅ Quick moves animate faster than deliberate ones
- ✅ Swipe mode hides pad
- ✅ Pad mode shows buttons

### UI & Navigation
- ✅ No panel open = board has keyboard
- ✅ Open panel takes keyboard
- ✅ Picker nodes survive moves (no rebuild churn)

### Procedural Generation
- ✅ Generated sites solvable and replay to win
- ✅ Daily generation deterministic for seed

## Manual Testing Checklist

### Gameplay
- [ ] Play through Level 1 to understand controls
- [ ] Play 5 levels across all three chapters
- [ ] Test random site generation (all 3 tiers)
- [ ] Test daily challenge
- [ ] Complete a level at par (3 stars)
- [ ] Use hint system
- [ ] Test undo on final move
- [ ] Test all failure conditions (sink, hit, wreck)

### Settings
- [ ] Toggle sound (on/off, verify cues in next move)
- [ ] Toggle haptics (if on Android)
- [ ] Switch between touch modes (pad vs swipe)
- [ ] Change difficulty shift (verify traffic changes)
- [ ] Toggle time-trial mode
- [ ] Reset progress (confirm warning appears)
- [ ] Verify settings persist after reload

### Controls
- [ ] Keyboard: arrows + space
- [ ] Keyboard: WASD + space
- [ ] Keyboard: Z for undo, R for restart
- [ ] Touch: swipe mode (all 4 directions)
- [ ] Touch: pad mode (all buttons)
- [ ] Mouse/pointer support

### Responsiveness
- [ ] Desktop (1920px+): board centered, drawer open
- [ ] Laptop (1280px): board sized appropriately
- [ ] Tablet (768px): board responsive, drawer closable
- [ ] Mobile (375px): entire game fits in one screen, no scrolling

### Persistence
- [ ] Complete a level
- [ ] Reload page
- [ ] Confirm progress and best time saved
- [ ] Clear localStorage
- [ ] Confirm fresh start

### Browsers (if available)
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (desktop + iOS)
- [ ] Edge
- [ ] Mobile Safari on iPad

### Offline
- [ ] Double-click index.html locally
- [ ] Game loads without network errors
- [ ] Plays fully offline
- [ ] Progress saves to localStorage

## Performance Notes

**Target:** 60 FPS consistently, <5MB memory

To profile:
1. Open Chrome DevTools (F12)
2. Performance tab → Record
3. Play 3-5 moves, open settings, change options
4. Stop recording, analyze framerate and memory

## Known Limitations

From code analysis:
- Level editor: max 3 loads (verification certainty limit)
- Browser solver: caps at ~200K states (falls back to best-first)
- iOS: No vibration API (no haptics)
- Safari: WebAudio may require user gesture

## Sign-Off

- ✅ All automated tests pass
- ✅ All 25 levels verified solvable on all shifts
- ✅ Game ready for manual testing phase
- ✅ No known critical issues

**Ready for:** Screenshot capture and itch.io page creation
