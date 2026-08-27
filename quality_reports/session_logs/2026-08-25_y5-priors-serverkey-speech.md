# Session-Log — Y5-Priors statt Einstufungstest, Serverkey im Client, Gemini-Sprachein­gabe

**Datum:** 2026-08-25 · **Plan:** `~/.claude/plans/piped-petting-pnueli.md`
**Auslöser:** zwei Beobachtungen von Sebastian aus dem iPad-Betrieb —
„Einstufungstest in Mathe ist Quatsch, da wird Y6-Material gefragt, und für Y5
haben wir die Daten reingeladen" · „Englisch: Spracheingabe bei den Testfragen
geht nicht — ist der API-Key überhaupt in der App?"

## Befund (vor der Änderung)

1. **Diagnostik lief ins Leere.** `planSession()` erzwingt den Check, solange
   `diagnosticDone` der **aktiven** Slice false ist (`engine/scheduler.js:114`).
   `importY5Backup` setzte das Flag nur auf der **y5**-Slice
   (`shell/storage.js:233`) — y6 wusste nichts davon. Drei der zwölf Items
   waren echtes Y6-Material: 7-stellige Stellenwerte, BIDMAS, Spiegelung in die
   negativen Quadranten. Die importierten Y5-Daten lagen ungenutzt (Parent
   corner: „waiting for the Year 5 lessons to arrive").
2. **Serverkey kam im Client nie an.** Beide Pages-Secrets sind gesetzt und
   waren am 2026-08-19 per curl verifiziert. Sechs Client-Stellen prüften aber
   `store.state.shell.apiKey` — den **Geräte**key, der auf Cloudflare
   definitionsgemäss leer ist. Folge: Testfragen wurden nie abgeschickt
   („Ask a grown-up to set the app up first.", `english/ui/talk.js:80`),
   dazu Schmiede, beide Glossare, Buddy und die Q&A-Box in der Lektion.
3. **Spracheingabe hing an Apples Diktat.** Nur `webkitSpeechRecognition`; beim
   ersten `not-allowed` setzte `talk.js:64` `speechEnabled` **dauerhaft** auf
   false — ein abgelehnter Berechtigungsdialog entfernte das Mikro für immer.
   `functions/api/stt.js` war deployt, hatte aber keinen Client.

## Entscheidungen

- **Y5-Mastery IST die Diagnostik** (Sebastians Wahl aus drei Optionen). Neue
  `maths/y5-bridge.js`: Y5-Topic → Y5-Strang → Y6-Strang, Mittel der
  **abgeschlossenen** Themen (nicht aller Mastery-Einträge: Y5 hat per
  `applyDiagnostic` jedem Thema einen Prior verpasst, der sonst als Evidenz
  zurückkäme), Prior = `clamp(50 + 0.6·(y5mean − 50), 30, 85)`.
  Schrumpfung 40 % gegen die Mitte, weil Y5-90 „solide Grundlage" heisst und
  nicht „Y6-Thema sitzt"; Deckel 85, damit nichts ungeübt als `secure` startet.
- **Idempotent per Evidenz-Guard**, nicht per Flag: jede Spur echter Arbeit auf
  y6 (`diagnosticDone || completed.length || attempts.length`) blockt das
  Seeding. Läuft deshalb bei **jedem** Start — nötig, weil der Import auf dem
  Gerät längst gelaufen war.
- **Unbekannte Topic-IDs ⇒ kein Seeding.** Ein Backup, dessen Themen wir nicht
  erkennen, hinterlässt sonst neutrale 50 und einen abgehakten Check — das wäre
  schlechter als der Check selbst.
- **Diagnostik bleibt, aber Y5-Niveau.** Sie greift nur noch ohne Import.
  Ersetzt: 7-stellig → 6-stellig (Y5 u02-pv1m), BIDMAS → Faktor (u05-factors),
  Spiegelung → Translation im ersten Quadranten (u15-position). Strang-Anzahl
  unverändert (3/4/3/2), damit der bestehende ≥2-pro-Strang-Test greift.
- **`./api/health` als neue Wahrheitsquelle** (nur Booleans, nie der Key).
  `aiReady(apiKey)` / `sttReady()` ersetzen die sechs Gerätekey-Prüfungen. Ein
  **noch offener** Probe-Stand gilt als verfügbar: die Antwort ist in
  Millisekunden da, und der gewünschte Fehlerfall ist eine ehrliche Meldung,
  nie ein stilles Abschalten. Nach der Antwort wird genau einmal neu gerendert
  (`app.js`, nur wenn noch der Startbildschirm steht).
- **`readHealth()` trennt drei Fälle**, weil beide Nein-Fälle HTML liefern:
  404+HTML = „kein Server" (GitHub Pages), 200/Redirect+HTML = „abgemeldet"
  (abgelaufene Cloudflare-Access-Session). Damit ist das Watch-Item aus dem
  Migrations-Log (§4) erledigt — der Parent corner sagt jetzt „in Safari neu
  anmelden" statt gar nichts.
- **Gemini-STT portiert** (`english/ui/stt.js`, aus Facharzttrainer
  `ui/stt.js` + dessen WAV-Writer). Prompt auf „wörtliches Transkript eines
  zehnjährigen EAL-Kindes, keine Korrektur von Grammatik/Aussprache".
  60 s statt 90 s Deckel. Reihenfolge im TALK: Gemini → Safari-Diktat →
  Tippen. Transkript wird **angehängt**, nicht ersetzt.
- **Kill-Switch entschärft:** ein Laufzeitfehler schaltet `speechEnabled` nicht
  mehr dauerhaft ab; der Parent-corner-Schalter ist der einzige permanente Weg.
- **Die Schmiede bleibt ohne Mikro** — Tippen ist dort Absicht (Rechtschreibung
  und Wortabruf sind die EAL-Schwäche).

## Verifikation

| Check | Ergebnis |
|---|---|
| `tests/tests.html` | **86 passed, 0 failed** (vorher 79; 7 neue Tests) |
| Frischer Store ohne Import | Warm-up check erscheint; alle 12 Items Y5-Niveau (Tagesseed geprüft) |
| Frischer Store + Y5-Import, Reload | `diagnosticDone=true`, Priors place 74 / fourops 43 / fractions 61 / position 68; Tageskarte = normale Lektion (`planSession` → `daily`, `u01-pv10m`) |
| Parent corner | Level-Tabelle zeigt die Priors; Y5-Abschnitt nennt „4 Strang(e) statt Warm-up check"; Serverzeile auf localhost korrekt „kein Server" |
| TALK, Server meldet beide Keys | Gemini-Mikro (Knopf mit `cleanup`) + Statuszeile |
| TALK, kein Server | Fallback auf Safari-Diktat, Mikro bleibt sichtbar |
| Buddy-FAB | auf localhost nach der Probe aus, mit Serverkey an |

Offen bis zum Deploy: `GET /api/health` gegen die Produktion und ein echter
gesprochener Durchgang auf dem iPad (lokal gibt es keine Pages Functions).

## Lektionen

- **`node --check` ist hier wertlos.** Es hat eine Datei mit einem eindeutigen
  Syntaxfehler (nicht escapetes `'` in einem String) mit Exit 0 durchgewinkt.
  Der verlässliche Check ist ein dynamischer `import()` jeder geänderten Datei
  im Browser — genau so wurde der Fehler gefunden.
- **`pathlib.write_text` trunkiert bei einem Encoding-Fehler.** Ein Lone
  Surrogate (`🎤`) im Ersetzungstext leerte `talk.js` vollständig;
  Rettung war `git checkout`. Seitdem: erst in `.tmp` schreiben, dann
  `os.replace` — und keine Nicht-ASCII-Literale in Patch-Skripten.

## Nachtrag (gleiche Session) — der Guard war falsch herum

Sebastian meldete: „es startet immer noch der check up". Beim Nachsehen zwei
Lücken in `seedY6FromY5`, beide aus demselben Denkfehler:

1. **`diagnosticDone` als Guard sperrte genau die Geräte aus, um die es geht.**
   Wer den alten Check schon einmal gesessen hatte, bekam die Y5-Priors nie —
   obwohl dieser Check das ist, was wir für wertlos erklärt haben. Der Guard
   ist jetzt ein einmaliges Migrationsflag `y5Seeded` (neu in
   `curriculumState()`, per `hydrate()` nachgezogen) plus die eigentliche
   Evidenz: ein abgeschlossenes Thema oder eine beantwortete Frage. Ein
   Diagnostik-Item zählt nicht dazu — `recordResult` füllt dafür nur
   `session.diag`, nie `state.attempts` (`ui/session.js:352`).
2. **Eine angefangene Diagnostik-Session überlebte das Seeding.** `activeSession`
   vom selben Tag lässt die Tageskarte „Session in progress → Continue" zeigen
   und führt zurück in die gerade abgeschaffte Fragerunde. Wird jetzt verworfen,
   aber nur wenn `kind === 'diagnostic'`.

Verifiziert mit genau seinem Zustand (Y5-Slice + `diagnosticDone: true` +
halbfertige Diagnostik von heute): nach dem Laden `y5Seeded: true`,
`activeSession: null`, Tageskarte „Today's topic · Place value within
10,000,000". Tests 87 passed / 0 failed. `CACHE_VERSION` → `lernapp-v12`.

**Nicht prüfbar von hier:** ob der Pages-Build durch ist. Produktion und
Branch-Alias antworten mit 302 auf den Access-Login, die GitHub-Deployments-API
kennt nur die alten github-pages-Einträge (Workflow am 19.08. entfernt), und ein
Cloudflare-Token liegt bewusst nicht im Repo. Prüfmarke für den angemeldeten
Browser: `/api/health` existiert erst seit `431ae83` — ein 404 dort heisst
„Build noch nicht da".

## Nachtrag 2 — zwei Inhaltsfehler vom Gerät gemeldet

**1. Mehrdeutige Stellenwert-Frage.** „Zahlen kann man nicht lesen … welchen
Wert hat die Ziffer fünf, aber die Fünf taucht zwei- oder dreimal auf."
Reproduziert beim ersten Versuch: *What is the value of the digit 5 in
556,539?* — drei Fünfer, drei Antworten. Der Generator wählte eine POSITION und
benannte dann die Ziffer, die dort zufällig stand. Betroffen waren
`content/diagnostic.js` **und** das Y6-Thema `u01-pv10m` selbst.
Neu: `unambiguousDigitPositions()` in `gen.js` — eine Ziffer darf nur beim
Namen genannt werden, wenn sie genau einmal vorkommt (Nullen fällt derselbe
Filter mit weg, der vorher als `digit === 0`-Retry dastand). Test sweept ALLE
Generatoren, nicht nur die zwei betroffenen.

**2. Unlesbarer Zahlenstrahl.** Der eigentliche „Zahlen kann man nicht lesen"-
Fall, und messbar: `numberLine(3000000, 4000000, {step: 100000})` erzeugte elf
Beschriftungen à 46 px auf 28,8 px Raster — **17 px Überlappung pro Label**
(im Browser mit `getComputedTextLength` nachgemessen). Steckt in der Erklärung
des allerersten Y6-Themas. `vis.js` dünnt die Labels jetzt aus statt sie zu
kürzen (die Lektion handelt vom LESEN grosser Zahlen, „3.6M" würde genau das
umgehen), und der Schritt wird auf einen Teiler der Strahllänge gerundet, damit
beide Enden beschriftet bleiben: 3,000,000 | 3,500,000 | 4,000,000. Alle Ticks
bleiben stehen. `vis.js` ist ein Sync-File — DIVERGED-Notiz im Kopf, wie in
`scheduler.js` (Y5 ist eingefroren, es gibt kein Upstream mehr).

Neuer Test misst die Labels aller sechs im Content real gebauten Zahlenstrahlen
im DOM und verlangt Überlappungsfreiheit. Tests 89 passed / 0 failed,
`CACHE_VERSION` → `lernapp-v13`.

## Nachtrag 3 — eine Sitzung, elf Fragen

Sebastian: „erst eine ganz kurze Übung, dann eine Wiederholungseinheit — und
jedes Mal Diskussion, ob wir die Wiederholung noch machen. Besser eine mit so
um die elf Fragen, wie's vorher war."

**Was dahinterstand** (nachgerechnet, nicht geschätzt): die Teile waren einzeln
dimensioniert, nicht die Sitzung.

| Tag | vorher | jetzt |
|---|---|---|
| Neues Thema, Wiederholung fällig | 7 + 4 = 11 | 7 + 4 = 11 |
| Neues Thema, nichts fällig (**Tag 1 des Jahres**) | 7 + 0 = **7** | 11 + 0 = 11 |
| Reiner Wiederholungstag | 10 | 11 |
| Kein neues Thema erlaubt UND nichts abgeschlossen | **0 (!)** | 11 |

Die letzte Zeile war ein echtes Loch: am Jahresanfang öffnete „Start" an einem
Englisch-Tag eine Session ohne eine einzige Frage. Der bestehende Test hatte
genau das als Sollverhalten festgeschrieben (`kind === 'review'`,
`newTopic === null`) — er ist jetzt auf den neuen Vertrag umgeschrieben.

**Änderungen:**
- `SESSION_ITEMS = 11` ist die Konstante; `REVIEW_ITEMS_DAILY` leitet sich
  daraus ab (11 − 7), `REVIEW_ITEMS_ONLY` ist 11.
- `NEW_TOPIC_TIERS_SOLO` (11 Stufen, gleiche leicht→schwer-Form): die Rampe für
  ein neues Thema, hinter dem keine Wiederholung kommt. Welche Rampe gilt,
  entscheidet `planSession` (`plan.tiers`) — nur der Plan weiss, ob noch etwas
  folgt; `buildSession` liest es nur noch ab.
- Rettungsregel: ist nichts fällig, nichts abgeschlossen und kein neues Thema
  erlaubt, wird das nächste Thema trotzdem begonnen. Greift nur vor dem ersten
  abgeschlossenen Thema.
- **Die Naht ist weg.** Die Kopfzeile wechselte mitten in der Sitzung von
  „Practise" auf „Quick review" — genau der Strich, an dem das Kind „das war
  die Lektion, der Rest ist extra" liest und die Verhandlung anfängt. Jetzt ein
  Titel für die ganze Sitzung; der Zähler lief ohnehin durch (1/11 … 8/11), und
  das 🔁-Etikett am einzelnen Item bleibt — das ist Information, keine Grenze.

Verifiziert: 12 simulierte Tage ergeben durchgehend 11, und im UI steht bei
Item 8/11 weiter „Practise" mit „🔁 Numbers to 10 million" am Item.
Tests 90 passed / 0 failed, `CACHE_VERSION` → `lernapp-v14`.

## Nachtrag 4 (2026-08-27) — warum ein deployter Fix das Gerät nicht erreichte

Sebastian: „die beiden Fehler hatten wir heute wieder, trotz 2× Neustart."
Repo geprüft: Arbeitsverzeichnis sauber, `origin/main` enthält alle drei Fixes
und `lernapp-v14`. `/api/health` meldet beide Keys — der Build lief also.

**Ursache:** `buildSession()` generiert alle Fragen im Voraus und legt sie
**fertig** ab — Text *und* das gerenderte SVG — in `slice.activeSession`, also
in localStorage. `startOrResume()` nimmt jede Sitzung desselben Tages wieder
auf. Eine morgens auf dem alten Stand gebaute Sitzung trägt ihre kaputten
Fragen deshalb durch jeden Deploy und jeden Neustart. Genau das war zu sehen.

Das ist die allgemeine Form des Problems: **ein Content-Fix erreicht keine
Sitzung, die schon existiert.** Gilt für jede künftige Korrektur an
Generatoren, Aufgabentexten oder Visualisierungen.

**Lösung:** `app/js/shell/build.js` exportiert `BUILD`; jede gebaute Sitzung
trägt den Stempel, und `app.js` verwirft beim Start jede Sitzung eines älteren
Builds (alle Curriculum-Slices). `isResumable()` in `session.js` macht die
Regel explizit und testbar. `BUILD` und `CACHE_VERSION` müssen identisch sein —
der SW-Test vergleicht sie jetzt gegeneinander statt gegen ein Literal, also
kann das Paar nicht mehr auseinanderlaufen.

Eine halbfertige Sitzung am Deploy-Tag zu verlieren ist der billigere Fehler:
ihre Fragen sind genau die, die wir gerade repariert haben.

Verifiziert mit einer nachgebauten Alt-Sitzung (ohne Stempel, mit beiden
Fehlern): nach dem Start `activeSession: null`, Karte „Today's topic", frische
11er-Sitzung mit `lernapp-v15`. Tests 91 passed / 0 failed.

## Ausserhalb dieser Änderung aufgefallen

- `ui/today.js` sagt an einem Englisch-Tag noch „The English lessons are still
  being built" — seit B5 falsch, und das Kind liest es. Einzeiler, bewusst
  nicht mitgenommen (Scope), Sebastian entscheidet.
- `CLAUDE.md` behauptet „This machine has no Node.js" — Node v24.18.0 liegt auf
  dem PATH. An der Stack-Entscheidung (kein Build-Schritt) ändert das nichts.
