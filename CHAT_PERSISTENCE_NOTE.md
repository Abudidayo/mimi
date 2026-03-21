# Chat Refresh Persistence

## Summary

The chat UI now keeps conversation history after a browser refresh.

## What Changed

- Added Convex-backed chat snapshot persistence.
- The app now wraps the UI with a Convex provider in [app/layout.tsx](/c:/Users/abudi/Documents/GitHub/Civ-AI/app/layout.tsx).
- Chat snapshots are loaded and saved from [app/page.tsx](/c:/Users/abudi/Documents/GitHub/Civ-AI/app/page.tsx).
- Convex schema and functions live in [convex/schema.ts](/c:/Users/abudi/Documents/GitHub/Civ-AI/convex/schema.ts) and [convex/chat.ts](/c:/Users/abudi/Documents/GitHub/Civ-AI/convex/chat.ts).

## Scope

This uses Convex for persistence.
Guest users are keyed by a locally stored guest chat ID, and signed-in users use their Civic user ID.

## Verification

- Set `NEXT_PUBLIC_CONVEX_URL` in your environment.
- Run `npx convex dev` to push the schema and functions.
- Send a chat message.
- Refresh the page.
- Confirm the previous chat responses and inline control state are still visible.
