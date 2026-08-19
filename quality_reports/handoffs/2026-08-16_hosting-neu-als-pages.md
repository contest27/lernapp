# Handoff — Hosting neu aufsetzen, diesmal als Cloudflare **Pages**

**Erstellt:** 2026-08-16, Ende einer langen Session ·
**Status:** Hosting umgesetzt 2026-08-19 — Pages-Projekt live als
<https://lernapp-e3h.pages.dev>, beide Proxys verifiziert
(Log: `../session_logs/2026-08-19_pages-migration.md`).
Access-Regel gesetzt 2026-08-19 (Zero-Trust-App auf der Produktions-Domain,
Policy „Email Access", Session 1 Monat; unauthentifiziert = 302 auf Login).
Offen: iPad-Umzug (§3.1 Schritt 5), §4, §5.
**Entscheidung:** Das Cloudflare-Hosting wird verworfen und sauber als
**Pages-Projekt** neu angelegt. Alles andere an der App ist fertig und grün.

---

## 1. Wo die App steht (alles erledigt, nichts offen)

Repo `contest27/lernapp`, Branch `main`, **78/78 Tests**.

| Bereich | Stand |
|---|---|
| Schale | Hub, ein Streak, `shell/storage.js` mit Namensräumen, `rhythm.js` (Tagesrhythmus + Taktung) |
| Mathe Y6 | Buch 6A komplett: 13 Themen, Diagnostik, Lektionen, Übung, Review, Karte |
| Englisch | Wordforge portiert (`app/js/english/`), 12 Kapitel, dunkles Theme skopiert auf `.en` |
| Parent corner | Fortschritt, Sessions, Vokabelliste, Tutor-Key, Taktung, Backups, Y5-Import |
| Sprachhilfe | Wort antippen → Deutsch; Glossar 96 % offline |

**Live (beide funktionieren):**
- <https://lernapp.pfeil.workers.dev> — Cloudflare Worker (die Konstruktion, die ersetzt wird)
- <https://contest27.github.io/lernapp/> — GitHub Pages, Übergangsbau

---

## 2. Was schiefging — und warum „als Pages" die Konsequenz ist

Das Cloudflare-Projekt wurde im Dashboard als **Worker mit statischen Assets**
angelegt, nicht als Pages-Projekt. Daraus folgte eine Kette von Reibungen:

1. Ein Worker mit *nur* Assets kann **gar keine Secrets** halten — das Feld ist
   gesperrt. Er braucht erst ein echtes Skript (`main`).
2. Das `functions/`-Verzeichnis ist eine **Pages**-Konvention und wurde
   ignoriert. Beide Proxys mussten nach `worker/index.js` umziehen.
3. Assets werden **vor** dem Skript ausgeliefert → ohne
   `assets.run_worker_first: ["/api/*"]` läuft `/api/chat` ins Asset-404.
4. **Der eigentliche Zeitfresser:** Workers arbeitet mit *Versionen*. Jede
   Änderung an den Secrets legt nur eine neue Version an; wirksam wird sie erst
   über **… → Promote version**. Das war dreimal hintereinander die Ursache für
   „Secret gesetzt, Worker sieht es trotzdem nicht".
5. Zuletzt: ein Git-Build (`npx wrangler deploy`) setzte die Bindings neu, und
   der frisch angelegte `ANTHROPIC_API_KEY` war danach **komplett weg**.
   Gemessen am Ende über einen temporären `/api/_env`-Endpunkt (nur Namen und
   Wertlängen, nie Werte — inzwischen wieder entfernt):

   ```json
   {"GEMINI_API_KEY": "string(len 53)", "ASSETS": "object"}
   ```

   Kein Anthropic-Binding, unter keiner Schreibweise.

**Lehre:** Pages hat dieses Versionsmodell nicht. Dort gilt: Secret eintragen →
nächster Deploy zieht es → fertig. Kein Promoten, kein Überschreiben durch den
Build. Für diesen Anwendungsfall (statische App + zwei Proxy-Funktionen) ist
Pages die einfachere und robustere Form.

**Nebenbei zwei eigene Fehlgriffe, die Zeit gekostet haben:** ich habe zweimal
aus Screenshots einen Tippfehler im Secret-Namen „diagnostiziert" (einmal ein
fehlendes O, einmal ein doppeltes P). Der zweite stimmte, der erste nicht —
und die eigentliche Ursache war keins von beidem. Erst die Messung über
`/api/_env` brachte die Wahrheit. **Nächstes Mal sofort messen statt Pixel
lesen.**

---

## 3. Der Plan für die neue Session

### 3.1 Cloudflare aufräumen und als Pages neu anlegen

1. Im Dashboard das Worker-Projekt **`lernapp` löschen**
   (Workers & Pages → lernapp → Settings → Danger zone).
2. **Workers & Pages → Create → Pages → Connect to Git** → `contest27/lernapp`.
   - Framework preset: **None**
   - Build command: **leer**
   - Build output directory: **`app`**
   - Root directory: **`/`**
3. **Settings → Environment variables → Production**, beide als **Secret**
   (verschlüsselt): `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`.
   *Die Schlüssel trägt Sebastian ein; Claude fasst keine API-Keys an.*
4. **Access-Regel** über die Pages-Domain. Ohne sie ist `/api/chat` ein offener
   Proxy auf Sebastians Rechnung, sobald jemand die URL kennt. Das ist der
   Punkt, an dem der Server-Schlüssel schlechter sein kann als der Gerätekey —
   nicht überspringen.
5. Erst danach die neue URL aufs iPad. **Vorher im Parent corner ein Backup
   exportieren** und drüben einspielen — die Installationen haben getrennten
   Fortschritt.

### 3.2 Im Repo umstellen (klein, alles vorhanden)

- `functions/api/chat.js` und `functions/api/stt.js` **aus der Historie
  zurückholen** — sie waren fertig und getestet:
  ```bash
  git show 3626485:functions/api/chat.js > functions/api/chat.js
  git show 3626485:functions/api/stt.js  > functions/api/stt.js
  ```
- `wrangler.jsonc` und `worker/index.js` löschen.
- `.github/workflows/pages.yml` abschalten, sobald Cloudflare läuft — sonst
  leben zwei Installationen mit getrenntem Fortschritt nebeneinander.
- README/CLAUDE.md auf die neue URL.
- **Nicht anfassen:** `app/js/qa/endpoint.js`. Es probiert `./api/chat` und
  fällt bei 404/405/HTML auf den Geräteschlüssel zurück — funktioniert auf
  Pages, Worker und GitHub Pages gleichermaßen. Erst wenn nur noch Pages läuft:
  `directPost`, die `apiKey`-Argumente und das Schlüsselfeld im Parent corner
  entfernen (steht als Kommentar in der Datei).

### 3.3 Verifikation (so sieht Erfolg aus)

```bash
curl -s -X POST -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5","max_tokens":16,"messages":[{"role":"user","content":"Say OK"}]}' \
  https://<neue-url>/api/chat
```
Erfolg = eine Antwort **von Anthropic**. Kommt
`{"error":{"message":"The tutor is not set up…"}}`, fehlt das Secret noch —
das ist die eigene Meldung des Proxys, nicht Anthropics.

Für Gemini genügt `-d '{}'` gegen `/api/stt`: Googles `400 INVALID_ARGUMENT`
beweist, dass der Proxy durchkommt. **Das funktioniert schon heute.**

---

## 4. Danach — die eigentliche Arbeit

1. **Gemini-Sprachmodul** (Sebastians Wunsch): `app/js/ui/stt.js` aus dem
   Facharzttrainer portieren (Mikro-Aufnahme → WAV 16 kHz mono → `/api/stt`)
   und Wordforges `webkitSpeechRecognition` ersetzen. Begründung: Gerätediktat
   korrigiert Aussprachefehler still weg — genau das, was man hören will.
   Quelle: `Projects/Facharzttrainer/app/js/ui/stt.js` (319 Zeilen).
2. **Bücher 6B/6C** (~18 Themen) — delegierbar wie 6A, Muster im Session-Log.
3. **Y5-Themenmodule** (B4), damit die importierten Punktestände übbar werden.

---

## 5. Offene Design-Frage aus dieser Session

Wordforges Regel Nr. 1 lautet: *„Kein Streak wird ihm je gezeigt."* Der Hub
zeigt aber „🔥 N Lerntage in Folge" — und über diesen Bildschirm geht er ins
Englische. Aktuell gilt: **innerhalb** der Englisch-Screens nichts, Hub-Streak
bleibt. Sebastian wollte darüber noch entscheiden; wenn die Regel streng gelten
soll, wandert der Streak aus dem Hub in den Mathe-Bereich und den Parent corner.
