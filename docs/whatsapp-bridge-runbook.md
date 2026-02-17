# WhatsApp Bridge Runbook

## Environment variables
- `WA_BRIDGE_PORT` (default: `4000`)
- `WA_BRIDGE_URL` (optional override, example: `http://127.0.0.1:4000`)
- `WA_BRIDGE_HOST` (default: `127.0.0.1`)
- `WA_SESSION_FILE` (default: `.wa-session.json`)
- `WA_WEBHOOK_URL` (default: `http://127.0.0.1:3000/api/whatsapp/webhook`)
- `WA_BROWSER_PROFILE` (`macos`, `ubuntu`, `windows`; default: `macos`)
- `WA_BROWSER_DEVICE` (default: `Desktop`)
- `WA_RECONNECT_MAX_ATTEMPTS` (default: `6`)
- `WA_RECONNECT_BASE_DELAY_MS` (default: `5000`)
- `WA_RECONNECT_MAX_DELAY_MS` (default: `20000`)
- `WA_RETRY_405_LIMIT` (default: `2`)
- `WA_LOG_LEVEL` (default: `error`)

## Start
```bash
npm run dev
```

## Status
```bash
curl -s http://127.0.0.1:4000/status
curl -s http://127.0.0.1:3000/api/whatsapp/status
```

Status fields:
- `status`: `DISCONNECTED | CONNECTING | QR_PENDING | PAIRING_CODE | CONNECTED`
- `connected`, `isConnecting`, `retryCount`, `lastStatusCode`, `lastError`
- `qrCode` (only when pending), `pairingCode` (only when pairing mode is active)

## Connect (QR flow)
```bash
curl -s -X POST http://127.0.0.1:3000/api/whatsapp/connect
```

Then open `/admin/whatsapp` and scan the QR code.

## Pairing code flow (headless)
```bash
curl -s -X POST http://127.0.0.1:3000/api/whatsapp/pair ^
  -H "Content-Type: application/json" ^
  -d "{\"phone\":\"5511999999999\"}"
```

Use the returned `pairingCode` in WhatsApp mobile:
- `Dispositivos conectados` -> `Conectar dispositivo com numero`

## Reset auth
```bash
curl -s -X POST http://127.0.0.1:4000/reset-auth
```

Use when session is invalid/expired or after repeated `405`/`401`.

## Troubleshooting
- Repeated `405`: run `POST /reset-auth`, then pair again.
- `401` / logged-out behavior: run `POST /reset-auth`, then pair again.
- Stale UI bundle:
  1. Stop dev server
  2. Delete `.next` and `node_modules/.cache`
  3. Start `npm run dev`
