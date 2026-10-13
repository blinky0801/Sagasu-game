# SAGASU Game

SAGASU is a virtual-pet game built for Solana Mobile: care for a companion across
four rooms, play a catch mini-game, complete daily missions and join a weekly
leaderboard. Play as a guest or authenticate with a supported Solana wallet.

Live game: https://game.sagasusol.xyz/

SAGASU Beta is available on the Solana Mobile dApp Store.
Android package: `xyz.sagasusol.game.beta`, version `0.1.2-beta` (code 3).

## Repository Scope

This public repository contains frontend logic, the wallet integration, the
token-balance backend, focused unit tests and the Android WebView shell source.
**Artwork, logo bitmaps, animation frames, music, voice files and videos remain
private.** They are not included or licensed for redistribution here.

This is a source-review repository, not a fully self-contained game export.
Without authorized private media, opening the frontend produces missing media;
the published game is the complete demo. No private production configuration,
signing key, credentials, APKs or team documents are included.

## Architecture

- `game/`: vanilla HTML/CSS/JavaScript gameplay and account UI.
- `deployment/wallet-tools/wallet-entry.js`: Wallet Standard and Solana Mobile
  Wallet Adapter integration; bundled browser output and notices are included.
- `game/cloud-account.js`: signed Solana wallet authentication through
  Supabase, account switching and bounded startup/save operations.
- `game/progress-sync.js`: persistent pending saves, retries and revision
  checks to handle concurrent device updates.
- `game/leaderboard.js`: client for server-validated ranked rounds.
- `balance-backend.cjs`: verifies the authenticated wallet identity before a
  fixed token-balance query through a server-side Helius RPC URL.
- `android-beta/`: Android WebView shell with native wallet-intent routing,
  landscape presentation, HTTPS error handling and confirmed Quit Game.

Gameplay coins/XP are separate from blockchain tokens. There is no token payout,
cash-redemption feature or claim of financial returns in the current beta.

## Local Setup

Requires Node.js 22 or later. Root scripts have no npm runtime dependencies.

1. Copy `game/cloud-config.example.js` to `game/cloud-config.js`.
2. Set your own Supabase project URL and public publishable key. Never place a
   service-role key, RPC API key, private key or signing password in browser code.
3. If authorized, place private media at the paths listed in `MEDIA.md`.
4. Run `npm start`; open http://localhost:4173/ . If that port is occupied, set
   `PORT` to another value and set `APP_ORIGIN` to the corresponding origin.

For the optional token-balance API, set `HELIUS_RPC_URL` only in the server's
environment. `.env.example` is documentation, not an automatically loaded file.
The server listens on loopback for local development, not as a production host.
Private media/config added locally are ignored by Git.

## Cloud Requirements

Production Supabase database migrations are **not included** in this export.
Read `BACKEND-CONTRACT.md` for tables/RPCs expected by the client. Wallet login,
cloud saves, usernames and ranked competition need a correctly configured
backend with ownership checks and server-side validation; copying browser code
does not deploy those guarantees. Do not connect review/testing forks to the
live production database. Guest gameplay is local, once private media is supplied.

## Tests

```sh
npm test
```

Tests use synthetic identities, mocked provider responses and a temporary local
HTTP server. They do not authenticate real users or call production infrastructure.
They cover token precision, verified wallet identity, save conflict/retry behavior,
origin restrictions and prevention of RPC-key leakage.

## Wallet Bundle

```sh
cd deployment/wallet-tools
npm ci --legacy-peer-deps
npm run build
```

The committed lockfile fixes dependency versions. Bundle output and third-party
license notices are written to `game/assets/`.

## Android

Requires Java 17 or later (development used Java 21) and Android SDK 34. Configure
the SDK through your environment or ignored `local.properties`, then run:

```sh
cd android-beta
./gradlew assembleDebug
```

On Windows, use `gradlew.bat assembleDebug`. Public source uses a neutral vector
launcher rather than private SAGASU artwork. The shell loads the hosted game;
local gameplay media is not bundled inside it. A debug build cannot update the
signed store APK. Release updates need the owner's existing signing key and a
higher version code. Never publish signing credentials or request user seed phrases.

## Rights and Security

This repo is public for review, but no blanket open-source license is granted for
project-owned code or media; see `RIGHTS.md`. Third-party code retains its licenses.
For security issues, contact contact@sagasusol.xyz without posting secrets or
private player data in public issues.

Solana Mobile references:
- https://docs.solanamobile.com/recipes/general/publishing-a-web-app
- https://docs.solanamobile.com/get-started/web/installation
