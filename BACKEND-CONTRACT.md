# Backend Contract (Not a Database Migration)

This documents calls present in the client. Production SQL and deployment
credentials are not exported. The contracts below do not imply that a fork has
the production database's security or scoring rules.

## Authentication

Supabase Web3 authentication with a supported Solana wallet and signed message.
Use your own project and allowed redirect origins. The Mobile Wallet Adapter
SIWS chain identifier is `solana:mainnet`. Do not modify the message after signing.

## Progress

Table: sagasu_care_saves, queried for player_id, state and revision by player_id.
RPC: sagasu_save_care(p_state, p_expected_revision).
Revision mismatch is handled as error code 40001. Ownership must be enforced
using authenticated identity, not a player ID supplied by an untrusted browser.

## Profile

Table: sagasu_players, queried for username and username_changed_at by id.
RPC: sagasu_set_username(p_username). Server-side validation and the username
change policy must be enforced by the backend, not only browser controls.

## Competition

RPCs: sagasu_weekly_leaderboard(), sagasu_begin_ranked_round(),
sagasu_cancel_ranked_round(p_round), sagasu_ranked_hit(p_round, p_nonce).
The browser receives round IDs/nonces and sends hit requests. The backend must
validate ownership, round state, timing and nonces rather than trusting browser
scores. Inspect leaderboard.js for expected response shapes.

## Token Balance

GET /api/sagasu-balance requires a Bearer session token. The handler verifies
the session through Supabase and derives the wallet from a verified identity.
It queries the configured mint through the server's Helius URL and returns a
validated RPC result. The RPC URL/key must never be sent to the browser.

Before deploying a fork, review row-level security, validation, authorization,
logging, rate limiting and data-request handling independently.
