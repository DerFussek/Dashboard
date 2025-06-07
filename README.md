# Dashboard

Dieses Repository enthaelt den Quellcode fuer ein lokales Dashboard.

## Projektstruktur

- **src/** – Enthält den Node.js‑Server (`server.js`).
- **public/** – Statische Dateien wie HTML, Bilder und Fonts.
- **data/** – Persistente Daten (JSON/CSV).
- **logs/** – Enthält erzeugte Fehlerlogs.

Der Server kann mit `npm start` gestartet werden und stellt die Dateien aus dem
Ordner `public` bereit.

## Installation

1. Abhaengigkeiten installieren:
   ```bash
   npm install
   ```
2. Server starten:
   ```bash
   npm start
   ```
   Der Server laeuft standardmaessig auf Port `3000`. Ueber die Umgebungsvariablen
   `PORT` und `API_URL` koennen Port und API‑Ziel angepasst werden.

## Tests

Automatisierte Tests werden mit [Jest](https://jestjs.io/) ausgefuehrt:

```bash
npm test
```

## Docker

Statt einer lokalen Node.js‑Installation kann das Dashboard auch in einem
Docker‑Container betrieben werden.

1. Image bauen:
   ```bash
   docker build -t dashboard .
   ```
2. Container starten:
   ```bash
   docker run -p 3000:3000 dashboard
   ```

Damit wird der Server innerhalb des Containers gestartet und ist anschliessend
unter <http://localhost:3000> erreichbar.
