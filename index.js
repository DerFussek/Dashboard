const express = require('express');
const request = require('request');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { CronJob } = require('cron'); 
const { Console, warn } = require('console');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));
const cors = require('cors');
app.use(cors());


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

function getJahresdatemFromJSON() {
  const filePath = path.join(__dirname, 'daten', 'jahresdaten.json');
  if (!fs.existsSync(filePath)) {
    console.error("JSON-Datei nicht gefunden:", filePath);
    return null;
  }

  try {
    const jsonData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(jsonData);
  } catch (err) {
    console.error("Fehler beim Einlesen der JSON-Datei:", err.message);
    return null;
  }
}

function getData2022() {
  const jahresdaten = getJahresdatemFromJSON()
  if(jahresdaten) {
    const data2022 = [
      jahresdaten["2022"].production,
      jahresdaten["2022"].consumption,
      jahresdaten["2022"].autarky
    ];
    return data2022;
  }

  return null;
}

function getData2023() {
  const jahresdaten = getJahresdatemFromJSON()
  if(jahresdaten) {
    const data2023 = [
      jahresdaten["2023"].production,
      jahresdaten["2023"].consumption,
      jahresdaten["2023"].autarky
    ];
    return data2023;
  }

  return null;
}

function getData2024() {
  const jahresdaten = getJahresdatemFromJSON()
  if(jahresdaten) {
    const data2024 = [
      jahresdaten["2024"].production,
      jahresdaten["2024"].consumption,
      jahresdaten["2024"].autarky
    ];
    return data2024;
  }

  return null;
}

function getData2025() {
  const jahresdaten = getJahresdatemFromJSON()
  if(jahresdaten) {
    const data2025 = [
      jahresdaten["2025"].production,
      jahresdaten["2025"].consumption,
      jahresdaten["2025"].autarky
    ];
    return data2025;
  }

  return null;
}


function getTotaldata() {
  const jahresdaten = getJahresdatemFromJSON()  // Sicherstellen, dass die Daten geladen werden
  
  if (jahresdaten) {
    const data2022 = [
      jahresdaten["2022"].production,
      jahresdaten["2022"].consumption,
      jahresdaten["2022"].autarky
    ];
  
    const data2023 = [
      jahresdaten["2023"].production,
      jahresdaten["2023"].consumption,
      jahresdaten["2023"].autarky
    ];
  
    const data2024 = [
      jahresdaten["2024"].production,
      jahresdaten["2024"].consumption,
      jahresdaten["2024"].autarky
    ];

    const data2025 = [
      jahresdaten["2025"].production,
      jahresdaten["2025"].consumption,
      jahresdaten["2025"].autarky
    ];

    const totalProduction =
      data2022[0] + data2023[0] + data2024[0] + data2025[0];
    const totalConsumption =
      data2022[1] + data2023[1] + data2024[1] + data2025[1];
    const avgAutarky =
      (data2022[2] + data2023[2] + data2024[2] + data2025[2]) / 4;

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

// Initialisierung beim Start des Servers
async function initializeData() {
  try {
    totalDataCache = getTotaldata();
    console.log("Data2022:", getData2022());
    console.log("Data2023:", getData2023());
    console.log("Data2024:", getData2024());
    console.log("GesamtData:", totalDataCache);
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
app.get('/getBatteryData', (req, res) => {
  const apiUrl = 'http://192.168.178.47:8080/api/v1/status';

  request(apiUrl, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      console.error("Fehler beim Weiterleiten:", error?.message || response.statusCode);
      return res.status(500).json({ type: 'error', message: error?.message || 'Fehler bei der Batterieanfrage' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*'); // falls du willst, dass dieser Proxy überall erreichbar ist
    res.json(JSON.parse(body));
  });
});


app.get('/data2022', (req, res) => {
  console.log('Anfrage für data2022');
  res.json({ data2022: getData2022()});
});

app.get('/data2023', (req, res) => {
  console.log('Anfrage für data2023');
  res.json({ data2023: getData2023()});
});

app.get('/data2024', (req, res) => {
  console.log('Anfrage für data2024');
  res.json({ data2024: getData2024()});
});

app.get('/data2025', (req, res) => {
  console.log('Anfrage für data2025');
  res.json({ data2025: getData2025()});
});

app.get('/getTotaldata', (req, res) => {
  console.log('Anfrage für totalDataCache');
  res.json({ totalData: totalDataCache});
});

app.get('/todaysData', (req, res) => {
  console.log('Anfrage für heutige Daten');
  const todaysData = getTodaysData();
  res.json({ todaysData: todaysData });
});

app.get('/struktur', (req, res) => {
  console.log("Anfrage fuer statistics.csv");
  res.sendFile(path.join(__dirname, '/struktur.png') );  // Pfad zur CSV-Datei
  console.warn("Sende Datei");
});

app.get('/slides', (req, res) => {
  const filePath = path.join(__dirname, 'daten', 'slides.json');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Slide-Daten nicht gefunden' });
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(data);
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Lesen der Slide-Daten' });
  }
});


//============================================
//             Server - Aufgaben
//============================================
// Proxy-Server starten
const PORT = 3000;
app.listen(PORT, () => console.log(`Proxy läuft auf Port ${PORT}`));

