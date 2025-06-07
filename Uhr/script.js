let hr = document.getElementById('hour');
let min = document.getElementById('min');
let sec = document.getElementById('sec');

function displayTime() {
    let date = new Date();

    // Stunden, Minuten, Sekunden abrufen
    let hh = date.getHours();
    let mm = date.getMinutes();
    let ss = date.getSeconds();

    let hRotation = 30 * hh + mm / 2;
    let mRotation = 6 * mm;
    let sRotation = 6 * ss;

    // Zeigerrotation für die analoge Uhr
    hr.style.transform = `rotate(${hRotation}deg)`;
    min.style.transform = `rotate(${mRotation}deg)`;
    sec.style.transform = `rotate(${sRotation}deg)`;

    let day = date.getDate();  // Verwende getDate()
    let month = date.getMonth();  // Monate gehen von 0 bis 11
    const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

    // Stunden und Minuten formatieren
    if (day < 10) day = '0' + day;
    if (hh < 10) hh = '0' + hh;
    if (mm < 10) mm = '0' + mm;
    if (ss < 10) ss = '0' + ss;

    // Aktualisiere die digitale Uhr
    document.getElementById('digitalClockDisplay').innerHTML = hh + ":" + mm + ":" + ss;
    document.getElementById('Datum').innerHTML = "<b>" + day + "<br>" + months[month] + "</b>";
}

// Die Funktion alle 1000ms (1 Sekunde) aufrufen
setInterval(displayTime, 1000);
