// Importiere benötigte Module
const express = require('express');
const request = require('request');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { CronJob } = require('cron');
const cors = require('cors');

// Initialisiere Express
const app = express();
app.use(express.json());
app.use(express.static(__dirname));
app.use(cors());

// Nutze asynchrone Dateisystem-Methoden
const fsPromises = fs.promises;

// Nutzung von Umgebungsvariablen für Flexibilität
const PORT = process.env.PORT || 3000;
const apiUrl = process.env.API_URL || 'http://192.168.178.47:8080/api/v1/status';

// --- Globale Fehlerbehandlung ---
// Listener für unhandled Rejections und uncaught Exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Globale Error-Handling-Middleware in Express
app.use((err, req, res, next) => {
  console.error("Globaler Fehler:", err.message);
  res.status(500).json({ error: "Interner Serverfehler" });
});

// --- Funktion zum Abruf von Batteriedaten ---
async function getBatteryData() {
  try {
    console.log("Anfrage für Batteriedaten"); // (z.B. Zeile 14: "Anfrage für Batteriedaten")
    const response = await axios.get(apiUrl);
    console.warn("Sende Daten");
    return response.data;
  } catch (error) {
    console.error("Fehler bei der Anfrage", error.message);
    throw new Error('Fehler bei der Anfrage der Batteriedaten: ' + error.message);
  }
}

getBatteryData().then(data => {
  console.log("Batteriedaten: ", data);
}).catch(error => {
  console.error(error.message);
});

// --- Funktion zum asynchronen Speichern der Daten in eine CSV-Datei ---
async function saveData(data) {
  let timestamp = new Date(data.Timestamp).toISOString();  // ISO-Format generieren
  let production = data.Production_W;
  let consumption = data.Consumption_W;
  let batteryData = data.Pac_total_W;
  let battery_charge = 0;
  let battery_discharge = 0;

  if (batteryData < 0) {
    battery_charge = batteryData;
  } else if (batteryData > 0) {
    battery_discharge = Math.abs(batteryData);
  }

  let gridData = data.GridFeedIn_W;
  let grid_feedin = 0;
  let grid_consumption = 0;

  if (gridData > 0) {
    grid_feedin = gridData;
  } else if (gridData < 0) {
    grid_consumption = Math.abs(gridData);
  }

  let battery_state_of_charge = data.USOC;
  let direct_consumption = Math.abs(data.Consumption_W);

  let dataforcsv = {
    timestamp: timestamp,
    production: production,
    consumption: consumption,
    battery_charge: battery_charge,
    battery_discharge: battery_discharge,
    grid_feedin: grid_feedin,
    grid_consumption: grid_consumption,
    battery_state_of_charge: battery_state_of_charge,
    direct_consumption: direct_consumption
  };

  // Falls die Daten kein Array sind, packe sie in ein Array
  if (!Array.isArray(dataforcsv)) {
    dataforcsv = [dataforcsv];
  }

  const csvFilePath = path.join(__dirname, 'daten', 'measurements.csv');

  try {
    // Wenn die Datei noch nicht existiert, Kopfzeile hinzufügen
    if (!fs.existsSync(csvFilePath)) {
      const header = 'timestamp,production,consumption,battery_charge,battery_discharge,grid_feedin,grid_consumption,battery_state_of_charge,direct_consumption\n';
      await fsPromises.writeFile(csvFilePath, header);
    }
    // Daten in die CSV-Datei anhängen
    for (const entry of dataforcsv) {
      if (!entry.timestamp) {
        console.error('Fehlender timestamp:', entry);
        continue; // Weiter, statt den Server anzuhalten
      }
      const row = `${entry.timestamp},${entry.production},${entry.consumption},${entry.battery_charge},${entry.battery_discharge},${entry.grid_feedin},${entry.grid_consumption},${entry.battery_state_of_charge},${entry.direct_consumption}\n`;
      await fsPromises.appendFile(csvFilePath, row);
    }
  } catch (err) {
    console.error("Fehler beim Schreiben der CSV-Datei:", err.message);
    throw err;
  }
}

/*
// --- CronJob zum regelmäßigen Abruf und Speichern der Batteriedaten ---
// Jede Minute wird der CronJob ausgeführt
const saveDataJob = new CronJob('* * * * *', async () => {
  try {
    console.log('Hole aktuelle Batteriedaten...');
    const batteryData = await getBatteryData();
    await saveData(batteryData);
    console.log('Daten erfolgreich gespeichert.');
  } catch (error) {
    console.error('Fehler beim Speichern der Daten:', error.message);
  }
});
saveDataJob.start();
*/

// --- Funktionen zum Einlesen der Jahresdaten (JSON) ---
async function getJahresdatemFromJSON() {
  const filePath = path.join(__dirname, 'daten', 'jahresdaten.json');
  try {
    await fsPromises.access(filePath);
    const jsonData = await fsPromises.readFile(filePath, 'utf-8');
    return JSON.parse(jsonData);
  } catch (err) {
    console.error("Fehler beim Einlesen der JSON-Datei:", err.message);
    return null;
  }
}

// Allgemeine Funktion, um Daten für ein Jahr abzurufen
async function getDataForYear(year) {
  const jahresdaten = await getJahresdatemFromJSON();
  if (jahresdaten && jahresdaten[year]) {
    return [
      jahresdaten[year].production,
      jahresdaten[year].consumption,
      jahresdaten[year].autarky
    ];
  }
  return null;
}

async function getData2022() {
  return await getDataForYear("2022");
}

async function getData2023() {
  return await getDataForYear("2023");
}

async function getData2024() {
  return await getDataForYear("2024");
}

async function getData2025() {
  return await getDataForYear("2025");
}

async function getTotaldata() {
  const jahresdaten = await getJahresdatemFromJSON();
  if (jahresdaten) {
    const data2022 = await getData2022();
    const data2023 = await getData2023();
    const data2024 = await getData2024();
    const data2025 = await getData2025();

    const totalProduction = data2022[0] + data2023[0] + data2024[0] + data2025[0];
    const totalConsumption = data2022[1] + data2023[1] + data2024[1] + data2025[1];
    const avgAutarky = (data2022[2] + data2023[2] + data2024[2] + data2025[2]) / 4;

    const totalData = {
      production: totalProduction,
      consumption: totalConsumption,
      autarky: avgAutarky
    };

    return totalData;
  } else {
    console.warn("Jahresdaten konnten nicht geladen werden.");
    return null;
  }
}

async function getTodaysData() {
  const csvFilePath = path.join(__dirname, 'daten', 'measurements.csv');
  try {
    if (!fs.existsSync(csvFilePath)) {
      console.warn(`Datei ${csvFilePath} existiert nicht. Erstelle eine neue Datei.`);
      const header = 'timestamp,production,consumption,battery_charge,battery_discharge,grid_feedin,grid_consumption,battery_state_of_charge,direct_consumption\n';
      await fsPromises.writeFile(csvFilePath, header);
    }
    const data = await fsPromises.readFile(csvFilePath, 'utf-8');
    const lines = data.split('\n');
    const rows = lines.slice(1).filter(line => line.trim() !== '').map(line => line.split(','));

    let totalProduction = 0;
    let totalConsumption = 0;
    let totalfeedin = 0;
    let totalfeedout = 0;

    rows.forEach(row => {
      const production = Number(row[1]);
      const consumption = Number(row[2]);
      const feedin = Number(row[5]);
      const feedout = Number(row[6]);

      if (!isNaN(production)) {
        totalProduction += production;
      }
      if (!isNaN(consumption)) {
        totalConsumption += consumption;
      }
      if (!isNaN(feedin)) {
        totalfeedin += feedin;
      }
      if (!isNaN(feedout)) {
        totalfeedout += feedout;
      }
    });

    let newtotalProduction = totalProduction / 1000;
    let newtotalConsumption = totalConsumption / 1000;
    let newTotalfeedin = (totalProduction / 60) / 1000;
    let newTotalfeedout = totalConsumption / 60;
    let autarkie = (newtotalConsumption - newTotalfeedout) / newtotalConsumption;

    return [newtotalProduction, newtotalConsumption, autarkie];
  } catch (error) {
    console.error("Fehler beim Laden der CSV-Datei", error.message);
    throw new Error('Fehler beim Laden der CSV-Datei: ' + error.message);
  }
}

// --- Initialisierung der Daten beim Start des Servers ---
async function initializeData() {
  try {
    const totalDataCache = await getTotaldata();
    console.log("Data2022:", await getData2022());
    console.log("Data2023:", await getData2023());
    console.log("Data2024:", await getData2024());
    console.log("GesamtData:", totalDataCache);
  } catch (error) {
    console.error('Fehler bei der Initialisierung der Daten:', error.message);
  }
}
initializeData();

// ============================================
//             Proxy - Aufgaben
// ============================================
app.get('/getBatteryData', async (req, res, next) => {
  try {
    request(apiUrl, (error, response, body) => {
      if (error || response.statusCode !== 200) {
        console.error("Fehler beim Weiterleiten:", error?.message || response.statusCode);
        return res.status(500).json({ type: 'error', message: error?.message || 'Fehler bei der Batterieanfrage' });
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json(JSON.parse(body));
    });
  } catch (err) {
    next(err);
  }
});

app.get('/data2022', async (req, res, next) => {
  try {
    console.log('Anfrage für data2022');
    res.json({ data2022: await getData2022() });
  } catch (err) {
    next(err);
  }
});

app.get('/data2023', async (req, res, next) => {
  try {
    console.log('Anfrage für data2023');
    res.json({ data2023: await getData2023() });
  } catch (err) {
    next(err);
  }
});

app.get('/data2024', async (req, res, next) => {
  try {
    console.log('Anfrage für data2024');
    res.json({ data2024: await getData2024() });
  } catch (err) {
    next(err);
  }
});

app.get('/data2025', async (req, res, next) => {
  try {
    console.log('Anfrage für data2025');
    res.json({ data2025: await getData2025() });
  } catch (err) {
    next(err);
  }
});

app.get('/getTotaldata', async (req, res, next) => {
  try {
    console.log('Anfrage für totalDataCache');
    res.json({ totalData: await getTotaldata() });
  } catch (err) {
    next(err);
  }
});

app.get('/todaysData', async (req, res, next) => {
  try {
    console.log('Anfrage für heutige Daten');
    const todaysData = await getTodaysData();
    res.json({ todaysData: todaysData });
  } catch (err) {
    next(err);
  }
});

app.get('/struktur', (req, res, next) => {
  try {
    console.log("Anfrage für statistics.csv");
    res.sendFile(path.join(__dirname, '/struktur.png'));
    console.warn("Sende Datei");
  } catch (err) {
    next(err);
  }
});

app.get('/slides', async (req, res, next) => {
  try {
    const filePath = path.join(__dirname, 'daten', 'slides.json');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Slide-Daten nicht gefunden' });
    }
    const data = await fsPromises.readFile(filePath, 'utf-8');
    const json = JSON.parse(data);
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Lesen der Slide-Daten' });
  }
});

// ============================================
//             Server - Aufgaben
// ============================================
app.listen(PORT, () => console.log(`Proxy läuft auf Port ${PORT}`));
