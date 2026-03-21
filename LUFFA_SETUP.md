# Luffa + Anthropic Bridge Setup

This project now includes a polling bridge script that:

- polls `https://apibot.luffa.im/robot/receive` every second
- de-duplicates incoming messages by `msgId`
- sends user text to Anthropic
- replies through:
  - `https://apibot.luffa.im/robot/send` (1:1 chat)
  - `https://apibot.luffa.im/robot/sendGroup` (group chat)

## 1) Environment variables

Add these to your `.env` (or shell session):

```env
LUFFA_BOT_SECRET=your_luffa_robot_secret
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional:
ANTHROPIC_MODEL=claude-sonnet-4-20250514
LUFFA_POLL_INTERVAL_MS=1000
ANTHROPIC_MAX_TOKENS=700
LUFFA_SYSTEM_PROMPT=You are a helpful assistant inside the Luffa chat platform.
```

The bridge auto-loads `.env.local` first, then `.env`.
It also accepts `LUFFA_SECRET` as an alias for `LUFFA_BOT_SECRET`.

## 2) Run the bridge

```bash
npm run bot:luffa
```

## 3) Notes

- Keep the bridge process running continuously.
- Group replies are currently sent as normal text (`type: "1"`).
- Button/confirm message reply format can be added next if you want interactive actions.
