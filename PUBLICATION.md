# Publication Setup Guide

## GitHub Pages Setup

1. **Create GitHub Repository**
   - Go to https://github.com/new
   - Repository name: `cut-and-fill`
   - Description: "A tactile puzzle game about moving earth and avoiding traffic"
   - Choose: Public (for free hosting)
   - Initialize with: None (we'll push existing repo)

2. **Push to GitHub**
   ```bash
   cd "C:\Users\ZachT\OneDrive\Desktop\Personal Games\cut-and-fill"
   git remote add origin https://github.com/YOUR_USERNAME/cut-and-fill.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to repo Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` / root folder
   - Custom domain: (optional, leave blank for now)
   - Click Save

4. **Verify**
   - Game will be live at: `https://YOUR_USERNAME.github.io/cut-and-fill/`
   - Takes ~1 minute to deploy
   - Test the link - game should load and be playable

## Itch.io Setup

1. **Create Project**
   - Go to https://itch.io/dashboard
   - Click "New Project"
   - Title: `Cut & Fill`
   - URL: `cut-and-fill` (recommended)
   - Classification: Game
   - Kind of Project: HTML (Web)
   - Click "Create Project"

2. **Fill in Project Details**
   - **Description:** Copy from README.md intro section
   - **Short description:** "A tactile puzzle game about moving earth and avoiding traffic"
   - **Tags:** puzzle, game, web, offline, browser
   - **Author:** Your name
   - **Release Date:** Today's date (drives visibility on itch.io)

3. **Upload Game**
   - Scroll to "Uploads"
   - Click "Upload files"
   - Select: `index.html`
   - Mark as: This file will be played in the browser
   - Click "Upload & Continue"

4. **Add Screenshots** (optional but recommended)
   - Click "Edit screenshots"
   - Upload 2-3 gameplay screenshots showing:
     - Level select screen
     - Active gameplay with vehicles
     - Settings panel
   - Dimensions: 800×600 or higher (itch.io will resize)

5. **Configure Embedding**
   - Under "Uploads", make sure:
     - "Embed in page" is enabled
     - Sizing: "Fullscreen"
     - Allow fullscreen: Yes

6. **Publish**
   - Set visibility: Public
   - Click "Publish Now"
   - Game will be live at: `https://itch.io/games/cut-and-fill` (or your custom URL)

## Testing After Deployment

### GitHub Pages
1. Navigate to `https://YOUR_USERNAME.github.io/cut-and-fill/`
2. Play through a campaign level
3. Open settings and toggle sound/haptics/touch mode
4. Reload page - confirm progress is saved
5. Test on mobile (portrait + landscape)

### Itch.io
1. Navigate to your itch.io project page
2. Click "Play in browser"
3. Test in the itch.io frame (windowed mode)
4. Test fullscreen mode
5. Play through a level, verify saves work
6. Check that settings panel is visible and accessible

## Offline Testing

Both games should work offline:
```bash
# Test locally (double-click index.html in Windows Explorer)
# Should load without any network errors
# Should work entirely offline
```

## Post-Launch

- Monitor itch.io page for player feedback
- Check GitHub issues if any arise
- Share with friends/communities:
  - Reddit: r/puzzlegames, r/indiegames
  - Twitter: #indiegame #gamedev
  - Itch.io: Collections and communities
