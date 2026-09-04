# Third-party notice

The files `db.js` and `transfer.js` in this directory are vendored from
[cursor-chat-transfer](https://github.com/ibrahim317/cursor-chat-transfer)
(MIT License, Copyright Ibrahim).

Only the export path (`buildExportObject` and sqlite read helpers) is used by
`scripts/export-cursor-chats.mjs`. Import/write helpers are included unchanged
for license compliance and potential future use.
