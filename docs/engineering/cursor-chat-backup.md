# Cursor chat backup

Automatic backup of Cursor Composer chats and agent transcripts into this repository so history survives reinstalling Cursor or Windows.

## Prerequisites

1. **Cursor Chat Transfer** extension (`ibrahim317.cursor-chat-transfer`) — recommended via `.vscode/extensions.json`.
2. **sqlite3 CLI** — required for export while Cursor is running.
   - Windows: `scoop install sqlite` or `choco install sqlite`, or place `sqlite3.exe` at `C:\sqlite3\sqlite3.exe`.
   - macOS/Linux: usually pre-installed or via package manager.
3. **Git hooks** (once per clone):

```powershell
npm run chat:hooks:install
```

## What gets backed up

On every **commit** and **push**, `scripts/export-cursor-chats.mjs` writes to `.cursor/chat-backups/`:

- `latest.cursor-chat.json` — full Composer export (`.cursor-chat.json` format used by Cursor Chat Transfer)
- Dated snapshots (`YYYY-MM-DDTHH-mm-ss.cursor-chat.json`, last 10 retained)
- `agent-transcripts/` — JSONL copies from `%USERPROFILE%\.cursor\projects\<slug>\agent-transcripts\`
- `manifest.json` — export timestamp and counts

Hooks stage backups on pre-commit (included in your code commit). Pre-push re-exports and auto-commits if chats changed since the last commit.

## Manual export

```powershell
npm run chat:export
```

If sqlite3 or Cursor databases are missing (e.g. CI or a machine without Cursor), the script exits successfully with a warning so commits are not blocked.

## Restore after reinstall

1. Clone or pull octopus.
2. Install Cursor, the extension, and sqlite3.
3. Open the project in Cursor.
4. Command Palette → **Cursor Chat Transfer: Import Chats** → `.cursor/chat-backups/latest.cursor-chat.json`.
5. **Fully quit and reopen Cursor** (not just reload window).

Agent transcripts are readable under `.cursor/chat-backups/agent-transcripts/` without import.

## Privacy

Chat backups may contain API keys, credentials, internal paths, and conversation content. They are committed to this repo by design. Do not share repository access with untrusted parties. Avoid pasting secrets into chats when possible.

## Related

- [cursor-chat-transfer](https://github.com/ibrahim317/cursor-chat-transfer) (MIT) — export/import UI; vendored read logic in `scripts/cursor-chat-transfer-lib/`
- [AI-assisted development](./ai-assisted-development.md)
