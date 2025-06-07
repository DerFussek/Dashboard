const express = require('express');
const request = require('request');
const path = require('path');
const fs = require('fs');
const { CronJob } = require('cron'); 
const app = express();

app.use(express.json());

// CORS erlauben
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Proxy-Endpunkt
app.get('/getBatteryData', (req, res) => {
  console.log("Anfrage fuer Batteriedaten");
  const apiUrl = 'http://192.168.178.47:8080/api/v1/status';
  request(apiUrl, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      return res.status(500).json({ type: 'error', message: error.message });
    }
    res.json(JSON.parse(body));
  });
  console.warn("Sende Daten");
});

app.post('/save', (req, res) => {
  console.log('Anfrage zum Speichern von Daten');  // Überprüfe die empfangenen Daten

  let data = req.body;

  // Wenn die Daten kein Array sind, packen wir sie in ein Array
  if (!Array.isArray(data)) {
      data = [data];  // Wandelt ein einzelnes Objekt in ein Array um
  }

  // Ausgabe der Daten zur weiteren Überprüfung
  const csvFilePath = 'daten/measurements.csv';

  // Falls die Datei noch nicht existiert, füge die Kopfzeile hinzu
  if (!fs.existsSync(csvFilePath)) {
      const header = 'timestamp,production,consumption,battery_charge,battery_discharge,grid_feedin,grid_consumption,battery_state_of_charge,direct_consumption\n';
      fs.writeFileSync(csvFilePath, header);
  }

  // Daten in die CSV-Datei einfügen
  data.forEach(entry => {
      // Überprüfen, ob 'timestamp' im Eintrag existiert
      if (!entry.timestamp) {
          console.error('Fehlender timestamp:', entry);
          return res.status(400).send('Fehlendes Feld: timestamp');
      }

      const row = `${entry.timestamp},${entry.production},${entry.consumption},${entry.battery_charge},${entry.battery_discharge},${entry.grid_feedin},${entry.grid_consumption},${entry.battery_state_of_charge},${entry.direct_consumption}\n`;
      fs.appendFileSync(csvFilePath, row);
  });

  res.send('Daten wurden gespeichert!');
  console.warn("Speichere Daten");
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



// Starte den Cron-Job
job.start();


// Proxy-Server starten
const PORT = 3000;
app.listen(PORT, () => console.log(`Proxy läuft auf Port ${PORT}`));
