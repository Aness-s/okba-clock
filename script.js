let prayerData = [];

// Load prayer times data
fetch('prayer_times.json')
  .then(r => r.json())
  .then(data => {
    prayerData = data;
    updateDisplay();
    setupChangeAlert();
  })
  .catch(err => console.error('Failed to load prayer times:', err));

// Format time from 24h "HH:MM" to 12h display
function formatTime12(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Parse "HH:MM" to today's Date object
function parseTimeToday(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
}

function formatDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function getDisplayData() {
  const now = new Date();
  const todayStr = formatDateStr(now);
  const todayData = prayerData.find(d => d.date === todayStr);

  // After Isha iqama + 10 min, switch to tomorrow's times
  if (todayData && todayData.ishaIqama) {
    const ishaIqamaDate = parseTimeToday(todayData.ishaIqama);
    if (ishaIqamaDate) {
      ishaIqamaDate.setMinutes(ishaIqamaDate.getMinutes() + 10);
      if (now >= ishaIqamaDate) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = formatDateStr(tomorrow);
        const tomorrowData = prayerData.find(d => d.date === tomorrowStr);
        if (tomorrowData) return tomorrowData;
      }
    }
  }

  return todayData;
}

function updateClock() {
  const now = new Date();
  let h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  document.getElementById('clock').innerHTML =
    `${h}:${String(m).padStart(2,'0')}<span class="seconds">:${String(s).padStart(2,'0')}</span> <span class="ampm">${ampm}</span>`;
}

function updateDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('gregorianDate').textContent = now.toLocaleDateString('en-US', options);

  // Hijri date using Intl
  try {
    const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const hijriArFormatter = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    document.getElementById('hijriDate').textContent =
      hijriFormatter.format(now) + '  ·  ' + hijriArFormatter.format(now);
  } catch(e) {
    document.getElementById('hijriDate').textContent = '';
  }
}

function updateDisplay() {
  const data = getDisplayData();
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
  const now = new Date();
  const prayers = [
    { key: 'fajr',    name: 'Fajr',    time: data.fajrStart,    iqama: data.fajrIqama },
    { key: 'dhuhr',   name: 'Dhuhr',   time: data.zuhrStart,    iqama: data.zuhrIqama },
    { key: 'asr',     name: 'Asr',     time: data.asrStart,     iqama: data.asrIqama },
    { key: 'maghrib', name: 'Maghrib', time: data.maghribStart, iqama: data.maghribIqama },
    { key: 'isha',    name: 'Isha',    time: data.ishaStart,    iqama: data.ishaIqama },
  ];

  document.querySelectorAll('.prayer-row').forEach(r => r.classList.remove('active'));

  let nextPrayer = null;
  for (const p of prayers) {
    const iqamaTime = parseTimeToday(p.iqama);
    if (iqamaTime && iqamaTime > now) {
      nextPrayer = p;
      break;
    }
  }

  if (!nextPrayer) {
    document.getElementById('nextPrayerName').textContent = 'Fajr';
    const tomorrowFajr = parseTimeToday(data.fajrIqama);
    tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
    const diff = tomorrowFajr - now;
    document.getElementById('nextPrayerCountdown').textContent = formatCountdown(diff);
    document.getElementById('row-fajr').classList.add('active');
  } else {
    document.getElementById('nextPrayerName').textContent = nextPrayer.name;
    const iqamaTime = parseTimeToday(nextPrayer.iqama);
    const diff = iqamaTime - now;
    document.getElementById('nextPrayerCountdown').textContent = formatCountdown(diff);
    document.getElementById(`row-${nextPrayer.key}`).classList.add('active');
  }
}

function formatCountdown(ms) {
  if (ms < 0) return '—';
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

// Detect iqama time changes between today and tomorrow
function getIqamaChanges() {
  const now = new Date();
  const todayStr = formatDateStr(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateStr(tomorrow);

  const todayData = prayerData.find(d => d.date === todayStr);
  const tomorrowData = prayerData.find(d => d.date === tomorrowStr);

  if (!todayData || !tomorrowData) return [];

  const fields = [
    { key: 'fajrIqama', name: 'Fajr' },
    { key: 'zuhrIqama', name: 'Dhuhr' },
    { key: 'asrIqama',  name: 'Asr' },
    { key: 'ishaIqama', name: 'Isha' },
  ];

  const changes = [];
  for (const f of fields) {
    if (todayData[f.key] !== tomorrowData[f.key]) {
      changes.push({ name: f.name, newTime: formatTime12(tomorrowData[f.key]) });
    }
  }
  return changes;
}

// Banner toggle state
let bannerAlertActive = false;
let bannerToggleTimeout = null;
let marqueeAnimId = null;

function stopMarquee() {
  if (marqueeAnimId) {
    cancelAnimationFrame(marqueeAnimId);
    marqueeAnimId = null;
  }
}

function showNextPrayerContent() {
  stopMarquee();
  const alertEl = document.getElementById('changeAlert');
  const contentEl = document.getElementById('nextPrayerContent');
  const bannerEl = document.getElementById('nextPrayerBanner');

  alertEl.classList.remove('visible');
  alertEl.style.transform = '';
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

  const alertEl = document.getElementById('changeAlert');
  const contentEl = document.getElementById('nextPrayerContent');
  const bannerEl = document.getElementById('nextPrayerBanner');

  contentEl.classList.add('hidden');
  bannerEl.classList.add('alert-active');

  // Start text at right edge of banner
  const bannerWidth = bannerEl.offsetWidth;
  let pos = bannerWidth;
  alertEl.style.transform = `translateX(${pos}px)`;
  alertEl.classList.add('visible');

  const speed = 0.15; // pixels per ms
  let lastTime = null;

  function step(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    pos -= speed * dt;

    alertEl.style.transform = `translateX(${pos}px)`;

    const textWidth = alertEl.scrollWidth;
    if (pos < -textWidth) {
      showNextPrayerContent();
      return;
    }
    marqueeAnimId = requestAnimationFrame(step);
  }

  marqueeAnimId = requestAnimationFrame(step);
}

function setupChangeAlert() {
  const changes = getIqamaChanges();
  const alertEl = document.getElementById('changeAlert');
  const contentEl = document.getElementById('nextPrayerContent');
  const bannerEl = document.getElementById('nextPrayerBanner');

  if (changes.length === 0) {
    stopMarquee();
    alertEl.classList.remove('visible');
    alertEl.style.transform = '';
    contentEl.classList.remove('hidden');
    bannerEl.classList.remove('alert-active');
    if (bannerToggleTimeout) {
      clearTimeout(bannerToggleTimeout);
      bannerToggleTimeout = null;
    }
    bannerAlertActive = false;
    return;
  }

  const parts = changes.map(c => `${c.name} Iqama will be at ${c.newTime}`);
  alertEl.textContent = 'From tomorrow:  ' + parts.join('   ·   ');

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
setInterval(() => {
  updateDisplay();
  updateDate();
  setupChangeAlert();
}, 30000);

function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen).call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen).call(document);
  }
}
