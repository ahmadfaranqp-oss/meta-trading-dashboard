# Meta Trading-Dashboard

Mobilseite für das MT5-Demokonto (EUR). Statische Dateien, kein Build: GitHub Pages liefert den Branch `main` aus dem Wurzelverzeichnis aus.

Seiteninhalt auf Deutsch. Stand, Kurse und Ergebnisse kommen ausschließlich aus [`data.json`](data.json). `app.js` lädt die Datei beim Öffnen und danach alle 60 Sekunden neu:

```text
data.json?t=<Zeitstempel in Millisekunden>
```

`cache: "no-store"` ist zusätzlich gesetzt. Ein Query-Parameter reicht, damit Browser und CDN die vorherige Fassung nicht wiederverwenden.

## Dateien

| Datei | Rolle |
| --- | --- |
| `index.html` | Gerüst der Seite |
| `style.css` | Darstellung |
| `app.js` | Laden, Rechnen, Zeichnen |
| `data.json` | Einziger Datenbestand, wird ersetzt |
| `.nojekyll` | Pages soll die Dateien unverändert ausliefern |

Es gibt keinen Build-Schritt und keinen GitHub-Actions-Workflow. Pages: Repository-Einstellungen → Pages → Branch `main`, Ordner `/ (root)`.

## Was die Seite aus den Daten macht

- Gesamtgewinn im Kopf = `equity - startKonto`. Prozent = dieser Betrag / `startKonto`.
- Prozent eines Trades oder einer offenen Position = `ergebnisEur / kontoBeiEinstieg`.
- Tagesziel in EUR = `tagesstart * tageszielProzent / 100`. Die Leiste füllt sich mit `heuteErgebnis / Tagesziel`, höchstens bis 100 %.
- Tagesstopp in EUR = `tagesstart * tagesstoppProzent / 100`.
- Trefferquote = Anteil der Historie mit `ergebnisEur > 0`.
- Die Fußzeile übernimmt nur den Tagesstopp aus `tagesstoppProzent`. Die übrigen Regeln stehen fest im HTML: 2 % pro Trade, max. 3 Positionen, 4 % Gesamtrisiko, Schicht werktags 08–20 Uhr.
- Frische: `stand` jünger als 40 Minuten → grüner pulsierender Punkt, Beschriftung „aktuell“. Sonst grauer Punkt, „veraltet“. Darunter steht `Stand: <Zeit Europe/Berlin> · aktualisiert vor X Min`.
- Leere Listen (`offenePositionen`, `pendingOrders`, `historie`, `equityKurve`, `feed`) blenden ihren Abschnitt samt Überschrift aus.
- Aktivität zeigt die 8 neuesten Einträge aus `feed`, neueste zuerst.
- Geschlossene Trades stehen neueste zuerst. Die Equity-Kurve wird nach Zeit aufsteigend gezeichnet.

Zahlen in der Anzeige sind deutsch formatiert (`4.589,49 €`, `+1,36 %`). In `data.json` stehen normale JSON-Zahlen mit Punkt als Dezimalzeichen und ohne Tausendertrenner.

## Schema von data.json

Alle Beträge in EUR. Zeiten als ISO-8601 mit Offset, Anzeige immer in `Europe/Berlin`. Im Winter (ab dem 25.10.2026) ist Berlin `+01:00`, in der Sommerzeit `+02:00`. Unbekannte Zusatzfelder ignoriert die Seite.

### Kopf

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `stand` | String | Zeitpunkt dieses Schnappschusses. Pflicht, sonst gilt die Seite als veraltet. Beispiel: `2026-10-27T06:12:00+01:00`. |
| `startKonto` | Zahl | Kontostand zum Start der Auswertung. Basis des Gesamtgewinns. |
| `tagesstart` | Zahl | Kontostand zu Beginn des Handelstags. Basis von Tagesziel und Tagesstopp. |
| `balance` | Zahl | Balance, ohne offenes Ergebnis. |
| `equity` | Zahl | Equity, inklusive offenem Ergebnis. |
| `margin` | Zahl | Gebundene Margin. `0`, wenn nichts offen ist. |
| `tageszielProzent` | Zahl | Tagesziel in Prozent, aktuell `3`. |
| `tagesstoppProzent` | Zahl | Tagesstopp in Prozent, aktuell `5`. Die Fußzeile übernimmt diese Zahl. |
| `heuteErgebnis` | Zahl | Tagesergebnis in EUR, realisiert plus offen. Die Seite rechnet es nicht selbst. Ohne Ein- oder Auszahlung ist es `equity - tagesstart`. |

### `offenePositionen`

Liste. Jedes Objekt:

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `symbol` | String | z. B. `XAUUSD` |
| `richtung` | String | `long` oder `short` |
| `lot` | Zahl | Positionsgröße |
| `einstieg` | Zahl | Einstiegskurs |
| `sl` | Zahl | Stop-Loss |
| `tp` | Zahl | Take-Profit |
| `aktuell` | Zahl | letzter Kurs |
| `ergebnisEur` | Zahl | offenes Ergebnis in EUR |
| `kontoBeiEinstieg` | Zahl | Kontostand beim Einstieg, Nenner für das Prozent |
| `eroeffnet` | String | ISO-Zeit der Eröffnung |

### `pendingOrders`

Liste. Jedes Objekt:

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `symbol` | String | |
| `typ` | String | z. B. `Sell Limit`, `Buy Limit`, `Buy Stop`, `Sell Stop` |
| `lot` | Zahl | |
| `preis` | Zahl | Orderpreis |
| `sl` | Zahl | |
| `tp` | Zahl | |
| `risikoEur` | Zahl | Risiko in EUR, falls die Order auslöst |
| `gueltigBis` | String | ISO-Zeit, bis zu der die Order gilt |
| `ticket` | String | Ticketnummer als String, damit nichts gerundet wird |

### `historie`

Abgeschlossene Trades seit `startKonto`. Ältere Deals, die schon im Startstand stecken, gehören nicht hinein.

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `datum` | String | ISO-Zeit des Abschlusses |
| `symbol` | String | |
| `richtung` | String | `long` oder `short` |
| `lot` | Zahl | |
| `einstieg` | Zahl | |
| `ausstieg` | Zahl | |
| `ergebnisEur` | Zahl | realisiertes Ergebnis in EUR, inklusive Swap und Kommission |
| `kontoBeiEinstieg` | Zahl | Kontostand beim Einstieg |

### `equityKurve`

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `zeit` | String | ISO-Zeit der Ablesung |
| `equity` | Zahl | Equity zu dieser Zeit |

Zwischenstände aus dem Journal übernehmen, nichts glätten und nichts ergänzen. Zwei Punkte des Seeds sind im Journal nur gerundet angegeben und so gespeichert: 26.10. 16:50 Uhr `4555` (≈ 4.555) und 17:05 Uhr `4552` (≈ 4.552). Alle übrigen Punkte sind exakt.

### `feed`

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `zeit` | String | ISO-Zeit der Entscheidung |
| `text` | String | ein kurzer Satz auf Deutsch, nur belegte Fakten |

Die Seite zeigt die acht neuesten Sätze. Ältere dürfen in der Datei bleiben.

## Beispiel

Der laufende Seed liegt in `data.json`. Verkürzt:

```json
{
  "stand": "2026-10-27T06:12:00+01:00",
  "startKonto": 4528.13,
  "tagesstart": 4589.49,
  "balance": 4589.49,
  "equity": 4589.49,
  "margin": 0,
  "tageszielProzent": 3,
  "tagesstoppProzent": 5,
  "heuteErgebnis": 0,
  "offenePositionen": [],
  "pendingOrders": [
    {
      "symbol": "XAUUSD",
      "typ": "Sell Limit",
      "lot": 0.05,
      "preis": 4033,
      "sl": 4045,
      "tp": 4005,
      "risikoEur": 54,
      "gueltigBis": "2026-10-27T12:00:00+01:00",
      "ticket": "59058125381"
    }
  ],
  "historie": [
    {
      "datum": "2026-10-26T20:05:00+01:00",
      "symbol": "XAUUSD",
      "richtung": "short",
      "lot": 0.05,
      "einstieg": 4024,
      "ausstieg": 4010.28,
      "ergebnisEur": 61.36,
      "kontoBeiEinstieg": 4528.13
    }
  ],
  "equityKurve": [{ "zeit": "2026-10-27T06:12:00+01:00", "equity": 4589.49 }],
  "feed": [{ "zeit": "2026-10-27T06:12:00+01:00", "text": "Kein neuer Trade." }]
}
```

Leere Lage: `"offenePositionen": []`, nicht `null`.

## Datei alle 30 Minuten ersetzen

Die Contents-API von GitHub ersetzt `data.json` auf `main`. HTML, CSS und JS bleiben unverändert.

1. Aktuelle Datei lesen und `sha` merken:

```http
GET /repos/ahmadfaranqp-oss/meta-trading-dashboard/contents/data.json?ref=main
Accept: application/vnd.github+json
```

2. Komplettes JSON als UTF-8 schreiben, Base64 ohne Zeilenumbrüche und ohne `data:`-Vorspann. `content` ersetzt die ganze Datei.

```bash
CONTENT=$(base64 < data.json | tr -d '\n')
```

```http
PUT /repos/ahmadfaranqp-oss/meta-trading-dashboard/contents/data.json
Accept: application/vnd.github+json
```

```json
{
  "message": "Kontostand aktualisieren",
  "branch": "main",
  "sha": "<sha aus dem GET>",
  "content": "<CONTENT>"
}
```

Der Token braucht Schreibrecht auf Repository-Inhalte. `stand` bei jedem Schreiben auf die Zeit des Schnappschusses setzen, sonst springt der Punkt nach 40 Minuten auf „veraltet“, obwohl die Zahlen neu sind.

Plausibilität vor dem Schreiben:

- `equity` liegt nah an `balance` plus Summe der `ergebnisEur` offener Positionen.
- ohne Ein- oder Auszahlung heute: `heuteErgebnis = equity - tagesstart`.
- Prozent im Kopf: `(equity - startKonto) / startKonto`. Für den Seed: `(4589.49 - 4528.13) / 4528.13 = 1,36 %`, Betrag `+61,36 €`.
- Prozent des abgeschlossenen Trades: `61.36 / 4528.13 = 1,36 %`.
- Tagesziel: `4589.49 * 0,03 = 137,68 €`. Tagesstopp: `4589.49 * 0,05 = 229,47 €`.

## Seed, Stand 27.10.2026 06:12 Berlin

Aus dem Journal und der Orderliste, ohne ergänzte Kurse:

- Start 26.10.2026, 13:42: 4.528,13 €.
- Ein Abschluss: XAUUSD Short 0,05, Einstieg 4.024,00, Ausstieg 4.010,28 am 26.10. gegen 20:05, +61,36 €, Konto beim Einstieg 4.528,13 €.
- Schluss 26.10. und Tagesstart 27.10.: 4.589,49 €. Balance = Equity, Margin 0, heute 0 €.
- Keine offene Position.
- Wartend: XAUUSD Sell Limit 0,05 bei 4.033, SL 4.045, TP 4.005, Ticket 59058125381, gültig bis 27.10. 12:00 Berlin, Risiko 54 € (im Journal als ca. 54 € genannt).

## Hinweis

Demokonto. Die Seite ist keine Anlageberatung.
