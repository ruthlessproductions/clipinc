# Clipinc

Clipinc is a local-first tool that turns long-form videos and podcasts into short-form clips ready to publish on TikTok, YouTube Shorts, Instagram Reels, and Twitter/X.

- **AI highlight detection** — automatically finds the most shareable moments
- **Clip editor** — trim, adjust aspect ratio, preview in real time
- **Animated captions** — word-by-word TikTok-style captions burned into the video
- **One-click publishing** — post directly to connected platforms or schedule for later
- **Local or cloud AI** — run analysis on your own machine with oMLX, or use Claude

---

## Requirements

| Dependency | Version | Notes |
|---|---|---|
| Node.js | 18+ | |
| ffmpeg | any recent | Must be on your `PATH` |
| oMLX server | optional | For local AI highlight detection |
| Anthropic API key | optional | For Claude-powered highlight detection |

Install ffmpeg if you don't have it:

```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt install ffmpeg
```

---

## Installation

```bash
git clone https://github.com/your-org/clipinc.git
cd clipinc
npm install
```

---

## Configuration

Copy the example env file and fill in what you need:

```bash
cp .env.example .env.local
```

`.env.local` reference:

```env
# ── Storage ──────────────────────────────────────────────────────────────────
# Where uploaded videos and clips are stored (default: ./storage)
STORAGE_ROOT=./storage

# ── Local AI (oMLX) ──────────────────────────────────────────────────────────
# URL of your oMLX-compatible local inference server
OMLX_URL=http://localhost:8000
OMLX_MODEL=mlx-community/Llama-3.3-70B-Instruct-4bit
OMLX_API_KEY=

# ── Claude (optional) ────────────────────────────────────────────────────────
# Used when AI Model is set to Claude in Settings.
# You can also paste the key directly in the Settings page.
ANTHROPIC_API_KEY=

# ── YouTube ──────────────────────────────────────────────────────────────────
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

# ── TikTok ───────────────────────────────────────────────────────────────────
TIKTOK_ENV=sandbox                     # or: production
TIKTOK_CLIENT_KEY_SANDBOX=
TIKTOK_CLIENT_SECRET_SANDBOX=
TIKTOK_CLIENT_KEY_PRODUCTION=
TIKTOK_CLIENT_SECRET_PRODUCTION=

# ── Instagram ────────────────────────────────────────────────────────────────
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
# Instagram pulls the video from a public URL — required for publishing
APP_PUBLIC_URL=https://your-tunnel.ngrok.io

# ── Twitter / X ──────────────────────────────────────────────────────────────
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
```

You only need to fill in the credentials for platforms you intend to publish to. The app runs fine with none of them set.

---

## Running the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

### 1 — Upload a video

Drag and drop a video file onto the home screen, or paste a URL. The app saves the file locally and waits for a transcript.

### 2 — Add a transcript

Clipinc does not transcribe automatically (this keeps it fast and avoids large model downloads). Provide a transcript in one of these formats:

- **VTT** (WebVTT) — exported from Descript, Rev, Otter, YouTube, etc.
- **SRT** — exported from most video editors
- **Plain text** — paste a raw transcript

Upload the transcript file on the project page, or paste it in the text field.

> **Tip:** On macOS, [MacWhisper](https://goodsnooze.gumroad.com/l/macwhisper) can transcribe locally in minutes and export VTT.

### 3 — Analyse highlights

Click **Analyse** on the project page. The AI reads the transcript and identifies the best clip moments. This takes a few seconds with Claude, or longer with a local model depending on your hardware.

### 4 — Edit clips

Click any suggested clip to open the editor:

- **Trim** — drag the handles on the trim slider to adjust start/end
- **Aspect ratio** — 9:16 for TikTok/Reels/Shorts, 1:1 for feeds, 16:9 for landscape
- **Captions** — pick a style (Classic, Neon, or Bold) to add word-by-word animated captions

### 5 — Export or publish

- **Download** — exports the clip as an MP4 with captions burned in
- **Publish** — sends the clip to connected platforms immediately
- **Schedule** — exports now, publishes automatically at a chosen time (the app must be running)

---

## Connecting social platforms

Go to **Settings → Connected Accounts** and click **Connect** next to a platform. Each requires a developer app:

### YouTube
1. [Google Cloud Console](https://console.cloud.google.com) → create a project
2. Enable **YouTube Data API v3**
3. Create **OAuth 2.0 credentials** (Web application)
4. Add `http://localhost:3000` as an authorised JavaScript origin
5. Add `http://localhost:3000/api/social/youtube/connect` as a redirect URI
6. Copy Client ID and Secret to `.env.local`

### TikTok
1. [TikTok Developer Portal](https://developers.tiktok.com) → create an app
2. Add the **Login Kit** and **Content Posting API** products
3. Set redirect URI to `http://localhost:3000/api/social/tiktok/connect`
4. Copy Client Key and Client Secret to `.env.local`

> TikTok sandbox only supports posting to drafts (Creator Inbox). Direct posting requires submitting the app for production review.

### Instagram
1. [Meta for Developers](https://developers.facebook.com) → create an app (Business type)
2. Add **Instagram Graph API**
3. Set redirect URI to `http://localhost:3000/api/social/instagram/connect`
4. Requires an Instagram Professional account linked to a Facebook Page
5. Instagram pulls the video from your server, so set `APP_PUBLIC_URL` to a public tunnel (e.g. [ngrok](https://ngrok.com))

### Twitter / X
1. [Twitter Developer Portal](https://developer.twitter.com) → create a project and app
2. Enable **OAuth 2.0** with read and write permissions
3. Set redirect URI to `http://localhost:3000/api/social/twitter/connect`
4. Video publishing requires Basic tier or higher ($100/month)

---

## AI model selection

Go to **Settings → AI Model** to switch between:

| Option | Description |
|---|---|
| **Local Model** | Uses your oMLX server at `OMLX_URL`. Free and private. Requires a running inference server compatible with the OpenAI chat completions API. |
| **Claude** | Uses `claude-opus-4-5` via the Anthropic API. Faster and more accurate. Paste your API key from [console.anthropic.com](https://console.anthropic.com). |

---

## Animated captions

Clipinc generates **ASS karaoke subtitles** burned directly into the exported MP4 — no separate subtitle file needed. Three built-in styles:

| Style | Description |
|---|---|
| **Classic** | White text, yellow word highlight — the standard TikTok look |
| **Neon** | White text, purple highlight |
| **Bold** | Larger font, orange highlight |

Word timing is approximated from the transcript segment timestamps. For frame-accurate word timing, use a transcript with per-word timestamps (Whisper's `--word_timestamps` flag, or a service like AssemblyAI).

---

## Project structure

```
src/
  app/                  Next.js App Router pages and API routes
    api/
      clips/            Clip CRUD, export, download
      projects/         Project CRUD, video streaming, transcript
      social/           OAuth connect/disconnect, publish, scheduled check
      settings/         Model provider settings
      upload/           Video upload handler
  components/
    editor/             Clip editor components (trim slider, caption picker…)
    ui/                 Shared UI primitives
  context/              React context (clips, projects, social accounts)
  lib/
    captions.ts         ASS subtitle generation
    db.ts               SQLite database (better-sqlite3)
    ffmpeg.ts           ffmpeg wrappers (extract, thumbnail, audio)
    llm.ts              Highlight detection (local oMLX + Claude)
    social/platforms.ts OAuth flows and platform publish functions
    storage.ts          File path helpers
storage/                Video files, clips, thumbnails, SQLite DB (gitignored)
```

---

## License

MIT
