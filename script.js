var prayerData = [];

// ── Eid Mode ──
// Set to true to enable the Eid Mubarak theme
var EID_MODE = false;

(function () {
  if (!EID_MODE) return;

  // Add eid-theme class to body
  document.body.className = 'eid-theme';

  // Create Eid banner element
  var banner = document.createElement('div');
  banner.className = 'eid-banner';
  banner.innerHTML = '<div class="eid-banner-inner">' +
    '<span class="eid-star">&#9733;</span>' +
    '<span class="eid-text-ar">\u0639\u064A\u062F \u0645\u0628\u0627\u0631\u0643</span>' +
    '<span class="eid-dot">\u00B7</span>' +
    '<span class="eid-text-en">Eid Mubarak</span>' +
    '<span class="eid-star">&#9733;</span>' +
    '</div>';

  // Insert after header (before divider)
  var container = document.querySelector('.container');
  var header = document.querySelector('.header');
  if (container && header && header.nextSibling) {
    container.insertBefore(banner, header.nextSibling);
  }

  // Hide the next prayer banner to free up space
  var nextBanner = document.getElementById('nextPrayerBanner');
  if (nextBanner) nextBanner.style.display = 'none';
})();

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

// Compute adhan time: iqama - 10 minutes, or beginsStr for maghrib
function computeAdhanTime(iqamaStr, isMaghrib, beginsStr) {
  if (isMaghrib) return beginsStr;
  if (!iqamaStr) return null;
  var parts = iqamaStr.split(':');
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  m -= 10;
  if (m < 0) {
    m += 60;
    h -= 1;
    if (h < 0) h = 23;
  }
  return pad2(h) + ':' + pad2(m);
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

  // Compute adhan times
  var fajrAdhan = computeAdhanTime(data.fajrIqama, false, null);
  var dhuhrAdhan = computeAdhanTime(data.zuhrIqama, false, null);
  var asrAdhan = computeAdhanTime(data.asrIqama, false, null);
  var maghribAdhan = computeAdhanTime(data.maghribIqama, true, data.maghribStart);
  var ishaAdhan = computeAdhanTime(data.ishaIqama, false, null);
  var jumuahAdhan = computeAdhanTime(data.jummah1, false, null);

  // Set adhan times
  document.getElementById('fajr-adhan').textContent = formatTime12(fajrAdhan);
  document.getElementById('dhuhr-adhan').textContent = formatTime12(dhuhrAdhan);
  document.getElementById('asr-adhan').textContent = formatTime12(asrAdhan);
  document.getElementById('maghrib-adhan').textContent = formatTime12(maghribAdhan);
  document.getElementById('isha-adhan').textContent = formatTime12(ishaAdhan);
  document.getElementById('jumuah-adhan').textContent = formatTime12(jumuahAdhan);

  // Set prayer times
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

// ── Adhan / Iqama Overlay Logic ──

var currentOverlay = 'none'; // 'none', 'adhan', 'iqama'

var arabicNames = {
  'Fajr': '\u0627\u0644\u0641\u062C\u0631',
  'Dhuhr': '\u0627\u0644\u0638\u0647\u0631',
  'Asr': '\u0627\u0644\u0639\u0635\u0631',
  'Maghrib': '\u0627\u0644\u0645\u063A\u0631\u0628',
  'Isha': '\u0627\u0644\u0639\u0634\u0627\u0621'
};

function showAdhanOverlay(nameEn, nameAr) {
  if (currentOverlay === 'adhan') return;
  currentOverlay = 'adhan';

  document.getElementById('adhanPrayerName').textContent = nameEn;
  document.getElementById('adhanPrayerArabic').textContent = nameAr;

  document.getElementById('nextPrayerBanner').style.display = 'none';
  document.getElementById('prayerGrid').style.display = 'none';
  document.getElementById('adhanOverlay').style.display = '';
  document.getElementById('iqamaOverlay').style.display = 'none';
}

function showIqamaOverlay() {
  if (currentOverlay === 'iqama') return;
  currentOverlay = 'iqama';

  document.getElementById('nextPrayerBanner').style.display = 'none';
  document.getElementById('prayerGrid').style.display = 'none';
  document.getElementById('adhanOverlay').style.display = 'none';
  document.getElementById('iqamaOverlay').style.display = '';
}

function hideOverlays() {
  if (currentOverlay === 'none') return;
  currentOverlay = 'none';

  document.getElementById('nextPrayerBanner').style.display = '';
  document.getElementById('prayerGrid').style.display = '';
  document.getElementById('adhanOverlay').style.display = 'none';
  document.getElementById('iqamaOverlay').style.display = 'none';
}

function checkAdhanIqama() {
  var data = getDisplayData();
  if (!data) return;

  var now = new Date();
  var nowMs = now.getTime();

  var prayers = [
    { name: 'Fajr',    iqama: data.fajrIqama,    begins: data.fajrStart,    isMaghrib: false },
    { name: 'Dhuhr',   iqama: data.zuhrIqama,     begins: data.zuhrStart,    isMaghrib: false },
    { name: 'Asr',     iqama: data.asrIqama,      begins: data.asrStart,     isMaghrib: false },
    { name: 'Maghrib', iqama: data.maghribIqama,   begins: data.maghribStart, isMaghrib: true },
    { name: 'Isha',    iqama: data.ishaIqama,      begins: data.ishaStart,    isMaghrib: false }
  ];

  var ADHAN_DURATION = 2 * 60 * 1000;  // 2 minutes
  var IQAMA_DURATION = 8 * 60 * 1000;  // 8 minutes

  // Check iqama first (takes priority)
  for (var i = 0; i < prayers.length; i++) {
    var p = prayers[i];
    var iqamaDate = parseTimeToday(p.iqama);
    if (iqamaDate) {
      var iqamaMs = iqamaDate.getTime();
      if (nowMs >= iqamaMs && nowMs < iqamaMs + IQAMA_DURATION) {
        showIqamaOverlay();
        return;
      }
    }
  }

  // Check adhan
  for (var j = 0; j < prayers.length; j++) {
    var pr = prayers[j];
    var adhanStr = computeAdhanTime(pr.iqama, pr.isMaghrib, pr.begins);
    var adhanDate = parseTimeToday(adhanStr);
    if (adhanDate) {
      var adhanMs = adhanDate.getTime();
      // Adhan window: from adhan time until iqama time (or 2 min, whichever is shorter)
      var iqamaDate2 = parseTimeToday(pr.iqama);
      var adhanEnd = iqamaDate2 ? Math.min(adhanMs + ADHAN_DURATION, iqamaDate2.getTime()) : adhanMs + ADHAN_DURATION;
      if (nowMs >= adhanMs && nowMs < adhanEnd) {
        var arName = arabicNames[pr.name] || '';
        showAdhanOverlay(pr.name, arName);
        return;
      }
    }
  }

  // No active overlay
  hideOverlays();
}

// Initial setup
updateClock();
updateDate();

// Update clock and check overlays every second
setInterval(function () {
  updateClock();
  checkAdhanIqama();
}, 1000);

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
