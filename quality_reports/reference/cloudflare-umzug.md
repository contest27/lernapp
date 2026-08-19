# Umzug auf Cloudflare — Stand und was noch von Hand passieren muss

**Stand:** 2026-08-16, nach dem Blick ins Dashboard.

## Warum überhaupt

GitHub Pages ist rein statisch: jeder Schlüssel muss auf dem Gerät liegen und
von Hand eingetippt werden. Cloudflare kann Code ausführen — der Schlüssel liegt
dann als Secret auf dem Server, und auf dem iPad ist nichts mehr einzugeben,
weder Anthropic noch Gemini. Für eine Kinder-App auf einem Familien-iPad ist das
der eigentliche Gewinn; die Spracherkennung braucht es ohnehin.

## Was das Projekt tatsächlich ist (wichtig)

Im Dashboard angelegt wurde **kein Pages-Projekt**, sondern ein **Worker mit
statischen Assets** (`/workers/services/view/lernapp/production`, Deploy-Kommando
`npx wrangler deploy`). Zwei Konsequenzen, beide im Dashboard sichtbar:

1. *„Variables cannot be added to a Worker that only has static assets."* —
   solange der Worker kein echtes Skript hat, lassen sich **gar keine Secrets**
   hinterlegen.
2. Das `functions/`-Verzeichnis ist eine reine **Pages**-Konvention und wird von
   einem Assets-Worker ignoriert. Es wurde deshalb entfernt.

Live läuft die App auf **https://lernapp.pfeil.workers.dev**.

## Was im Repo jetzt liegt

```
wrangler.jsonc     name/main/assets; run_worker_first: ["/api/*"]
worker/index.js    /api/chat (Anthropic) + /api/stt (Gemini), sonst ASSETS
app/js/qa/endpoint.js  entscheidet zur Laufzeit: Proxy oder Geräteschlüssel
```

`run_worker_first` ist die Stelle, an der so ein Umbau still scheitert: Assets
werden normalerweise **vor** dem Skript ausgeliefert, `/api/chat` liefe also ins
Asset-404 (oder bei SPA-Handling in die index.html) und der Proxy käme nie zum
Zug. Die Zeile zwingt genau diese Pfade durch den Worker.

`endpoint.js` probiert `./api/chat`; antwortet dort JSON oder ein SSE-Stream,
gewinnt der Proxy und der Geräteschlüssel wird nie angefasst. Bei 404/405/HTML
fällt es auf den Browser-Direktaufruf zurück. **Derselbe Build läuft dadurch auf
GitHub Pages und auf Cloudflare** — es gibt kein Zeitloch, in dem der Tutor tot ist.

## Was noch von Hand passieren muss

1. **Git-Verbindung reparieren.** Settings → Build: *„This project is
   disconnected from your Git account."* Auf **Manage** klicken und die
   Cloudflare-GitHub-App neu autorisieren, sonst deployt kein Push.
2. **Neu deployen**, damit `wrangler.jsonc` und `worker/index.js` greifen.
   Danach ist der Worker kein „only static assets" mehr.
3. **Secrets setzen** (Settings → Variables and secrets — das Feld ist erst nach
   Schritt 2 aktiv). `ANTHROPIC_API_KEY`, und für die Spracherkennung
   `GEMINI_API_KEY`. Als **Secret** (verschlüsselt), nicht als Plaintext-Variable.
   *Die Schlüssel trägt Sebastian selbst ein.*
4. **Zugriffsschutz** (Tab Access). Ohne den ist `/api/chat` ein offener Proxy
   auf deine Rechnung, sobald jemand die workers.dev-URL kennt. Cloudflare Access
   über die ganze Domain ist die sichere Variante — Preis: ein einmaliger Login
   pro Gerät, für ein Kind eine Hürde. Alternative: vorerst bei GitHub Pages
   bleiben und den Geräteschlüssel behalten; der Code kann beides.
5. **Neu aufs iPad installieren** (neue URL). Vorher im Parent corner ein Backup
   exportieren und drüben einspielen, sonst startet der Fortschritt bei null.

## Danach im Repo nachziehen

- Schlüsselfeld im Parent corner entfernen.
- In `app/js/qa/endpoint.js` `directPost`, die `apiKey`-Argumente und die
  Fallback-Logik löschen (steht auch als Kommentar in der Datei).
- `.github/workflows/pages.yml` abschalten, damit nicht zwei Installationen mit
  getrenntem Fortschritt nebeneinanderleben.
- README/CLAUDE.md auf die neue URL umstellen.

## Geprüft

- 78/78 Tests; `node --check` auf `worker/index.js`, JSON-Parse auf `wrangler.jsonc`.
- Der Service Worker fasst **kein** Non-GET mehr an — er hätte sonst den POST an
  `/api/chat` abgefangen: die Cache-API weist POSTs zurück, und der Klon einer
  gestreamten Antwort hätte den Stream blockieren können. Ein Test hält fest,
  dass der Guard vor jedem `respondWith` steht.
