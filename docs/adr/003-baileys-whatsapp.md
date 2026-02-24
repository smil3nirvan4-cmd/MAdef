# ADR-003: Baileys (unofficial) WhatsApp integration via bridge

**Status:** Accepted
**Date:** 2024-12-01

## Context
The MAdef platform's core workflow involves communicating with caregivers and patients through WhatsApp -- sending assessments, proposals, contracts, and scheduling confirmations. The official WhatsApp Business API requires a Meta business verification process with significant lead times and per-message fees. For an early-stage home care platform operating in Brazil, this cost and bureaucratic overhead was prohibitive. An alternative was needed that could be deployed immediately with full message-type support (text, buttons, lists, documents).

## Decision
We adopted Baileys v7 (`baileys@^7.0.0-rc.9`), an unofficial open-source WhatsApp Web library, running as an external bridge process. The Next.js application communicates with the bridge over HTTP (`src/lib/whatsapp/client.ts` calls `POST /send` on the bridge URL). The bridge configuration is resolved through `src/lib/whatsapp/bridge-config.ts`, which reads the bridge URL, host, and port from environment variables or a `.wa-bridge-port` file. Interactive message types (buttons, lists, template buttons) are sent as formatted plain text fallbacks since Baileys cannot reliably deliver WhatsApp's native interactive components.

## Consequences
**Positive:**
- Zero per-message cost and no Meta business verification required, enabling immediate deployment
- The bridge architecture decouples WhatsApp connection state from the Next.js process, so web server restarts do not disconnect the WhatsApp session
- Port-file discovery (`WA_BRIDGE_PORT_FILE`) allows the dev script to dynamically assign ports, avoiding conflicts

**Negative:**
- Baileys is unofficial and could break with any WhatsApp protocol update, creating an ongoing maintenance risk
- No guaranteed message delivery SLA; the platform must implement its own retry and outbox mechanisms (see ADR-007)
- Interactive UI elements (buttons, lists) are degraded to plain text, resulting in a less polished user experience
- Risk of account bans from WhatsApp for using unofficial API access, especially at scale
