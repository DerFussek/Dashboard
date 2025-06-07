const express = require('express');
const request = require('request');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { CronJob } = require('cron'); 
const { Console, warn } = require('console');
const app = express();

app.use(express.json());

// CORS erlauben
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


const job = new CronJob('0 0 * * *', () => {  // Jeden Tag um Mitternacht
  summarizeDailyData();
});

// Funktion zur Zusammenfassung der täglichen Daten
function summarizeDailyData() {
  const measurementsFilePath = 'daten/measurements.csv';
  const statisticsFilePath = 'daten/statistics.csv';

  if (!fs.existsSync(measurementsFilePath)) {
    console.error('Die Datei measurements.csv existiert nicht.');
    return;
  }

  const data = fs.readFileSync(measurementsFilePath, 'utf-8');
  const lines = data.split('\n').slice(1); // Header überspringen
  const dailyStats = {};

  lines.forEach(line => {
    if (line.trim() === '') return; // leere Zeilen überspringen
    const [timestamp, production, consumption, batteryCharge, batteryDischarge, gridFeeding, gridConsumption] = line.split(',');

    const date = timestamp.split('T')[0]; // Nur das Datum extrahieren
    if (!dailyStats[date]) {
      dailyStats[date] = {
        produced_energy: 0,
        consumed_energy: 0,
        battery_charged_energy: 0,
        battery_discharged_energy: 0,
        grid_feedin_energy: 0,
        grid_purchase_energy: 0,
      };
    }

    dailyStats[date].produced_energy += Number(production);
    dailyStats[date].consumed_energy += Number(consumption);
    dailyStats[date].battery_charged_energy += Number(batteryCharge);
    dailyStats[date].battery_discharged_energy += Number(batteryDischarge);
    dailyStats[date].grid_feedin_energy += Number(gridFeeding);
    dailyStats[date].grid_purchase_energy += Number(gridConsumption);
  });

  // Erstelle die statistics.csv Datei
  
  
  if (!fs.existsSync(statisticsFilePath)) {
    const statisticsHeader = 'timestamp,produced_energy,consumed_energy,battery_charged_energy,battery_discharged_energy,grid_feedin_energy,grid_purchase_energy\n';
    fs.appendFileSync(statisticsFilePath, statisticsHeader);
  }
  

  for (const date in dailyStats) {
    const stat = dailyStats[date];
    const formattedDate = new Date(date).toISOString().split('T')[0] + 'T00:00:00+01:00'; // Zeitzone anpassen
    const row = `${formattedDate},${stat.produced_energy},${stat.consumed_energy},${stat.battery_charged_energy},${stat.battery_discharged_energy},${stat.grid_feedin_energy},${stat.grid_purchase_energy}\n`;
    fs.appendFileSync(statisticsFilePath, row);
  }

  // Leere die measurements.csv
  fs.writeFileSync(measurementsFilePath, 'timestamp,production,consumption,battery_charge,battery_discharge,grid_feedin,grid_consumption,battery_state_of_charge,direct_consumption\n');
};

async function getBatteryData() {
  const apiUrl = 'http://192.168.178.47:8080/api/v1/status';

  try {
    console.log("Anfrage fuer Batteriedaten");
    const response = await axios.get(apiUrl);
    console.warn("Sende Daten");
    return response.data;
  } catch (error) {
    console.error("Fehler bei der Anfrage", error.message);
    throw new Error('Fehler bei der Anfrage der Batteriedaten: ' + error.message);
  }
}


// Starte den Cron-Job
job.start();

getBatteryData().then(data => {
  console.log("Batteriedaten: ", data);
}).catch(error => {
  console.error(error.message);
});

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
    timestamp: timestamp,  // ISO-Zeitformat verwenden
    production: production,
    consumption: consumption,
    battery_charge: battery_charge,
    battery_discharge: battery_discharge,
    grid_feedin: grid_feedin,
    grid_consumption: grid_consumption,
    battery_state_of_charge: battery_state_of_charge,
    direct_consumption: direct_consumption
  };

  // Wenn die Daten kein Array sind, packen wir sie in ein Array
  if (!Array.isArray(dataforcsv)) {
    dataforcsv = [dataforcsv];  // Wandelt ein einzelnes Objekt in ein Array um
  }

  // Ausgabe der Daten zur weiteren Überprüfung
  const csvFilePath = 'daten/measurements.csv';

  // Falls die Datei noch nicht existiert, füge die Kopfzeile hinzu
  if (!fs.existsSync(csvFilePath)) {
      const header = 'timestamp,production,consumption,battery_charge,battery_discharge,grid_feedin,grid_consumption,battery_state_of_charge,direct_consumption\n';
      fs.writeFileSync(csvFilePath, header);
  }

  // Daten in die CSV-Datei einfügen
  dataforcsv.forEach(entry => {
      // Überprüfen, ob 'timestamp' im Eintrag existiert
      if (!entry.timestamp) {
          console.error('Fehlender timestamp:', entry);
          return res.status(400).send('Fehlendes Feld: timestamp');
      }

      const row = `${entry.timestamp},${entry.production},${entry.consumption},${entry.battery_charge},${entry.battery_discharge},${entry.grid_feedin},${entry.grid_consumption},${entry.battery_state_of_charge},${entry.direct_consumption}\n`;
      fs.appendFileSync(csvFilePath, row);
  });
}

const saveDataJob = new CronJob('* * * * *', async () => {  // Jede Minute
  try {
    console.log('Hole aktuelle Batteriedaten...');
    const batteryData = await getBatteryData();
    await saveData(batteryData);
    console.log('Daten erfolgreich gespeichert.');
  } catch (error) {
    console.error('Fehler beim Speichern der Daten:', error.message);
  }
});

// Starte den Cron-Job
saveDataJob.start();



let data2024Cache;
let totalDataCache;


function getData2022() {
  return [8390, 2612, 86];
}

function getData2023() {
  return [8795, 4333, 76];
}

async function getData2024() {
  try {
    // Verwende die versprochene-basierte Version von fs, die await unterstützt
    const data = await fs.promises.readFile('daten/statistics.csv', 'utf-8');
    const lines = data.split('\n');
    const rows = lines.slice(1).map(line => line.split(','));

    let totalProduction = 0;
    let totalConsumption = 0;
    let totalfeedin = 0;
    let totalfeedout = 0;

    rows.forEach(row => {
      if (row.length < 7) return; // Sicherstellen, dass genügend Spalten vorhanden sind
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
    let newTotalfeedin = totalProduction / 60 / 1000;
    let newTotalfeedout = totalConsumption / 60;
    let autarkie = newtotalConsumption > 0 ? (newtotalConsumption - newTotalfeedout) / newtotalConsumption : 0;

    return [newtotalProduction, newtotalConsumption, autarkie];
  } catch (error) {
    console.error('Fehler beim Laden der CSV-Datei', error.message);
    throw new Error('Fehler beim Laden der CSV-Datei: ' + error.message);
  }
}


function getTodaysData() {
  const csvFilePath = path.join(__dirname, 'daten', 'measurements.csv'); // Definiere den Pfad hier
  try {
    if (!fs.existsSync(csvFilePath)) {
      console.warn(`Datei ${csvFilePath} existiert nicht. Erstelle eine neue Datei.`);
      const header = 'timestamp,production,consumption,battery_charge,battery_discharge,grid_feedin,grid_consumption,battery_state_of_charge,direct_consumption\n';
      fs.writeFileSync(csvFilePath, header);
    }
    
    const data = fs.readFileSync('daten/measurements.csv', 'utf-8');
    const lines = data.split('\n');
    const rows = lines.slice(1).map(line => line.split(','));

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

    let newtotalProduction = ((totalProduction)/1000);
    let newtotalConsumption = ((totalConsumption)/1000);
    let newTotalfeedin = (((totalProduction)/60)/1000);
    let newTotalfeedout =(((totalConsumption)/60));
    let autarkie = (newtotalConsumption - newTotalfeedout) / newtotalConsumption;

    return [newtotalProduction, newtotalConsumption, autarkie];
  } catch (error) {
    console.error("Fehler beim Laden der CSV-Datei", error.message);
    throw new warn('Fehler beim Laden der CSV-Datei: ' + error.message);
  }
}

function getTotalData(data2022, data2023, data2024) {
  // Sicherstellen, dass alle Daten iterierbare Listen (Arrays) sind
  if (!Array.isArray(data2022)) {
    throw new warn("Daten von 2022 sind keine iterierbare Liste");
  }
  if (!Array.isArray(data2023)) {
    throw new warn("Daten von 2023 sind keine iterierbare Liste");
  }
  if (!Array.isArray(data2024)) {
    throw new warn("Daten von 2024 sind keine iterierbare Liste");
  }

  // Sicherstellen, dass die Arrays nicht leer sind
  if (data2022.length === 0) {
    throw new warn("Daten von 2022 sind leer");
  }
  if (data2023.length === 0) {
    throw new warn("Daten von 2023 sind leer");
  }
  if (data2024.length === 0) {
    throw new warn("Daten von 2024 sind leer");
  }

  // Werte aus den Arrays extrahieren
  const [production_2022, consumption_2022, autarky_2022] = data2022;
  const [production_2023, consumption_2023, autarky_2023] = data2023;
  const [production_2024, consumption_2024, autarky_2024] = data2024;

  // Gesamtproduktion und Gesamtverbrauch berechnen
  let totalProduction = production_2022 + production_2023 + production_2024;
  let totalConsumption = consumption_2022 + consumption_2023 + consumption_2024;
  let totalAutarky = (autarky_2022 + autarky_2023 + autarky_2024) / 3;

  return [totalProduction, totalConsumption, totalAutarky];
}


// Initialisierung beim Start des Servers
async function initializeData() {
  try {
    data2024Cache = await getData2024();
    totalDataCache = getTotalData(getData2022(), getData2023(), data2024Cache);
    console.log("Data2022:", getData2022());
    console.log("Data2023:", getData2023());
    console.log("Data2024:", data2024Cache);
    console.log("GesamtData:",totalDataCache);
  } catch (error) {
    console.error('Fehler bei der Initialisierung der Daten:', error.message);
  }
}

initializeData();
/*
// Stündlicher Cron-Job zur Aktualisierung der Daten
const hourlyJob = new CronJob('0 * * * *', () => {  // Jede Stunde zur vollen Stunde
  console.log('Aktualisiere Daten...');
  data2024Cache = getData2024();
  totalDataCache = getTotalData(getData2022(), getData2023(), data2024Cache);
  console.log('Daten wurden aktualisiert.');
});

hourlyJob.start();
*/

//============================================
//             Proxy - Aufgaben
//============================================


// Proxy-Endpunkt
app.get('/getBatteryData', (req, res) => {
  const apiUrl = 'http://192.168.178.47:8080/api/v1/status';
  request(apiUrl, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      return res.status(500).json({ type: 'error', message: error.message });
    }
    res.json(JSON.parse(body));
  });
});

app.get('/data2024', (req, res) => {
  console.log('Anfrage für data2024Cache');
  res.json({ data2024: data2024Cache });
});

app.get('/totalData', (req, res) => {
  console.log('Anfrage für totalDataCache');
  res.json({ totalData: totalDataCache });
});

app.get('/todaysData', (req, res) => {
  console.log('Anfrage für heutige Daten');
  const todaysData = getTodaysData();
  res.json({ todaysData: todaysData });
});

app.get('/test-summarize', (req, res) => {
  console.log('Führe die Zusammenfassungsfunktion testweise aus...');
  summarizeDailyData();
  res.send('Die Zusammenfassungsfunktion wurde ausgeführt!');
});


app.get('/measurements.csv', (req, res) => {
  console.log("Anfrage fuer measurements.csv");
  res.sendFile(path.join(__dirname, 'daten/measurements.csv'));  // Pfad zur CSV-Datei
  console.warn("Sende Datei");
});

app.get('/statistics/statistics.csv', (req, res) => {
  console.log("Anfrage fuer statistics.csv");
  res.sendFile(path.join(__dirname, 'daten/statistics.csv'));  // Pfad zur CSV-Datei
  console.warn("Sende Datei");
});

app.get('/statistics/2023.csv', (req, res) => {
  console.log("Anfrage fuer statistics.csv");
  res.sendFile(path.join(__dirname, 'daten/statistiken/2023.csv'));  // Pfad zur CSV-Datei
  console.warn("Sende Datei");
});

app.get('/statistics/2022.csv', (req, res) => {
  console.log("Anfrage fuer statistics.csv");
  res.sendFile(path.join(__dirname, 'daten/statistiken/2022.csv'));  // Pfad zur CSV-Datei
  console.warn("Sende Datei");
});

app.get('/struktur', (req, res) => {
  console.log("Anfrage fuer statistics.csv");
  res.sendFile(path.join(__dirname, '/struktur.png') );  // Pfad zur CSV-Datei
  console.warn("Sende Datei");
});


//============================================
//             Server - Aufgaben
//============================================
function ensureMeasurementsFile() {
  const dataFolderPath = path.join(__dirname, 'daten');
  const csvFilePath = path.join(dataFolderPath, 'measurements.csv');
  // Ordner prüfen und erstellen
  if (!fs.existsSync(dataFolderPath)) {
    console.log(`Ordner '${dataFolderPath}' existiert nicht. Erstelle den Ordner.`);
    fs.mkdirSync(dataFolderPath, { recursive: true });
  }

  // Datei prüfen und erstellen
  if (!fs.existsSync(csvFilePath)) {
    console.log(`Datei '${csvFilePath}' existiert nicht. Erstelle die Datei.`);
    const header = 'timestamp,production,consumption,battery_charge,battery_discharge,grid_feedin,grid_consumption,battery_state_of_charge,direct_consumption\n';
    fs.writeFileSync(csvFilePath, header);
    console.log(`Datei '${csvFilePath}' wurde erfolgreich erstellt.`);
  } else {
    console.log(`Datei '${csvFilePath}' existiert bereits.`);
  }
}

console.log("Starte Initialisierung...");
ensureMeasurementsFile();
console.log("Datei sichergestellt.");


// Proxy-Server starten
const PORT = 3000;
app.listen(PORT, () => console.log(`Proxy läuft auf Port ${PORT}`));

