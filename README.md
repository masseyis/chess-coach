# Chess Coach

A minimal React + TypeScript chess coach that lets you play as White against a built-in Stockfish engine and receive OpenAI-powered coaching after every move.

## Features

- **Playable board** powered by `react-chessboard` and `chess.js` with legal move validation.
- **WebAssembly Stockfish** running inside a Web Worker for quick evaluations and engine replies.
- **Coaching feedback** after each human move (grade, explanation, better moves, highlighted principles) with positive reinforcement.
- **Eval tracking** so the UI shows the current engine assessment from White's perspective.
- **Undo + replay training** so you can roll back the last attempt and try again immediately.
- **Game controls** for new games and selecting engine search depth.
- **GitHub Pages friendly**: automatically falls back to a single-threaded Stockfish build when `SharedArrayBuffer` isn’t available.
- **Session persistence** so refreshes/devices keep your current game via local storage.

## Prerequisites

- Node.js 18+
- An OpenAI API key for coaching feedback

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. (Optional) Create a `.env` file if you want to override defaults such as the OpenAI model or API base:

   ```bash
   # .env
   # VITE_OPENAI_API_KEY=sk-...   # Pre-fills the in-app manager (still stored locally per device)
   # VITE_OPENAI_MODEL=gpt-4.1-mini
   # VITE_OPENAI_API_BASE=https://api.openai.com/v1/chat/completions
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open the URL printed in your terminal (usually `http://localhost:5173`).

## Bring your own OpenAI key

- In the app header you'll find an **OpenAI API key** card—paste your key there once and it will be stored locally (browser storage or the iOS Keychain when running the Capacitor shell).
- The key never leaves your device except when making your own coaching requests to the OpenAI API.
- You can update or remove the key at any time; if you set `VITE_OPENAI_API_KEY` in `.env`, that value simply pre-fills the manager for convenience.

> Hosting the web bundle (Vercel, Netlify, GitHub Pages, etc.) is safe because every visitor keeps their key on their own device—the app never uploads or proxies those keys through your server.

## How it works

- The Vite dev server is configured with the `Cross-Origin-Embedder-Policy`/`Cross-Origin-Opener-Policy` headers required by `stockfish.wasm`.
- Every human move triggers two Stockfish evaluations (before and after the move) followed by a request to the OpenAI Chat Completions API for tailored coaching.
- If coaching fails or the API key is missing, the chess game continues and the UI shows an inline error.

## Available scripts

| Script       | Description                          |
| ------------ | ------------------------------------ |
| `npm run dev`    | Start Vite dev server.               |
| `npm run build`  | Type-check and create a production build. |
| `npm run preview`| Preview the production build locally. |
| `npm run lint`   | Run ESLint on the codebase.          |

## Tweaking the coach

- Adjust `src/lib/coachingPrompt.ts` to change the system prompt, grading rules, or coaching tone.
- Update `src/lib/openaiClient.ts` if you want to call a different model or route requests through a backend proxy.
- Tune the long-term coaching memory in `src/lib/coachingHistory.ts` (for example, track more/less history or surface different principle summaries).
- The Stockfish search depth dropdown (in `src/components/Controls.tsx`) is the simplest way to dial difficulty, but you can also modify the worker to tweak skill level, hash, or time controls.
- Use the **Undo move** button in the header to replay a position right after receiving feedback.

## Running on iOS with Capacitor

This repo is preconfigured with [Capacitor](https://capacitorjs.com/) so you can ship the web UI as a native iOS app:

1. Ensure your `.env` (or `.env.production`) contains `VITE_OPENAI_API_KEY` before building. The key is still bundled client-side, so only deploy to devices you trust.
2. Build the web assets and sync them into the Capacitor shell:

   ```bash
   npm run build
   npm run cap:sync
   ```

3. Open the Xcode workspace:

   ```bash
   npm run cap:open:ios
   ```

4. In Xcode, pick your team/signing certificate, select a simulator or plugged-in device, then press **Run** (⌘R).

Whenever you change the React app, re-run `npm run build && npm run cap:sync` so the updated assets land in `ios/App/App/public`. You can also use Capacitor's live reload workflow (`npx cap run ios -l --external`) if you prefer to develop directly on device. The in-app API key manager automatically uses the iOS Keychain via Capacitor Preferences.

## Deploying to GitHub Pages

- This repo already contains a workflow at `.github/workflows/deploy.yml`. Every push to `main` builds the Vite app with the correct base path (`/chess-coach/`) and publishes it via GitHub Pages.
- The published site lives at <https://masseyis.github.io/chess-coach/> (update the URL if you fork/rename the project).
- Since the UI is BYO-key, visitors will paste their own OpenAI key locally; the workflow injects `VITE_OPENAI_API_KEY=""` so your key is never bundled in CI.

Enjoy the training!
