var indexH=0;
var indexM=0;
var indexS=0;
let weatherData;
let currentDateInfo = {
    year: 2000,
    month: 1,
    day: 1,
    weekday: 1
};
let prevTime = { h: null, m: null, s: null };
var SETTINGS = {
    palette:    1,
    font:       1,
    language:   1,
    privacy:    1,
    brightness: 1.0
};
var BUTTONS_SIGNALS = {
    button_1  : "",
    button_2  : "",
    button_3  : "",
    button_4  : "",
    button_5  : "",
    button_6  : "",
    button_7  : "",
    button_8  : "",
    button_9  : "",
    button_a1 : "",
    button_a2 : "",
    button_a3 : "",
    button_a4 : "",
    button_a5 : ""
}
const root = document.documentElement;


//---------------------------------------------------------------------------------------------------------------------
//-----------    Fetch Data Functions    -----------
//---------------------------------------------------------------------------------------------------------------------
function fetchWeatherData() {
    return fetch("/api/weather")
      .then(res => res.json())
      .then(data => {
        weatherData = data;
        return weatherData;
      })
      .catch(error => {
        console.error(error);
      });
}
function getWeekdayName(index) {
    const langData = LANGUAGES[SETTINGS.language] || LANGUAGES[1];
    return langData.weekdays[index - 1] || "";
}
function getMonthName(index) {
    const langData = LANGUAGES[SETTINGS.language] || LANGUAGES[1];
    return langData.months[index - 1] || "";
}
function fetchDateInfo() {
    return fetch("/api/date")
      .then(res => res.json())
      .then(data => {
        currentDateInfo = {
          year: data.year,
          month: data.month,
          day: data.day,
          weekday: data.weekday,
        };
        return currentDateInfo;
      })
      .catch(error => {
        console.error(error);
      });
}

function saveSettings() {
    localStorage.setItem('userSettings', JSON.stringify(SETTINGS));
}

function setDateFace(dateInfo) {
    if (!dateInfo) return;
    document.querySelector(".date-month-day").innerText = `${getMonthName(dateInfo.month)} ${dateInfo.day}`;
    document.querySelector(".date-year").innerText = `${dateInfo.year}`;

    const weekBlocks = document.querySelectorAll(".weather-week-day");
    for (let i = 0; i < weekBlocks.length; i++) {
        const block = weekBlocks[i];
        if (!block) continue;

        const dayNameDiv = block.querySelector(".w-w-name");
        if (!dayNameDiv) continue;

        let weekdayIndex = (dateInfo.weekday + i) % 7;
        if (weekdayIndex === 0) weekdayIndex = 7;

        const weekdayName = getWeekdayName(weekdayIndex);
        dayNameDiv.textContent = weekdayName;
    }
}
function loadInlineSVGs() {
    const placeholders = document.querySelectorAll(".svg-placeholder");

    placeholders.forEach(el => {
    const src = el.getAttribute("data-src");
    fetch(src)
      .then(res => res.text())
      .then(svg => {
        el.innerHTML = svg;
        const insertedSvg = el.querySelector("svg");
        if (insertedSvg) {
          insertedSvg.setAttribute("width", "100%");
          insertedSvg.setAttribute("height", "100%");
          insertedSvg.setAttribute("fill", "currentColor");
        }
      });
    });
}

//---------------------------------------------------------------------------------------------------------------------
//-----------    IR Buttons    -----------
//---------------------------------------------------------------------------------------------------------------------
let inputLockActive = false;

function updateSignalClassMarkers() {
    remoteButtons.forEach(btn => {
        const id = btn.id;
        if (BUTTONS_SIGNALS[id]) {
            btn.classList.add("remote-btn-signal");
        } else {
            btn.classList.remove("remote-btn-signal");
        }
    });
}

function saveButtonSignals() {
    localStorage.setItem('buttonSignals', JSON.stringify(BUTTONS_SIGNALS));
    updateSignalClassMarkers();
}

function loadButtonSignals() {
    const savedSignals = JSON.parse(localStorage.getItem('buttonSignals'));

    if (!savedSignals) return;

    for (let key in BUTTONS_SIGNALS) {
        if (savedSignals.hasOwnProperty(key)) {
            BUTTONS_SIGNALS[key] = savedSignals[key];
        }
    }
    updateSignalClassMarkers();
}

function assignSignalToButton(buttonId, signal) {
    if (BUTTONS_SIGNALS.hasOwnProperty(buttonId)) {
        BUTTONS_SIGNALS[buttonId] = signal;
        saveButtonSignals();
    } else {
        console.warn(`Unknown button ID: ${buttonId}`);
    }
}

function removeSignalFromButton(buttonId) {
    if (BUTTONS_SIGNALS.hasOwnProperty(buttonId)) {
        BUTTONS_SIGNALS[buttonId] = "";
        saveButtonSignals();
    } else {
        console.warn(`Unknown button ID: ${buttonId}`);
    }
}

function runCustomButton(action) {
    if (inputLockActive) return;

    const signal = BUTTONS_SIGNALS[action];
    if (!signal) {
        return;
    }
    fetch('/send-ir-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal: signal })
    });
}

function assignCapturedSignalToButton(signal, onFinish) {
    inputLockActive = true;
    highlightButtons(false);

    function handleClick(event) {
        const target = event.target;
        const buttonId = target.id;

        if (!BUTTONS_SIGNALS.hasOwnProperty(buttonId)) return;

        assignSignalToButton(buttonId, signal);
        cleanup();
    }

    function cleanup() {
        inputLockActive = false;
        removeHighlightButtons();
        remoteButtons.forEach(btn => btn.removeEventListener("click", handleClick));
        clearTimeout(timeoutId);
        if (typeof onFinish === 'function') onFinish(); // Tik čia aktyvuojam
    }

    remoteButtons.forEach(btn => btn.addEventListener("click", handleClick));

    const timeoutId = setTimeout(() => {
        console.warn("Timeout");
        cleanup();
    }, 20000);
}

function startIRRecording() {
    const removeButton = document.querySelector(".remote-btn-remove-ir");
    const setButton = document.querySelector(".remote-btn-set-ir");

    removeButton.classList.remove("btn-interactive");
    setButton.classList.remove("btn-interactive");

    fetch('/record-ir')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                window.capturedSignal = data.signal;

                assignCapturedSignalToButton(data.signal, () => {
                    removeButton.classList.add("btn-interactive");
                    setButton.classList.add("btn-interactive");
                });

            } else {
                console.warn("No signal");
                removeButton.classList.add("btn-interactive");
                setButton.classList.add("btn-interactive");
            }
        })
        .catch(err => {
            console.error("No connection to backend:", err);
            removeButton.classList.add("btn-interactive");
            setButton.classList.add("btn-interactive");
        });
}

document.querySelector(".remote-btn-set-ir").addEventListener("click", () => {startIRRecording();});

function startIRRemoval() {
    inputLockActive = true;
    const removeButton = document.querySelector(".remote-btn-remove-ir");
    const setButton = document.querySelector(".remote-btn-set-ir");
    
    removeButton.classList.remove("btn-interactive");
    setButton.classList.remove("btn-interactive");

    highlightButtons(true);

    function handleClick(event) {
        const target = event.target;
        const buttonId = target.id;

        if (!BUTTONS_SIGNALS.hasOwnProperty(buttonId)) return;
        if (!BUTTONS_SIGNALS[buttonId]) return;

        removeSignalFromButton(buttonId);
        cleanup();
    }

    function cleanup() {
        inputLockActive = false;
        removeHighlightButtons();
        remoteButtons.forEach(btn => btn.removeEventListener("click", handleClick));
        clearTimeout(timeoutId);
        removeButton.classList.add("btn-interactive");
        setButton.classList.add("btn-interactive");
    }

    remoteButtons.forEach(btn => btn.addEventListener("click", handleClick));

    const timeoutId = setTimeout(() => {
        console.warn("Timeoute");
        cleanup();
    }, 20000);
}

document.querySelector(".remote-btn-remove-ir").addEventListener("click", startIRRemoval);

const remoteButtons = Array.from(document.querySelectorAll('.remote-btn[id]'));

function highlightButtons(showFull) {
    remoteButtons.forEach(btn => {
        const id = btn.id;
        const hasSignal = !!BUTTONS_SIGNALS[id];

        if (showFull ? hasSignal : !hasSignal) {
            btn.classList.add('remote-btn-highlight');
        } else {
            btn.classList.remove('remote-btn-highlight');
        }
    });
}
function removeHighlightButtons() {
    remoteButtons.forEach(btn => {
        btn.classList.remove('remote-btn-highlight');
    });
}
function enableRemoteButtonActions() {
    remoteButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const buttonId = btn.id;
            runCustomButton(buttonId);
        });
    });
}

//---------------------------------------------------------------------------------------------------------------------
//-----------    Weather    -----------
//---------------------------------------------------------------------------------------------------------------------
function updateWeatherGraph(precipitationProbs) {
    const graph = document.getElementById("weather-day-graph");
  
    if (!graph || precipitationProbs.length === 0) {
      console.warn("No precipitation data.");
      return;
    }
  
    let points = "0% 100%,";
  
    for (let i = 0; i < precipitationProbs.length; i++) {
      const x = (i / (precipitationProbs.length - 1)) * 100;
  
      const boosted = precipitationProbs[i] * 1.5;
      const y = 100 - Math.min(boosted, 100);
  
      points += ` ${x.toFixed(2)}% ${y.toFixed(2)}%,`;
    }
  
    points += " 100% 100%";
  
    graph.style.clipPath = `polygon(${points})`;
}
function fillWeatherBlocksFromHour(startHour) {
    if (!weatherData || !weatherData.today) {
      console.error("Weather data empty");
      return;
    }
  
    startHour = parseInt(startHour, 10);
  
    const weatherBlocks = document.querySelectorAll(".weather-day");
    const precipitationProbs = [];
  
    for (let i = 0; i < weatherBlocks.length; i++) {
      const block = weatherBlocks[i];
      const currentHour = (startHour + i);
      const weatherEntry = weatherData.today.find(entry => entry.hour === currentHour);
  
      const windDiv = block.querySelector(".weather-day-wind");
      const tempDiv = block.querySelector(".weather-day-temp");
      const svgDiv = block.querySelector(".weather-day-svg");
      const timeDiv = block.querySelector(".weather-day-time");
  
      if (windDiv) windDiv.textContent = `${weatherEntry.windspeed} m/s`;
      if (tempDiv) tempDiv.textContent = `${weatherEntry.temperature} C°`;
      if (svgDiv) svgDiv.setAttribute("data-src", `/static/assets/svg/${weatherEntry.weathercode}.svg`);
      
      precipitationProbs.push(weatherEntry.precipitation_prob);
  
      if (timeDiv) timeDiv.textContent = `${String(currentHour % 24).padStart(2, "0")}:00`;
    }
    
    updateWeatherGraph(precipitationProbs);
}
function fillWeatherWeek() {
    if (!weatherData || !weatherData.summary_7days) {
      return;
    }
  
    const weekBlocks = document.querySelectorAll(".weather-week-day");
  
    for (let i = 0; i < weekBlocks.length; i++) {
      const block = weekBlocks[i];
      if (!block) continue;
  
      const dayData = weatherData.summary_7days[i];
      if (!dayData) continue;
  
      const mainSvgDiv = block.querySelector(".w-w-svg");
      if (mainSvgDiv) {
        mainSvgDiv.setAttribute("data-src", `/static/assets/svg/${dayData.common_code}.svg`);
      }
      
      const dayTempDiv = block.querySelector(".w-w-da .w-w-temp");
      const dayPrecipDiv = block.querySelector(".w-w-da .w-w-precip");
      const dayWindDiv = block.querySelector(".w-w-da .w-w-wind");
  
      if (dayTempDiv) dayTempDiv.textContent = `${Math.round(dayData.avg_day_temp)} C°`;
      if (dayPrecipDiv) dayPrecipDiv.textContent = `${Math.round(dayData.avg_day_precip)} %`;
      if (dayWindDiv) dayWindDiv.textContent = `${Math.round(dayData.avg_day_wind)} m/s`;
  
      const nightTempDiv = block.querySelector(".w-w-ni .w-w-temp");
      const nightPrecipDiv = block.querySelector(".w-w-ni .w-w-precip");
      const nightWindDiv = block.querySelector(".w-w-ni .w-w-wind");
  
      if (nightTempDiv) nightTempDiv.textContent = `${Math.round(dayData.avg_night_temp)} C°`;
      if (nightPrecipDiv) nightPrecipDiv.textContent = `${Math.round(dayData.avg_night_precip)} %`;
      if (nightWindDiv) nightWindDiv.textContent = `${Math.round(dayData.avg_night_wind)} m/s`;
    }
}

//---------------------------------------------------------------------------------------------------------------------
//-----------    Animation Clock    -----------
//---------------------------------------------------------------------------------------------------------------------
var isInitialized = false; 

function indexInc(index, size) {
    return index >= size ? 0 : index + 1;
}
function getNextClockValue(divElement, max) {
    let current = parseInt(divElement.textContent, 10);
    let next = (current + 1) > max ? 0 : current + 1;
    return next.toString().padStart(2, '0');
}

const clockHDivs = [];
for (let i = 1; i <= 8; i++) {
    const el = document.getElementById(`clock-h-${i}`);
    if (el) clockHDivs.push(el);
}
const clockMDivs = [];
for (let i = 1; i <= 10; i++) {
    const el = document.getElementById(`clock-m-${i}`);
    if (el) clockMDivs.push(el);
}
const clockSDivs = [];
for (let i = 1; i <= 12; i++) {
    const el = document.getElementById(`clock-s-${i}`);
    if (el) clockSDivs.push(el);
}

function hAnimation(index){
    clockHDivs[index].style.left = '0vw';//first out / new temp
    clockHDivs[index].style.color = 'rgba(var(--color-main), 0)'

    index = indexInc(index, 7);
    clockHDivs[index].style.left = '11vw';
    clockHDivs[index].style.color = 'rgba(var(--color-main), 0.4)'

    index = indexInc(index, 7);
    clockHDivs[index].style.left = '22vw';
    clockHDivs[index].style.color = 'rgba(var(--color-main), 0.7)'

    index = indexInc(index, 7);//main old
    clockHDivs[index].style.left = '33vw'
    clockHDivs[index].style.fontSize = '5.1vw';
    clockHDivs[index].style.transform = 'scaleY(1.4)';
    clockHDivs[index].style.color = 'rgba(var(--color-main), 0.9)'
    
    index = indexInc(index, 7);//main new
    clockHDivs[index].style.left = '46vw';
    clockHDivs[index].style.fontSize = '7.6vw';
    clockHDivs[index].style.transform = 'scaleY(1.5)';
    clockHDivs[index].style.color = 'rgba(var(--color-main), 1)'
    
    index = indexInc(index, 7);
    clockHDivs[index].style.left = '59vw';
    clockHDivs[index].style.color = 'rgba(var(--color-main), 0.9)'

    index = indexInc(index, 7);
    clockHDivs[index].style.left = '70vw';
    clockHDivs[index].style.color = 'rgba(var(--color-main), 0.7)'
    
    index = indexInc(index, 7);//temp in
    clockHDivs[index].style.left = '81vw';
    clockHDivs[index].style.color = 'rgba(var(--color-main), 0.4)'

    setTimeout(() => {
        let newValue = getNextClockValue(clockHDivs[index], 23);
        index = indexInc(index, 7);//first in to new temp
        clockHDivs[index].style.left = '92vw';
        clockHDivs[index].textContent = newValue;
    }, 300);
     
}
function mAnimation(index){
    
    clockMDivs[index].style.left = '7vw';//first out / new temp
    clockMDivs[index].style.color = 'rgba(var(--color-main), 0)'

    index = indexInc(index, 9);
    clockMDivs[index].style.left = '14.5vw';
    clockMDivs[index].style.color = 'rgba(var(--color-main), 0.3)'

    index = indexInc(index, 9);
    clockMDivs[index].style.left = '22vw';
    clockMDivs[index].style.color = 'rgba(var(--color-main), 0.5)'

    index = indexInc(index, 9);
    clockMDivs[index].style.left = '29.5vw';
    clockMDivs[index].style.color = 'rgba(var(--color-main), 0.75)'

    index = indexInc(index, 9); //old main
    clockMDivs[index].style.left = '37vw';
    clockMDivs[index].style.color = 'rgba(var(--color-main), 0.9)'
    clockMDivs[index].style.fontSize = '3.2vw';
    clockMDivs[index].style.transform = 'scaleY(1.4)';

    index = indexInc(index, 9); //new main
    clockMDivs[index].style.left = '46.5vw';
    clockMDivs[index].style.color = 'rgba(var(--color-main), 1)'
    clockMDivs[index].style.fontSize = '5.5vw';
    clockMDivs[index].style.transform = 'scaleY(1.5)';

    index = indexInc(index, 9);
    clockMDivs[index].style.left = '56vw';
    clockMDivs[index].style.color = 'rgba(var(--color-main), 0.9)'

    index = indexInc(index, 9);
    clockMDivs[index].style.left = '63.5vw';
    clockMDivs[index].style.color = 'rgba(var(--color-main), 0.75)'

    index = indexInc(index, 9);
    clockMDivs[index].style.left = '71vw';
    clockMDivs[index].style.color = 'rgba(var(--color-main), 0.5)'

    index = indexInc(index, 9);//temp fade in
    clockMDivs[index].style.left = '78.5vw';
    clockMDivs[index].style.color = 'rgba(var(--color-main), 0.3)'

    setTimeout(() => {
        let newValue = getNextClockValue(clockMDivs[index], 59);
        index = indexInc(index, 9);//first in to new temp
        clockMDivs[index].style.left = '86vw';
        clockMDivs[index].textContent = newValue;
    }, 300);
     
}
function sAnimation(index) {
    clockSDivs[index].style.left = '13vw';//first out / new temp
    clockSDivs[index].style.color = 'rgba(var(--color-main), 0)';

    index = indexInc(index, 11);
    clockSDivs[index].style.left = '18.7vw';
    clockSDivs[index].style.color = 'rgba(var(--color-main), 0.3)';

    index = indexInc(index, 11);
    clockSDivs[index].style.left = '24.2vw';
    clockSDivs[index].style.color = 'rgba(var(--color-main), 0.45)';

    index = indexInc(index, 11);
    clockSDivs[index].style.left = '29.7vw';
    clockSDivs[index].style.color = 'rgba(var(--color-main), 0.6)';

    index = indexInc(index, 11);
    clockSDivs[index].style.left = '35.2vw';
    clockSDivs[index].style.color = 'rgba(var(--color-main), 0.75)';

    index = indexInc(index, 11);//old main
    clockSDivs[index].style.left = '40.7vw';
    clockSDivs[index].style.color = 'rgba(var(--color-main), 0.9)';
    clockSDivs[index].style.fontSize = '2.2vw';
    clockSDivs[index].style.transform = 'scaleY(1.3)';

    index = indexInc(index, 11);//new main
    clockSDivs[index].style.left = '48vw';
    clockSDivs[index].style.color = 'rgba(var(--color-main), 1)';
    clockSDivs[index].style.fontSize = '3.75vw';
    clockSDivs[index].style.transform = 'scaleY(1.5) translateY(-0.50vh)';

    index = indexInc(index, 11);
    clockSDivs[index].style.left = '55.3vw';
    clockSDivs[index].style.color = 'rgba(var(--color-main), 0.9)';

    index = indexInc(index, 11);
    clockSDivs[index].style.left = '60.8vw';
    clockSDivs[index].style.color = 'rgba(var(--color-main), 0.75)';

    index = indexInc(index, 11);
    clockSDivs[index].style.left = '66.3vw';
    clockSDivs[index].style.color = 'rgba(var(--color-main), 0.6)';

    index = indexInc(index, 11);
    clockSDivs[index].style.left = '71.8vw';
    clockSDivs[index].style.color = 'rgba(var(--color-main), 0.45)';

    index = indexInc(index, 11);//temp fade in
    clockSDivs[index].style.left = '77.3vw';
    clockSDivs[index].style.color = 'rgba(var(--color-main), 0.3)';

    setTimeout(() => {
        let newValue = getNextClockValue(clockSDivs[index], 59);
        index = indexInc(index, 11);//move first to temp
        clockSDivs[index].style.left = '82.8vw';
        clockSDivs[index].textContent = newValue;
    }, 300);
}

function initializeClockDisplays(h, m, s) {
    let hour = parseInt(h, 10);
    let minute = parseInt(m, 10);
    let second = parseInt(s, 10);

    for (let i = 0; i < 8; i++) {
        let value = (hour - 4 + i + 24) % 24;
        clockHDivs[i].textContent = value.toString().padStart(2, '0');
    }

    for (let i = 0; i < 10; i++) {
        let value = (minute - 5 + i + 60) % 60;
        clockMDivs[i].textContent = value.toString().padStart(2, '0');
    }

    for (let i = 0; i < 12; i++) {
        let value = (second - 6 + i + 60) % 60;
        clockSDivs[i].textContent = value.toString().padStart(2, '0');
    }
}

function updateClock() {
    fetch("/api/time")
        .then(response => response.json())
        .then(data => {
            const [h, m, s] = data.time.split(":");
            if (!isInitialized) {
                initializeClockDisplays(h, m, s);
                fetchWeatherData().then(() => {fillWeatherBlocksFromHour(h); fillWeatherWeek(); setTimeout(() => {loadInlineSVGs();}, 10000);});
                
                isInitialized = true;
            }

            if (prevTime.h !== h) {
                hAnimation(indexH)
                indexH = indexInc(indexH, 7);
                if (h == 0) {
                    fetchDateInfo().then(setDateFace);
                    fetchWeatherData().then(() => {fillWeatherBlocksFromHour(h); fillWeatherWeek(); setTimeout(() => {loadInlineSVGs();}, 10000);});
                }else{
                    fillWeatherBlocksFromHour(h);
                    loadInlineSVGs();
                }
            }
            if (prevTime.m !== m) {
                mAnimation(indexM)
                indexM = indexInc(indexM, 9);
            }
            if (prevTime.s !== s) {
                sAnimation(indexS)
                indexS = indexInc(indexS, 11);
            }

            prevTime = {h, m, s};
        });
}
setInterval(updateClock, 20);

//---------------------------------------------------------------------------------------------------------------------
//-----------    Controlers    -----------
//---------------------------------------------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadButtonSignals();
    enableRemoteButtonActions();
    fetchDateInfo().then(setDateFace);
    
    const contPos = document.querySelector('.scroll-pos');
    const contMove = document.querySelector('.scroll-container');
    if (!contPos && !contMove) {
        return;
    }
    const rect = contPos.getBoundingClientRect();
    let pagePos = [0, -100, -200, -300];
    let page = 0;
    let isMouseDown = false;
    let startX;
    let pos;
    
    function pageSnap() {
        isMouseDown = false;
        contMove.style.transition = 'left 0.4s ease';
        if (pos - pagePos[page] < -25 && page < 3) {
            page++;
            contMove.style.left = pagePos[page] + 'vw';
        } else if (pos - pagePos[page] > 25 && page > 0) {
            page--;
            contMove.style.left = pagePos[page] + 'vw';
        } else {
            contMove.style.left = pagePos[page] + 'vw';
        }
        pos = pagePos[page];
    }
    contPos.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        contMove.style.transition = 'none';
        const relativeX = e.clientX - rect.left;        
        startX = (relativeX / rect.width) * 100;
    });
    
    contPos.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        const relativeX = e.clientX - rect.left;        
        const percentX = (relativeX / rect.width) * 100;
        pos = pagePos[page] + (startX - percentX) * -1;
        contMove.style.left = pos + 'vw';
    });
    
    contPos.addEventListener('mouseup', (e) => {
        pageSnap();
    });
    
    contPos.addEventListener('mouseleave', () => {
        pageSnap();
    });
    

    const settBtnPale1 = document.getElementById('setting-palets-1');
    const settBtnPale2 = document.getElementById('setting-palets-2');
    const settBtnPale3 = document.getElementById('setting-palets-3');
    const settBtnPale4 = document.getElementById('setting-palets-4');
    const settBtnPale5 = document.getElementById('setting-palets-5');
    const settBtnPale6 = document.getElementById('setting-palets-6');

    const settBtnFont1 = document.getElementById('setting-fonts-1');
    const settBtnFont2 = document.getElementById('setting-fonts-2');
    const settBtnFont3 = document.getElementById('setting-fonts-3');
    const settBtnFont4 = document.getElementById('setting-fonts-4');

    const settBtnLang1 = document.getElementById('setting-lang-lt');
    const settBtnLang2 = document.getElementById('setting-lang-en');

    const settBtnPriva = document.getElementById('setting-privacy-toggle');

    const sliderBrightness = document.getElementById('brightness-slider');
    const brightnessOverlay = document.querySelector('.screan-brightness');

    function setPaletSetting(r, g ,b) {
        root.style.setProperty('--color-dark',          `${r[0]}, ${g[0]}, ${b[0]}`);   
        root.style.setProperty('--color-dark-accent',   `${r[1]}, ${g[1]}, ${b[1]}`);   
        root.style.setProperty('--color-main',          `${r[2]}, ${g[2]}, ${b[2]}`); 
        root.style.setProperty('--color-light',         `${r[3]}, ${g[3]}, ${b[3]}`);
    }
    
    function applyColorPalette(index) {
        switch (index) {
            case 1:
                setPaletSetting([44, 63, 162, 220], [57, 79, 123, 215], [48, 68,  92, 201]);
            break;
            case 2:
                setPaletSetting([34, 49, 118, 238], [40, 54, 171, 238], [49, 63, 174, 238]);
            break;
            case 3:
                setPaletSetting([23, 68, 218, 237], [23, 68,   0, 237], [23, 68,  55, 237]);
            break;
            case 4:
                setPaletSetting([53,  92, 185, 250],[47,  84, 180, 240],[68, 112, 199, 230]);
            break;
            case 5:
                setPaletSetting([48, 58, 246, 238], [56, 71, 201, 238], [65, 80,  14, 238]);
            break;
            case 6:
                setPaletSetting([54, 39, 225, 246], [51, 33, 100, 233], [51, 33,  40, 233]);
            break;
            default:
                setPaletSetting([44, 63, 162, 220], [57, 79, 123, 215], [48, 68,  92, 201]);
                index = 1;
            break;
        }
        SETTINGS.palette = index;
        saveSettings();
    }
    function applyFont(index) {
        switch (index) {
            case 1:
                root.style.setProperty('--font', "'SpecialGothicExpanded', sans-serif");
            break;
            case 2:
                root.style.setProperty('--font', "'Exo2', sans-serif");
            break;
            case 3:
                root.style.setProperty('--font', "'RedHat', sans-serif");
            break;
            case 4:
                root.style.setProperty('--font', "'BebasNeue', sans-serif");
            break;
            default:
                root.style.setProperty('--font', "'SpecialGothicExpanded', sans-serif");
                index = 1;
            break;
        }
        SETTINGS.font = index;
        saveSettings();
    }
    function applyLanguage(index) {
        var lang = LANGUAGES[index];
        if (!lang) {
            index = 2;
            lang = LANGUAGES[index];
        }
        SETTINGS.language = index;
        saveSettings();

        document.querySelector(".settings-top-right").innerText = lang.settings;
        document.querySelector(".setting-name.palettes").innerText = lang.palettes;
        document.querySelector(".setting-name.fonts").innerText = lang.fonts;
        document.querySelectorAll(".setting.font").forEach(element => {element.innerText = lang.helloWorld;});
        document.querySelector(".setting-name.language").innerText = lang.language;
        document.querySelector(".setting-name.privacy").innerText = lang.privacy;
        document.querySelector(".setting-name.brightness").innerText = lang.brightness;
        document.querySelector(".setting.privacy-toggle").innerText = lang.voiceToggle;

        document.querySelector(".date-month-day").innerText = `${getMonthName(currentDateInfo.month)} ${currentDateInfo.day}`;

        document.querySelector(".w-r-name").innerText = lang.roomName;
        const roomLabels = document.querySelectorAll(".w-r-d-name");
        roomLabels[0].innerText = lang.temperatureLabel;
        roomLabels[1].innerText = lang.humidityLabel;

        const weekBlocks = document.querySelectorAll(".weather-week-day");
        for (let i = 0; i < weekBlocks.length; i++) {
            const block = weekBlocks[i];
            if (!block) continue;

            const dayNameDiv = block.querySelector(".w-w-name");
            if (!dayNameDiv) continue;

            let weekdayIndex = (currentDateInfo.weekday + i) % 7;
            if (weekdayIndex === 0) weekdayIndex = 7; 

            const weekdayName = getWeekdayName(weekdayIndex);
            dayNameDiv.textContent = weekdayName;
        }

        document.getElementById("song-search").placeholder = lang.songSearchPlaceholder;

        document.querySelector(".remote-btn-set-ir").innerText = lang.setIR;
        document.querySelector(".remote-btn-remove-ir").innerText = lang.removeIR;
    }
    function setPrivacy(index) {
        const micLine = document.querySelector(".mic-svg-line");
        micLine.style.opacity = `${index}`;
        
        const desiredState = index === 1;
        SETTINGS.privacy = index;
        saveSettings();
    
        fetch(`/set-voice?active=${desiredState}`)
            .then(res => res.json())
            .then(data => {
                updateVoiceToggleLabel(data.active);
            })
            .catch(error => {
                console.error("Nepavyko atnaujinti balso būsenos:", error);
            });
    }
    function updateSliderFill() {
        const value = parseFloat(sliderBrightness.value);

        const percent = ((value - sliderBrightness.min) / (sliderBrightness.max - sliderBrightness.min)) * 89 + 5;
        sliderBrightness.style.setProperty('--slider-fill', `${percent}%`);

        if (brightnessOverlay) {
            brightnessOverlay.style.backgroundColor = `rgba(0, 0, 0, ${1 - value})`;
        }
        SETTINGS.brightness = parseFloat(value);
        saveSettings();
    }
    sliderBrightness.addEventListener('input', updateSliderFill);
    function setBrightness(value) {
        const slider = document.getElementById('brightness-slider');
        const overlay = document.querySelector('.screan-brightness');
        
        if (!slider) return;
        slider.value = value;
        
        const percent = ((value - slider.min) / (slider.max - slider.min)) * 89 + 5;
        slider.style.setProperty('--slider-fill', `${percent}%`);
        
        if (overlay) {
            overlay.style.backgroundColor = `rgba(0, 0, 0, ${1 - value})`;
        }
    
        SETTINGS.brightness = parseFloat(value);
    }
    
    function loadSettings() {
        const saved = JSON.parse(localStorage.getItem('userSettings'));
    
        if (!saved) return;
    
        if (saved.palette !== undefined) {
            applyColorPalette(saved.palette);
        }
    
        if (saved.font !== undefined) {
            applyFont(saved.font);
        }
    
        if (saved.language !== undefined) {
            applyLanguage(saved.language);
        }

        if (saved.privacy !== undefined) {
            setPrivacy(saved.privacy);
        }

        if (saved.brightness !== undefined) {
            setBrightness(saved.brightness);
        }
    }

    settBtnPale1.addEventListener('click', () => {applyColorPalette(1)});
    settBtnPale2.addEventListener('click', () => {applyColorPalette(2)});
    settBtnPale3.addEventListener('click', () => {applyColorPalette(3)});
    settBtnPale4.addEventListener('click', () => {applyColorPalette(4)});
    settBtnPale5.addEventListener('click', () => {applyColorPalette(5)});
    settBtnPale6.addEventListener('click', () => {applyColorPalette(6)});

    settBtnFont1.addEventListener('click', () => {applyFont(1)});
    settBtnFont2.addEventListener('click', () => {applyFont(2)});
    settBtnFont3.addEventListener('click', () => {applyFont(3)});
    settBtnFont4.addEventListener('click', () => {applyFont(4)});

    settBtnLang1.addEventListener('click', () => {applyLanguage(1)});
    settBtnLang2.addEventListener('click', () => {applyLanguage(2)});

    settBtnPriva.addEventListener('click', () => {
        if (SETTINGS.privacy === 1) {
            setPrivacy(0);
        } else {
            setPrivacy(1);
        }
    });

    

    const settingsButton = document.getElementById('settings-btn');
   

    const settingsContainer = document.querySelector('.settings-container');
    var isSettingsOpen = false;
    settingsButton.addEventListener('click', () => {
        
        if (isSettingsOpen) {
            settingsContainer.style.height = '10vh';
            settingsContainer.style.width = '10vh';
        }else{
            settingsContainer.style.height = '100vh';
            settingsContainer.style.width = '40vw';
        }
        isSettingsOpen = !isSettingsOpen;
    });

    document.querySelectorAll('.setting-name').forEach(setting => {
        setting.addEventListener('click', () => {
          const optionsContainer = setting.nextElementSibling;
      
          if (!optionsContainer || !optionsContainer.classList.contains('setting-options-container')) return;
      
          const isOpen = optionsContainer.classList.contains('open');

          document.querySelectorAll('.setting-options-container').forEach(el => {
            el.classList.remove('open');
          });

          if (!isOpen) {
            optionsContainer.classList.add('open');
          }
        });
    });
    
    // svg
    // setTimeout(() => {
    //     loadInlineSVGs();
    // }, 20000);
});

//---------------------------------------------------------------------------------------------------------------------
//-----------    Youtube    -----------
//---------------------------------------------------------------------------------------------------------------------
var player;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        playerVars: {
            'autoplay': 1,
            'controls': 1,
            'listType': 'playlist',
            'list': 'PL9RbLPD-GileIbKvvy8-b-0ygUQggKUXS',
            'index': 0,
            'rel': 0
        },
        events: {
            'onReady': function (event) {
                btnInit();
                updateName();
            },
            'onStateChange': function (event) {
                if (event.data === YT.PlayerState.PLAYING) {
                    updateName();
                }
            }
        }
    });
}
function btnInit() {
    document.getElementById('play-pause-btn').addEventListener('click', () => {
        if (player.getPlayerState() === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    });
    
    document.getElementById('next-btn').addEventListener('click', () => {
        player.nextVideo();
    });

    document.getElementById('prev-btn').addEventListener('click', () => {
        player.previousVideo();
    });
    document.getElementById('search-btn').addEventListener('click', () => {
        findVideo();
    });
}
function updateName() {
    const videoInfo = player.getVideoData();
    const title = videoInfo.title;
    
    if (title) {
        document.getElementById('now-playing').innerText = `${title}`;
    }
}
function findVideo() {
    const ivestis = document.getElementById('song-search').value.trim();

    if (!ivestis) {
        return;
    }

    if (ivestis.includes("list=")) {
        const urlParams = new URLSearchParams(ivestis.split('?')[1]);
        const playlistId = urlParams.get('list');

        if (playlistId) {
            player.loadPlaylist({
                list: playlistId,
                listType: 'playlist',
                index: 0,
                suggestedQuality: 'large'
            });
        }
    } else if (ivestis.length === 34 && (ivestis.startsWith('PL') || ivestis.startsWith('UU') || ivestis.startsWith('RD') || ivestis.startsWith('OL'))) {
        player.loadPlaylist({
            list: ivestis,
            listType: 'playlist',
            index: 0,
            suggestedQuality: 'large'
        });
    } else {
        fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: ivestis })
        })
        .then(response => response.json())
        .then(data => {
            if (data.videoId) {
                player.loadVideoById(data.videoId);
            }
        })
        .catch(error => {
            console.error(error);
        });
    }
}

//---------------------------------------------------------------------------------------------------------------------
//-----------    Timer    -----------
//---------------------------------------------------------------------------------------------------------------------
let timerInterval = null;
let elapsedTime = 0;
let isRunning = false;

function updateTimerDisplay() {
    const timerElement = document.querySelector('.timer');
    const hours = String(Math.floor(elapsedTime / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((elapsedTime % 3600) / 60)).padStart(2, '0');
    const seconds = String(elapsedTime % 60).padStart(2, '0');

    timerElement.textContent = `${hours}:${minutes}:${seconds}`;
}
function startTimer() {
    if (isRunning) return;

    isRunning = true;
    timerInterval = setInterval(() => {
        elapsedTime++;
        updateTimerDisplay();
    }, 1000);
}
function pauseTimer() {
    if (!isRunning) return;

    isRunning = false;
    clearInterval(timerInterval);
}
function stopTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    elapsedTime = 0;
    updateTimerDisplay();
}

document.getElementById('start-btn').addEventListener('click', startTimer);
document.getElementById('pouse-btn').addEventListener('click', pauseTimer);
document.getElementById('stop-btn').addEventListener('click', stopTimer);

document.addEventListener('DOMContentLoaded', updateTimerDisplay);

//---------------------------------------------------------------------------------------------------------------------
//-----------    Sencors    -----------
//---------------------------------------------------------------------------------------------------------------------
function updateSensorDisplay() {
    fetch('/api/dht')
        .then(response => response.json())
        .then(data => {
            if (!data.error) {
                document.querySelector('.w-r-d-name:nth-child(1)').nextElementSibling.textContent = data.temperature + ' C°';
                document.querySelector('.w-r-d-name:nth-child(3)').nextElementSibling.textContent = data.humidity + ' %';
            } else {
                console.error(data.error);
            }
        })
        .catch(error => console.error('Klaida gaunant DHT duomenis:', error));
}

setInterval(() => {
    updateSensorDisplay()    
}, 1000);

//---------------------------------------------------------------------------------------------------------------------
//-----------    Voice animation    -----------
//---------------------------------------------------------------------------------------------------------------------
const screanVoice = document.querySelector('.screan-voice');

function triggerVoiceListen() {
    resetVoiceState();
    screanVoice.classList.add('listen', 'visible');
}

function endVoiceListen(success = true) {
    screanVoice.classList.remove('listen');
    screanVoice.classList.add(success ? 'success' : 'fail');
    setTimeout(() => {
        screanVoice.classList.remove('success', 'fail');
        screanVoice.classList.remove('visible');
        setTimeout(() => {
            resetVoiceState();
        }, 1000);
    }, 2000);
}

function resetVoiceState() {
    screanVoice.classList.remove('listen', 'success', 'fail', 'visible');
}

function listenForAnimationTriggers(){
    fetch("/animation-action")
        .then(res => res.json())
        .then(data => {
            const action = data.action;
            if (!action) return;

            switch (action) {
                // Animation triggers
                case "start_listen":    triggerVoiceListen();   break;
                case "command_success": endVoiceListen(true);   break;
                case "command_fail":    endVoiceListen(false);  break;
                default: 
                    console.log("[VOICE] Unrecognized command:", action);
            }

            fetch("/animation-action?action=null");
        })
        .catch(err => console.error("[VOICE] error:", err));
}
//---------------------------------------------------------------------------------------------------------------------
//-----------    Voice    -----------
//---------------------------------------------------------------------------------------------------------------------
function listenForVoiceActions(){
    fetch("/voice-action")
        .then(res => res.json())
        .then(data => {
            const action = data.action;

            if (!action) return;
                switch (action) {
                // Timer
                case "start_timer": startTimer();           break;
                case "pause_timer": pauseTimer();           break;
                case "stop_timer":  stopTimer();            break;

                // Youtube
                case "play_music":  player.playVideo();     break;
                case "pause_music": player.pauseVideo();    break;
                case "next_track":  player.nextVideo();     break;
                case "prev_track":  player.previousVideo(); break;

                // Buttons
                case "button_1":
                case "button_2":
                case "button_3":
                case "button_4":
                case "button_5":
                case "button_6":
                case "button_7":
                case "button_8":
                case "button_9":
                case "button_a1":
                case "button_a2":
                case "button_a3":
                case "button_a4":
                case "button_a5":
                    runCustomButton(action);
                break;

                default:
                    console.log("[VOICE] Unrecognized command:", action);
            }

            fetch("/voice-action?action=null");
        })
        .catch(err => console.error("[VOICE] error:", err));
}

setInterval(() => {
    listenForVoiceActions();
    listenForAnimationTriggers();    
}, 100);