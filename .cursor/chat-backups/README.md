# Cursor chat backups

This directory is updated automatically on commit and push (see `docs/engineering/cursor-chat-backup.md`).

| File / folder | Purpose |
| ------------- | ------- |
| `latest.cursor-chat.json` | Full Composer export for **Cursor Chat Transfer → Import Chats** |
| `*.cursor-chat.json` | Timestamped snapshots (last 10 kept) |
| `agent-transcripts/` | Copy of Cursor agent session JSONL files |
| `manifest.json` | Export metadata (counts, timestamp, repo path) |

## Restore after reinstall

1. Clone or pull this repo.
2. Install [Cursor Chat Transfer](https://github.com/ibrahim317/cursor-chat-transfer) and `sqlite3` CLI.
3. Open this project in Cursor.
4. Command Palette → **Cursor Chat Transfer: Import Chats** → select `latest.cursor-chat.json`.
5. **Quit Cursor completely** and reopen (reload window is not enough).

Agent transcripts can be read directly from `agent-transcripts/` without import.

**Privacy:** backups may contain secrets, tokens, and local file paths. Treat repository access accordingly.
