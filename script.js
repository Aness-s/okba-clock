var prayerData = [];

// Polyfill for classList on old browsers
(function () {
  if (!document.createElement('div').classList) {
    Object.defineProperty(HTMLElement.prototype, 'classList', {
      get: function () {
        var self = this;
        return {
          add: function (c) { if (!self.className.match(new RegExp('(\\s|^)' + c + '(\\s|$)'))) self.className += ' ' + c; },
          remove: function (c) { self.className = self.className.replace(new RegExp('(\\s|^)' + c + '(\\s|$)', 'g'), ' ').trim(); },
          contains: function (c) { return !!self.className.match(new RegExp('(\\s|^)' + c + '(\\s|$)')); },
          toggle: function (c) { if (this.contains(c)) this.remove(c); else this.add(c); }
        };
      }
    });
  }
})();

// Polyfill for String.prototype.padStart
if (!String.prototype.padStart) {
  String.prototype.padStart = function (len, fill) {
    var s = String(this);
    fill = fill || ' ';
    while (s.length < len) s = fill + s;
    return s;
  };
}

// Polyfill for Array.prototype.find
if (!Array.prototype.find) {
  Array.prototype.find = function (fn) {
    for (var i = 0; i < this.length; i++) {
      if (fn(this[i], i, this)) return this[i];
    }
    return undefined;
  };
}

// Polyfill for Array.prototype.map (safety)
if (!Array.prototype.map) {
  Array.prototype.map = function (fn) {
    var result = [];
    for (var i = 0; i < this.length; i++) {
      result.push(fn(this[i], i, this));
    }
    return result;
  };
}

// requestAnimationFrame polyfill
var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || function (cb) { return setTimeout(cb, 16); };
var caf = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || function (id) { clearTimeout(id); };

// Load prayer times data via XMLHttpRequest
function loadPrayerData() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'prayer_times.json', true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200 || xhr.status === 0) {
        try {
          prayerData = JSON.parse(xhr.responseText);
          updateDisplay();
          setupChangeAlert();
        } catch (e) {
          console.error('Failed to parse prayer times:', e);
        }
      } else {
        console.error('Failed to load prayer times:', xhr.status);
      }
    }
  };
  xhr.send();
}

loadPrayerData();

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Format time from 24h "HH:MM" to 12h display
function formatTime12(timeStr) {
  if (!timeStr) return '\u2014';
  var parts = timeStr.split(':');
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var ampm = h >= 12 ? 'PM' : 'AM';
  var hour12 = h % 12 || 12;
  return hour12 + ':' + pad2(m) + ' ' + ampm;
}

// Parse "HH:MM" to today's Date object
function parseTimeToday(timeStr) {
  if (!timeStr) return null;
  var parts = timeStr.split(':');
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
}

function formatDateStr(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

function getDisplayData() {
  var now = new Date();
  var todayStr = formatDateStr(now);
  var todayData = prayerData.find(function (d) { return d.date === todayStr; });

  // After Isha iqama + 10 min, switch to tomorrow's times
  if (todayData && todayData.ishaIqama) {
    var ishaIqamaDate = parseTimeToday(todayData.ishaIqama);
    if (ishaIqamaDate) {
      ishaIqamaDate.setMinutes(ishaIqamaDate.getMinutes() + 10);
      if (now >= ishaIqamaDate) {
        var tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        var tomorrowStr = formatDateStr(tomorrow);
        var tomorrowData = prayerData.find(function (d) { return d.date === tomorrowStr; });
        if (tomorrowData) return tomorrowData;
      }
    }
  }

  return todayData;
}

function updateClock() {
  var now = new Date();
  var h = now.getHours();
  var m = now.getMinutes();
  var s = now.getSeconds();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  document.getElementById('clock').innerHTML =
    h + ':' + pad2(m) + '<span class="seconds">:' + pad2(s) + '</span> <span class="ampm">' + ampm + '</span>';
}

function updateDate() {
  var now = new Date();
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var dateStr = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
  document.getElementById('gregorianDate').textContent = dateStr;

  // Hijri date using Intl (with fallback)
  try {
    var hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    var hijriArFormatter = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    document.getElementById('hijriDate').textContent =
      hijriFormatter.format(now) + '  \u00B7  ' + hijriArFormatter.format(now);
  } catch (e) {
    document.getElementById('hijriDate').textContent = '';
  }
}

function updateDisplay() {
  var data = getDisplayData();
  if (!data) {
    console.warn('No prayer data for today');
    return;
  }

  document.getElementById('fajr-start').textContent = formatTime12(data.fajrStart);
  document.getElementById('fajr-iqama').textContent = formatTime12(data.fajrIqama);
  document.getElementById('sunrise-start').textContent = formatTime12(data.sunrise);
  document.getElementById('dhuhr-start').textContent = formatTime12(data.zuhrStart);
  document.getElementById('dhuhr-iqama').textContent = formatTime12(data.zuhrIqama);
  document.getElementById('asr-start').textContent = formatTime12(data.asrStart);
  document.getElementById('asr-iqama').textContent = formatTime12(data.asrIqama);
  document.getElementById('maghrib-start').textContent = formatTime12(data.maghribStart);
  document.getElementById('maghrib-iqama').textContent = formatTime12(data.maghribIqama);
  document.getElementById('isha-start').textContent = formatTime12(data.ishaStart);
  document.getElementById('isha-iqama').textContent = formatTime12(data.ishaIqama);
  document.getElementById('jumuah-start').textContent = formatTime12(data.zuhrStart);
  document.getElementById('jumuah-iqama').textContent = formatTime12(data.jummah1);

  document.getElementById('row-jumuah').style.display = '';

  updateNextPrayer(data);
}

function updateNextPrayer(data) {
  var now = new Date();
  var prayers = [
    { key: 'fajr',    name: 'Fajr',    time: data.fajrStart,    iqama: data.fajrIqama },
    { key: 'dhuhr',   name: 'Dhuhr',   time: data.zuhrStart,    iqama: data.zuhrIqama },
    { key: 'asr',     name: 'Asr',     time: data.asrStart,     iqama: data.asrIqama },
    { key: 'maghrib', name: 'Maghrib', time: data.maghribStart, iqama: data.maghribIqama },
    { key: 'isha',    name: 'Isha',    time: data.ishaStart,    iqama: data.ishaIqama }
  ];

  var rows = document.querySelectorAll('.prayer-row');
  for (var r = 0; r < rows.length; r++) {
    rows[r].classList.remove('active');
  }

  var nextPrayer = null;
  for (var i = 0; i < prayers.length; i++) {
    var iqamaTime = parseTimeToday(prayers[i].iqama);
    if (iqamaTime && iqamaTime > now) {
      nextPrayer = prayers[i];
      break;
    }
  }

  if (!nextPrayer) {
    document.getElementById('nextPrayerName').textContent = 'Fajr';
    var tomorrowFajr = parseTimeToday(data.fajrIqama);
    tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
    var diff = tomorrowFajr - now;
    document.getElementById('nextPrayerCountdown').textContent = formatCountdown(diff);
    document.getElementById('row-fajr').classList.add('active');
  } else {
    document.getElementById('nextPrayerName').textContent = nextPrayer.name;
    var iqTime = parseTimeToday(nextPrayer.iqama);
    var diff2 = iqTime - now;
    document.getElementById('nextPrayerCountdown').textContent = formatCountdown(diff2);
    document.getElementById('row-' + nextPrayer.key).classList.add('active');
  }
}

function formatCountdown(ms) {
  if (ms < 0) return '\u2014';
  var totalMin = Math.floor(ms / 60000);
  var hours = Math.floor(totalMin / 60);
  var mins = totalMin % 60;
  if (hours > 0) return hours + 'h ' + mins + 'm remaining';
  return mins + 'm remaining';
}

// Detect iqama time changes between today and tomorrow
function getIqamaChanges() {
  var now = new Date();
  var todayStr = formatDateStr(now);
  var tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  var tomorrowStr = formatDateStr(tomorrow);

  var todayData = prayerData.find(function (d) { return d.date === todayStr; });
  var tomorrowData = prayerData.find(function (d) { return d.date === tomorrowStr; });

  if (!todayData || !tomorrowData) return [];

  var fields = [
    { key: 'fajrIqama', name: 'Fajr' },
    { key: 'zuhrIqama', name: 'Dhuhr' },
    { key: 'asrIqama',  name: 'Asr' },
    { key: 'ishaIqama', name: 'Isha' }
  ];

  var changes = [];
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    if (todayData[f.key] !== tomorrowData[f.key]) {
      changes.push({ name: f.name, newTime: formatTime12(tomorrowData[f.key]) });
    }
  }
  return changes;
}

// Banner toggle state
var bannerAlertActive = false;
var bannerToggleTimeout = null;
var marqueeAnimId = null;

function stopMarquee() {
  if (marqueeAnimId) {
    caf(marqueeAnimId);
    marqueeAnimId = null;
  }
}

function showNextPrayerContent() {
  stopMarquee();
  var alertEl = document.getElementById('changeAlert');
  var contentEl = document.getElementById('nextPrayerContent');
  var bannerEl = document.getElementById('nextPrayerBanner');

  alertEl.classList.remove('visible');
  alertEl.style.cssText = alertEl.style.cssText.replace(/transform[^;]*;?/g, '');
  alertEl.style.left = '0';
  contentEl.classList.remove('hidden');
  bannerEl.classList.remove('alert-active');

  if (bannerAlertActive) {
    bannerToggleTimeout = setTimeout(showChangeAlert, 20000);
  }
}

function showChangeAlert() {
  stopMarquee();
  if (bannerToggleTimeout) {
    clearTimeout(bannerToggleTimeout);
    bannerToggleTimeout = null;
  }

  var alertEl = document.getElementById('changeAlert');
  var contentEl = document.getElementById('nextPrayerContent');
  var bannerEl = document.getElementById('nextPrayerBanner');

  contentEl.classList.add('hidden');
  bannerEl.classList.add('alert-active');

  // Start text at right edge of banner
  var bannerWidth = bannerEl.offsetWidth;
  var pos = bannerWidth;
  alertEl.style.left = pos + 'px';
  alertEl.classList.add('visible');

  var speed = 0.15; // pixels per ms
  var lastTime = null;

  function step(timestamp) {
    if (!lastTime) lastTime = timestamp;
    var dt = timestamp - lastTime;
    lastTime = timestamp;
    pos -= speed * dt;

    alertEl.style.left = pos + 'px';

    var textWidth = alertEl.scrollWidth;
    if (pos < -textWidth) {
      showNextPrayerContent();
      return;
    }
    marqueeAnimId = raf(step);
  }

  marqueeAnimId = raf(step);
}

function setupChangeAlert() {
  var changes = getIqamaChanges();
  var alertEl = document.getElementById('changeAlert');
  var contentEl = document.getElementById('nextPrayerContent');
  var bannerEl = document.getElementById('nextPrayerBanner');

  if (changes.length === 0) {
    stopMarquee();
    alertEl.classList.remove('visible');
    alertEl.style.left = '0';
    contentEl.classList.remove('hidden');
    bannerEl.classList.remove('alert-active');
    if (bannerToggleTimeout) {
      clearTimeout(bannerToggleTimeout);
      bannerToggleTimeout = null;
    }
    bannerAlertActive = false;
    return;
  }

  var parts = changes.map(function (c) { return c.name + ' Iqama will be at ' + c.newTime; });
  alertEl.textContent = 'From tomorrow:  ' + parts.join('   \u00B7   ');

  if (!bannerAlertActive) {
    bannerAlertActive = true;
    showChangeAlert();
  }
}

// Initial setup
updateClock();
updateDate();

// Update clock every second
setInterval(updateClock, 1000);

// Update prayer times and next prayer every 30 seconds
setInterval(function () {
  updateDisplay();
  updateDate();
  setupChangeAlert();
}, 30000);

function toggleFullscreen() {
  var el = document.documentElement;
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}
