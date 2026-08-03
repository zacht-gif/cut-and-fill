# Cut & Fill - Launch Checklist & Post-Launch Guide

## Pre-Launch Verification (24 Hours Before)

### Code & Build
- [ ] Latest commit pushed to git
- [ ] Run regression tests: `node tools/test.mjs` → **51/51 PASS**
- [ ] Run validation suite: `python tools/validate.py` → **All 25 levels OK**
- [ ] No uncommitted changes

### Testing
- [ ] Tested on Chrome desktop (✅ PASS)
- [ ] Tested on Firefox desktop (✅ PASS)
- [ ] Tested on Safari desktop (✅ PASS)
- [ ] Tested on mobile (iOS or Android) (✅ PASS)
- [ ] All 25 campaign levels accessible
- [ ] Settings panel functional
- [ ] Audio/haptics working
- [ ] Progress saves and persists
- [ ] Offline playable

### Assets
- [ ] README.md updated with player content
- [ ] PUBLICATION.md created with setup guides
- [ ] ITCH-IO-PAGE.md ready (copy-paste to itch.io)
- [ ] SCREENSHOTS-GUIDE.md created
- [ ] Screenshots captured (2-4 images, 800×600+)
- [ ] Favicon appears in browser tab
- [ ] No console errors (F12 check)

### Metadata
- [ ] Game title: "Cut & Fill"
- [ ] Description: Player-friendly (from ITCH-IO-PAGE.md)
- [ ] Tags: puzzle, game, web, offline, browser, etc.
- [ ] License file accurate and updated
- [ ] Copyright notice in HTML head

---

## GitHub Pages Deployment

### Step 1: Create Repository

```bash
# If not already done:
cd "C:\Users\ZachT\OneDrive\Desktop\Personal Games\cut-and-fill"

git remote add origin https://github.com/YOUR_USERNAME/cut-and-fill.git
git branch -M main
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Go to https://github.com/YOUR_USERNAME/cut-and-fill/settings
2. Navigate to "Pages" section (left sidebar)
3. Under "Source", select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click "Save"
5. Wait 1-2 minutes for deployment

**Verification:**
```
Game will be live at: https://YOUR_USERNAME.github.io/cut-and-fill/
```

### Step 3: Test GitHub Pages

- [ ] Navigate to `https://YOUR_USERNAME.github.io/cut-and-fill/`
- [ ] Game loads and renders correctly
- [ ] Play through a level
- [ ] Open settings, toggle options
- [ ] Reload page → progress saved
- [ ] Test on mobile (same URL)
- [ ] Verify offline playable

### Step 4: Add to GitHub Repo (Optional)

Copy documentation to repo:
```bash
git add TEST-RESULTS.md PUBLICATION.md ITCH-IO-PAGE.md SCREENSHOTS-GUIDE.md BROWSER-COMPATIBILITY.md LAUNCH-CHECKLIST.md
git commit -m "Add publication and testing documentation"
git push
```

---

## Itch.io Deployment

### Step 1: Create Project

1. Go to https://itch.io/dashboard
2. Click "New Project"
3. Fill in:
   - **Title:** Cut & Fill
   - **URL:** cut-and-fill
   - **Classifier:** Game
   - **Kind:** HTML
4. Click "Create Project"

### Step 2: Fill in Metadata

1. **Description** → Copy from ITCH-IO-PAGE.md (Long Description section)
2. **Short Description** → Copy tagline: "A tactile puzzle game about moving earth and avoiding traffic"
3. **Tags** → puzzle, game, web, offline, browser, strategy
4. **Author** → Your name
5. **Release Date** → Today's date (drives itch.io visibility)

### Step 3: Upload Game

1. Scroll to "Uploads" section
2. Click "Upload files"
3. Select `index.html` from cut-and-fill folder
4. Mark as: "This file will be played in the browser"
5. Click "Upload & Continue"
6. In upload options:
   - **Embed in page:** Enabled
   - **Embedding size:** Fullscreen or Auto
   - **Allow fullscreen:** Yes

### Step 4: Add Screenshots

1. Click "Edit screenshots" (or scroll to screenshots section)
2. For each screenshot:
   - Click "Upload screenshot"
   - Select PNG file (800×600 or higher)
   - Images display below
3. Reorder screenshots (drag to reorder)
   - First screenshot becomes thumbnail
4. Click "Save" when done

**Screenshot order recommended:**
1. Level select (shows campaign)
2. Active gameplay (shows mechanics)
3. Settings (shows customization)
4. Difficult level (shows depth)

### Step 5: Publishing

1. Scroll to top
2. **Status:** Select "Public"
3. **Rating:** Everyone (E)
4. Click "Publish" button
5. Confirm publication

**Live at:** https://itch.io/games/cut-and-fill (or your custom URL)

### Step 6: Test Itch.io

- [ ] Navigate to game page
- [ ] Click "Play in browser"
- [ ] Game loads in itch.io frame
- [ ] Play a full level
- [ ] Test fullscreen button
- [ ] Test settings
- [ ] Reload → progress saved
- [ ] Check on mobile
- [ ] Screenshots visible

---

## Post-Launch Monitoring (First Week)

### Day 1: Launch Day

- [ ] Game is live on both platforms
- [ ] Shared launch link with friends/testers
- [ ] Monitored browser console (F12) for errors
- [ ] Tested both itch.io and GitHub Pages links
- [ ] Game playable without issues

### Day 2-3: Initial Feedback

- [ ] Checked itch.io comments/messages
- [ ] No critical crash reports
- [ ] Shared on social media:
  - Reddit: r/puzzlegames, r/indiegames
  - Twitter: #indiegame #gamedev #puzzle
  - Personal channels
- [ ] Monitored player feedback

### Day 4-7: Week 1 Review

- [ ] Gathered feedback from testers
- [ ] Identified any recurring issues
- [ ] Performance stable (no crashes)
- [ ] Player engagement metrics (if tracking)
- [ ] Difficulty feedback (too easy/hard?)

---

## Ongoing Monitoring

### Metrics to Watch

**Engagement:**
- Number of plays (itch.io dashboard)
- Completion rate (players reaching end)
- Time spent per level (analytics)

**Technical:**
- Browser console errors (F12 check periodically)
- localStorage issues (if reported)
- Offline functionality
- Cross-browser compatibility

**Player Feedback:**
- Most difficult levels (from comments)
- Feature requests (leaderboards, more levels)
- Bug reports (prioritize and fix)
- Positive feedback (celebrate wins)

### Monthly Check-In

Every month:
- [ ] Review itch.io analytics
- [ ] Check for new issues
- [ ] Confirm both platforms still working
- [ ] Update documentation if needed
- [ ] Plan Phase 2 if desired

---

## Post-Launch Actions

### Bug Fix Workflow

If critical bug found:
1. Reproduce the issue
2. Identify root cause (code/browser/hardware)
3. Fix in index.html
4. Test regression suite: `node tools/test.mjs`
5. Commit: `git commit -m "Fix: [description]"`
6. Push to GitHub
7. Patch file on itch.io
8. Monitor for issue resolution

### Feature Requests for Phase 2

Common requests to consider:
- **Leaderboards** (local export or cloud)
- **More levels** (additional campaign chapters)
- **Cosmetics** (dozer skins, themes)
- **Mobile app** (PWA wrapper)
- **Replay sharing** (GIF/video export)
- **Sound pack** (sampled audio option)

**Keep these principles:**
- Zero network requests (offline-first)
- Single HTML file (no build step)
- No dependencies
- Lightweight

---

## Success Metrics

Game is considered **successful** when:

- ✅ **Launched on both platforms** (itch.io + GitHub Pages)
- ✅ **Zero critical bugs** for 2 weeks post-launch
- ✅ **100+ plays** within first month (conservative)
- ✅ **Positive community feedback** (fun, well-designed)
- ✅ **Consistent 60 FPS** on target browsers
- ✅ **All 25 levels accessible** and solvable

---

## Timeline: Launch Week

| Day | Action | Owner |
|-----|--------|-------|
| **Day 1** | GitHub Pages live, Itch.io live, announce | You |
| **Day 2-3** | Social media push, gather initial feedback | You |
| **Day 4-5** | Review analytics, fix urgent issues | You |
| **Day 6-7** | Summary report, plan Phase 2 if interested | You |

---

## Communication Template

### Launch Announcement

```
🎮 Cut & Fill is now live!

A tactile puzzle game about moving earth and avoiding traffic.

25 hand-crafted levels + random generation + level editor + time-trial mode
Works offline, no ads, single HTML file.

Play free:
🔗 https://itch.io/games/cut-and-fill
🔗 https://YOUR_USERNAME.github.io/cut-and-fill/

#indiegame #puzzle #gamedev
```

### Feedback Request

```
Playing Cut & Fill? I'd love your feedback!

- Which levels did you find most fun?
- Did you use the level editor?
- Any bugs or weird behavior?
- Feature ideas for Phase 2?

Reply in the comments or DM me. Thanks for playing! 🚜
```

---

## Celebration Checklist

When live:
- ✅ Announce launch to friends/family
- ✅ Share on social media
- ✅ Post to relevant communities
- ✅ Celebrate milestone (game is published!)
- ✅ Update portfolio/resume if applicable
- ✅ Reflect on what went well
- ✅ Document lessons learned

---

## Reference Links

- **Itch.io Dashboard:** https://itch.io/dashboard
- **GitHub Settings:** https://github.com/YOUR_USERNAME/cut-and-fill/settings
- **GitHub Pages Docs:** https://docs.github.com/en/pages
- **Itch.io Help:** https://itch.io/docs
- **Game Distribution:** Consider cross-posting to IndieDB, GameJolt, etc.

---

## Final Notes

You've built Cut & Fill with:
- 25 proven-solvable levels
- Complete hint system
- Three difficulty modes
- Zero external dependencies
- Comprehensive testing suite

**You're ready to launch. Good luck! 🎮**
