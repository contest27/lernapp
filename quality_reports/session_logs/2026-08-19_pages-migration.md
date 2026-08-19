# Session-Log — Hosting-Migration auf Cloudflare Pages (Durchführung)

**Datum:** 2026-08-19 · **Grundlage:** Handoff `../handoffs/2026-08-16_hosting-neu-als-pages.md`
**Ergebnis:** Pages-Projekt live und verifiziert: <https://lernapp-e3h.pages.dev>

## Ablauf

1. **Sebastian:** altes Worker-Projekt `lernapp` im Dashboard gelöscht.
2. **Repo (`dfb0ae2`):** `functions/api/{chat,stt}.js` byte-identisch aus
   `3626485` zurückgeholt (leerer `git diff --cached` gegen den Quell-Commit
   als Beleg); `wrangler.jsonc` + `worker/index.js` gelöscht, damit der
   Git-Build nie wieder als Worker-Deploy gelesen werden kann. Bewusst
   **vor** dem Anlegen des Pages-Projekts gepusht.
3. **Dashboard-Hürde:** „Workers & Pages" zeigt bei leerer Projektliste
   keinen Create-Knopf mehr (Umbau 2025/26, Neuanlagen werden Richtung
   Workers gelenkt). Lösung: Deep-Link
   `https://dash.cloudflare.com/?to=/:account/pages/new/provider/github`.
4. **Namenskollision:** `lernapp` ist als pages.dev-Name global vergeben →
   Projekt heißt `lernapp-e3h`. Nebenbefund: eine unbelegte
   `*.pages.dev`-Subdomain antwortet mit HTTP 522 (kein 404).
5. **Secrets:** Sebastian trug `ANTHROPIC_API_KEY` + `GEMINI_API_KEY` ein;
   statt Knopfsuche für „Retry deployment" löste ein leerer Commit
   (`a1a4476`) den Neubau aus, der die Secrets zog. Kein Versionsmodell,
   kein Promoten — der Pages-Wechsel hält, was das Handoff versprach.

## Verifikation (2026-08-19, gemessen per curl)

| Check | Ergebnis |
|---|---|
| `GET /` | HTTP 200, `<title>Lernapp</title>` |
| `POST /api/stt` mit `{}` | Googles `400 INVALID_ARGUMENT` („contents is not specified") → Proxy erreicht Gemini, Key wirkt |
| `POST /api/chat` (Say OK) | Anthropic-Message von `claude-haiku-4-5`: `"OK"` → Key wirkt |

## Abschlussarbeiten (`c2b8717` + Folge-Commit)

- `.github/workflows/pages.yml` entfernt — nur noch eine Installation bewegt
  sich; der alte GitHub-Pages-Build bleibt eingefroren erreichbar.
- README/CLAUDE.md auf die finale URL; dabei Doku-Drift korrigiert:
  B5 (Wordforge) stand noch als offen, ist laut Handoff §1 portiert.
  Offen sind 6B/6C, B4 (Y5-Module), Gemini-Sprachmodul.
- Kein `CACHE_VERSION`-Bump: `app/` wurde in keiner Änderung berührt.
- Handoff-Status aktualisiert; Cloudflare-Lektion nach `~/.claude/MEMORY.md`
  (`[LEARN:cloudflare]`).

## Nachtrag (gleiche Session) — Access-Regel gesetzt

Über die Chrome-Sitzung im Zero-Trust-Dashboard („Cloudflare One"): neue
Self-hosted-Anwendung `lernapp-e3h.pages.dev` — nackte Produktions-Domain
ohne Wildcard, bestehende Policy **„Email Access"** (3 Adressen,
unverändert), Session Duration **1 Monat**; exakt das Muster der
Facharzttrainer-App. Der „Access policy"-Schalter in den Pages-Settings
schützt nur Preview-URLs (Dashboard-Text: „Production pages.dev and custom
domains are managed separately in Zero Trust"); die auto-angelegte
Preview-App (`*.lernapp-e3h.pages.dev`) blieb unangetastet.
**Messung danach:** `/`, `/api/chat`, `/api/stt` antworten
unauthentifiziert mit 302 auf `floral-sun-d275.cloudflareaccess.com` —
der offene Proxy ist zu.

**Watch-Item für den iPad-Umzug:** die PWA cached die Shell per Service
Worker; nach Ablauf der Access-Session scheitern API-Calls still (Redirect
auf Login-HTML → `endpoint.js` fällt vermutlich auf den Gerätekey-Pfad
zurück). Erste Anmeldung auf dem iPad in Safari VOR dem Installieren
durchlaufen; auf dem Gerät beobachten, ob die Monats-Session im
Standalone-Modus sauber erneuert wird — sonst §4-Punkt: 302-Erkennung +
Re-Login-Hinweis in `endpoint.js`.

## Offen (Stand Session-Ende)

1. **iPad-Umzug (§3.1.5):** erst Backup im Parent corner der alten
   Installation exportieren, dann neue URL installieren und einspielen —
   die Installationen haben getrennten Fortschritt. Access-PIN-Flow in
   Safari vor dem Home-Screen-Install (siehe Watch-Item).
2. §4-Arbeit: Gemini-Sprachmodul, Bücher 6B/6C, Y5-Themenmodule (B4).
3. §5-Entscheidung: Hub-Streak vs. Wordforge-Regel „kein Streak sichtbar".
4. Später, wenn nur noch Pages läuft: `directPost`/`apiKey`-Pfad aus
   `app/js/qa/endpoint.js` + Schlüsselfeld im Parent corner ausbauen
   (Kommentar in der Datei).
