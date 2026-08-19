# Umzug auf Cloudflare Pages — was noch von Hand passieren muss

**Stand:** 2026-08-16. Der Code ist fertig und gepusht; auf dieser Maschine gibt
es weder `wrangler` noch Cloudflare-Credentials, deshalb bleiben die folgenden
Schritte im Dashboard.

## Warum der Umzug

GitHub Pages ist rein statisch. Damit muss jeder Schlüssel auf dem Gerät liegen
und von Hand eingetippt werden. Cloudflare Pages kann **Functions** ausführen:
der Schlüssel liegt dann als Secret auf dem Server, und auf dem iPad ist nichts
mehr einzugeben — weder Anthropic noch Gemini. Für eine Kinder-App auf einem
Familien-iPad ist das der eigentliche Gewinn; die Spracherkennung (Gemini)
braucht es ohnehin.

## Was im Repo schon liegt

```
functions/api/chat.js   Anthropic-Proxy   (Secret: ANTHROPIC_API_KEY)
functions/api/stt.js    Gemini-Transkription (Secret: GEMINI_API_KEY)
app/js/qa/endpoint.js   entscheidet zur Laufzeit: Proxy oder Gerät
```

`endpoint.js` probiert zuerst `./api/chat`. Antwortet dort JSON oder ein
SSE-Stream, gewinnt der Proxy und der Geräteschlüssel wird nie angefasst.
Kommt 404/405/HTML zurück (= statischer Host), fällt es auf den
Browser-Direktaufruf mit dem im Parent corner eingetragenen Schlüssel zurück.
**Derselbe Build läuft dadurch auf beiden Hosts** — der Umzug hat kein Zeitloch,
in dem der Tutor tot ist.

## Schritte im Cloudflare-Dashboard

1. **Workers & Pages → Create → Pages → Connect to Git** → Repo `contest27/lernapp`.
2. Build-Einstellungen:
   - Framework preset: **None**
   - Build command: **leer lassen** (kein Build-Schritt, bewusst)
   - Build output directory: **`app`**
   - Root directory: **`/`** (nicht ändern — `functions/` muss im Repo-Wurzelverzeichnis liegen, genau dort steht es)
3. **Settings → Environment variables → Production** (und Preview, falls du
   Preview-Deploys nutzt):
   - `ANTHROPIC_API_KEY` = der Schlüssel, **als Secret** (verschlüsselt), nicht als Plaintext-Variable
   - `GEMINI_API_KEY` = der Google-Schlüssel (für die Spracherkennung; kann später nachgereicht werden)
4. **Zugriffsschutz — bitte nicht überspringen.** Ohne Access ist `/api/chat`
   ein offener Proxy auf deine Rechnung: wer die URL kennt, kann darüber
   Anthropic-Anfragen stellen. Zwei Wege:
   - **Cloudflare Access** über die ganze Pages-Domain (wie beim
     Facharzttrainer). Kostet einen einmaligen Login pro Gerät — für ein Kind
     eine Hürde, aber die sicherste Variante.
   - Alternativ vorerst bei GitHub Pages bleiben und den Gerätschlüssel
     behalten. Der Code kann beides.
5. Nach dem ersten Deploy: die neue URL (`lernapp.pages.dev` oder deine eigene
   Domain) **neu auf dem iPad installieren**. Die alte GitHub-Pages-Installation
   behält ihren eigenen Speicher — vorher im Parent corner ein Backup
   exportieren und in der neuen Installation einspielen, sonst fängt der
   Fortschritt bei null an.

## Danach im Repo nachziehen

- Parent corner: das Schlüsselfeld kann weg, sobald nur noch Cloudflare läuft.
- `app/js/qa/endpoint.js`: `directPost`, die `apiKey`-Argumente und diese
  Fallback-Logik löschen — der Kommentar oben in der Datei sagt es auch.
- GitHub-Pages-Workflow (`.github/workflows/pages.yml`) entfernen oder
  deaktivieren, damit nicht zwei Installationen mit getrenntem Fortschritt
  nebeneinander leben.
- README/CLAUDE.md auf die neue URL umstellen.

## Was ich dabei geprüft habe

- 78/78 Tests, darunter drei neue für `endpoint.js` (404 wird nicht für eine
  Proxy-Antwort gehalten; ein echter Proxy braucht keinen Schlüssel; ohne
  beides schlägt es sichtbar fehl statt still).
- Der Service Worker fasst **kein** Non-GET mehr an. Er hätte sonst den POST an
  `/api/chat` abgefangen: die Cache-API weist POSTs zurück, und der Klon einer
  gestreamten Antwort hätte den Stream blockieren können. Ein Test hält den
  Guard fest.
