// ============================================================================
// STATO GLOBALE
// ============================================================================
let IS_AUTH = false;

let LIVE_PROFILE = {
  training_days: 3,
  training_schedule: [1, 3, 5], // Default: Lun, Mer, Ven
  primary_goal: "hypertrophy",
  equipment: "full",
  stress_level: 5,
  injuries: []
};


// ============================================================================
// APP LOGIC
// ============================================================================


// ============================================================================
// STATO AUTENTICAZIONE
// ============================================================================
let IS_LOGIN_MODE = true;

// ============================================================================
// TOGGLE AUTH MODE
// ============================================================================
window.toggleAuthMode = () => {
  IS_LOGIN_MODE = !IS_LOGIN_MODE;

  const subtitle = document.getElementById("auth-subtitle");
  const btnText = document.getElementById("auth-btn-text");
  const toggleText = document.getElementById("toggle-text");
  const toggleBtnText = document.getElementById("toggle-btn-text");

  if (IS_LOGIN_MODE) {
    subtitle.textContent = "INSERISCI LE TUE CREDENZIALI DI ACCESSO";
    btnText.textContent = "ACCEDI AL SISTEMA";
    toggleText.textContent = "Non hai un account?";
    toggleBtnText.textContent = "REGISTRATI";
  } else {
    subtitle.textContent = "CREA UN NUOVO ACCOUNT NEURAL";
    btnText.textContent = "REGISTRA ACCOUNT";
    toggleText.textContent = "Hai già un account?";
    toggleBtnText.textContent = "ACCEDI";
  }

  document.getElementById("auth-error").classList.add("hidden");
};

// ============================================================================
// AUTENTICAZIONE
// ============================================================================
window.handleAuth = async () => {
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("pass");
  const errorDiv = document.getElementById("auth-error");

  const email = emailInput.value.trim();
  const pass = passInput.value.trim();

  if (!email || !pass) {
    showError("Inserisci email e password");
    return;
  }

  if (pass.length < 6) {
    showError("La password deve essere di almeno 6 caratteri");
    return;
  }

  const btn = document.getElementById("auth-btn");
  btn.disabled = true;
  btn.innerHTML = '<span>ELABORAZIONE...</span>';

  try {
    let result;

    if (IS_LOGIN_MODE) {
      result = await sb.auth.signInWithPassword({ email, password: pass });
    } else {
      result = await sb.auth.signUp({
        email,
        password: pass,
        options: { emailRedirectTo: window.location.origin }
      });

      if (result.data?.user && !result.error && !result.data.session) {
        showError("✓ Account creato! Conferma l'email per accedere.", "success");
        setTimeout(() => {
          toggleAuthMode();
        }, 3000);
        return;
      }

      // After successful registration with session, go to onboarding
      if (result.data?.session && !IS_LOGIN_MODE) {
        console.log("✅ Registrazione completata, redirect a onboarding...");
        window.location.href = 'onboarding.html';
        return;
      }
    }

    if (result.error) throw result.error;

    if (result.data?.session) {
      loginSuccess();
    }

  } catch (error) {
    console.error("❌ Errore autenticazione:", error);
    console.error("Dettagli errore:", {
      message: error.message,
      status: error.status,
      name: error.name
    });
    showError(translateError(error.message));
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>${IS_LOGIN_MODE ? "ACCEDI AL SISTEMA" : "REGISTRA ACCOUNT"}</span>`;
  }
};

function translateError(msg) {
  if (msg.includes("Invalid login credentials")) return "❌ Email o password errati";
  if (msg.includes("Email not confirmed")) return "❌ Conferma la tua email prima";
  if (msg.includes("already registered")) return "❌ Account già esistente";
  return "❌ " + msg;
}

async function loginSuccess() {
  console.log("✅ Login successful!");
  IS_AUTH = true;

  // Check if user has completed onboarding
  const { data: { user } } = await sb.auth.getUser();

  if (user) {
    const { data: profile, error } = await sb
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    if (error || !profile || !profile.onboarding_completed) {
      // Redirect to onboarding (ONLY IF NOT ALREADY THERE)
      if (!window.location.pathname.includes('onboarding.html')) {
        console.log('📝 Onboarding non completato, redirect...');
        window.location.href = 'onboarding.html';
        return;
      } else {
        console.log('📝 Già su onboarding.html, resto qui.');
        // If we are on onboarding, we don't need to do the rest of script.js UI logic 
        // as onboarding.html has its own structure.
        return;
      }
    }

    console.log('✅ Onboarding completato, caricamento dashboard...');
  }

  // UI Setup for index.html
  const authScreen = document.getElementById("screen-auth");
  const sidebar = document.getElementById("sidebar");

  if (authScreen) authScreen.classList.add("hidden");
  if (sidebar) sidebar.classList.remove("hidden");

  // Set global auth state
  IS_AUTH = true;

  if (typeof nav === 'function') nav("dashboard");
  await loadProfile();
}

function showError(message, type = "error") {
  const errorDiv = document.getElementById("auth-error");
  errorDiv.textContent = message;
  errorDiv.classList.remove("hidden");
  errorDiv.style.color = type === "success" ? "var(--success)" : "var(--danger)";
  errorDiv.style.borderColor = type === "success" ? "var(--success)" : "var(--danger)";
}

// ============================================================================
// LOGOUT
// ============================================================================
window.logoutUser = async () => {
  if (!confirm("Sei sicuro di voler uscire?")) return;
  await sb.auth.signOut();
  location.reload();
};

// ============================================================================
// NAVIGAZIONE
// ============================================================================
window.nav = (id) => {
  if (!IS_AUTH) return;
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  const target = document.getElementById(`screen-${id}`);
  if (target) target.classList.remove("hidden");

  document.querySelectorAll(".n-link").forEach((n) => n.classList.remove("active"));
  const activeNav = document.querySelector(`[data-nav="${id}"]`);
  if (activeNav) activeNav.classList.add("active");

  if (id === "dashboard") applyStats();
  if (id === "workout") renderWorkout();
  if (id === "calendar") renderCalendar();
  if (id === "today") renderToday();
  if (id === "stats") refreshStats();
};

// ============================================================================
// STATISTICHE AVANZATE (SUPABASE + CHART.JS)
// ============================================================================
async function refreshStats() {
  console.log("📊 Aggiornamento statistiche avanzate...");

  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    // 1. Fetch data
    const { data: sessions } = await sb.from('workout_sessions').select('*, exercise_logs(*)').eq('user_id', user.id);

    if (!sessions) return;

    // 2. Aggregate metrics
    const totalWorkouts = sessions.length;
    let totalVolume = 0;
    const muscleMap = {};

    sessions.forEach(s => {
      s.exercise_logs?.forEach(log => {
        // Simple volume: sets * (avg reps) * (placeholder weight 20kg if 0)
        const vol = (log.sets || 0) * (log.reps?.[0] || 0) * (log.weight?.[0] || 20);
        totalVolume += vol;

        const m = log.muscle_group || "Altro";
        muscleMap[m] = (muscleMap[m] || 0) + 1;
      });
    });

    // 3. Update UI counters
    document.getElementById("stat-total-workouts").textContent = totalWorkouts;
    document.getElementById("stat-total-volume").textContent = `${Math.round(totalVolume / 1000)}k KG`;
    document.getElementById("stat-sessions").innerText = LIVE_PROFILE.total_sessions || "0";
    
    // Inizializza le nuove funzioni Neurali
    initNeuralDashboard(LIVE_PROFILE);
    calculateNeuralRank(LIVE_PROFILE);
    document.getElementById("stat-avg-weekly").textContent = (totalWorkouts / 4).toFixed(1); // Rough estimate

    // 4. Init Charts
    initCharts(sessions, muscleMap);

  } catch (e) {
    console.error("Errore refresh stats:", e);
  }
}

let volumeChart = null;
let muscleChart = null;

function initCharts(sessions, muscleMap) {
  const volCtx = document.getElementById('frequency-chart'); // Using existing ID for volume chart
  const muscleCtx = document.getElementById('progression-chart'); // Using existing ID for muscle split

  if (!volCtx) return;

  // Volume Chart Data (Last 7 sessions)
  const lastSessions = sessions.slice(-7);
  const labels = lastSessions.map(s => s.date.split('-').slice(1).join('/'));
  const volumes = lastSessions.map(s => {
    let v = 0;
    s.exercise_logs?.forEach(l => v += (l.sets * (l.reps?.[0] || 0) * 20));
    return v;
  });

  if (volumeChart) volumeChart.destroy();
  volumeChart = new Chart(volCtx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Volume Allenamento (kg)',
        data: volumes,
        borderColor: '#00f2ff',
        backgroundColor: 'rgba(0, 242, 255, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
        x: { grid: { display: false }, ticks: { color: '#888' } }
      }
    }
  });

  // Muscle Distribution Chart
  const mLabels = Object.keys(muscleMap);
  const mData = Object.values(muscleMap);

  if (muscleChart) muscleChart.destroy();
  muscleChart = new Chart(muscleCtx, {
    type: 'radar',
    data: {
      labels: mLabels,
      datasets: [{
        label: 'Focus Muscolare',
        data: mData,
        backgroundColor: 'rgba(255, 0, 255, 0.2)',
        borderColor: '#ff00ff',
        pointBackgroundColor: '#ff00ff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          angleLines: { color: 'rgba(255,255,255,0.1)' },
          grid: { color: 'rgba(255,255,255,0.1)' },
          pointLabels: { color: '#888', font: { size: 10 } },
          ticks: { display: false }
        }
      }
    }
  });
}

// ============================================================================
// PROFESSIONAL CALENDAR LOGIC
// ============================================================================
let currentCalendarDate = new Date();

window.changeMonth = (delta) => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
  renderCalendar();
};

async function renderCalendar() {
  const grid = document.querySelector(".calendar-grid");
  const title = document.getElementById("calendar-month-year");
  if (!grid || !title) return;

  // Clear existing days (keep weekdays for now, re-append after fetch)
  grid.innerHTML = "";

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  // Set title
  const monthNames = ["GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO",
    "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE"];
  title.textContent = `${monthNames[month]} ${year}`;

  // Get date info
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0).toISOString();

  const { data: sessions, error } = await sb
    .from('workout_sessions')
    .select('*, workout_plans(*), exercise_logs(*)')
    .gte('date', startDate.split('T')[0])
    .lte('date', endDate.split('T')[0]);

  // Create empty slots for first week
  const weekdaysStr = `
    <div class="calendar-weekday">SUN</div>
    <div class="calendar-weekday">MON</div>
    <div class="calendar-weekday">TUE</div>
    <div class="calendar-weekday">WED</div>
    <div class="calendar-weekday">THU</div>
    <div class="calendar-weekday">FRI</div>
    <div class="calendar-weekday">SAT</div>
  `;
  grid.innerHTML = weekdaysStr;

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    grid.appendChild(empty);
  }

  // Create days
  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day";

    if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) {
      dayDiv.classList.add("today");
    }

    // Check if there are sessions on this day
    const daySessions = sessions?.filter(s => {
      const sDate = new Date(s.date);
      return sDate.getDate() === d;
    }) || [];

    dayDiv.innerHTML = `<span class="day-num">${d}</span>`;

    const projectedIndex = isProjectedTrainingDay(year, month, d);
    if (daySessions.length > 0) {
      dayDiv.classList.add("has-workout");
      dayDiv.innerHTML += `<div class="day-indicator workout"></div>`;
    } else if (projectedIndex) {
      dayDiv.classList.add("projected-workout");
      dayDiv.innerHTML += `<div class="day-indicator projected"></div>`;
    }

    dayDiv.onclick = () => selectCalendarDay(d, daySessions);
    grid.appendChild(dayDiv);
  }
}

function isProjectedTrainingDay(y, m, d) {
  const date = new Date(y, m, d);
  const dayOfWeek = date.getDay(); // 0=Sun
  const schedule = LIVE_PROFILE.training_schedule || [];

  if (schedule.length > 0) {
    const index = schedule.indexOf(dayOfWeek);
    return index !== -1 ? index + 1 : null;
  }

  // Fallback to frequency-based if no manual schedule
  const freq = parseInt(LIVE_PROFILE.training_days) || 3;
  const schedules = {
    2: [2, 4], // Mar, Gio
    3: [1, 3, 5], // Lun, Mer, Ven
    4: [1, 2, 4, 5], // Lun, Mar, Gio, Ven
    5: [1, 2, 3, 4, 5], // Feriali
    6: [1, 2, 3, 4, 5, 6] // Lun-Sab
  };

  const days = schedules[freq] || [];
  const index = days.indexOf(dayOfWeek);
  return index !== -1 ? index + 1 : null;
}

function selectCalendarDay(dayNum, sessions) {
  // UI selection
  document.querySelectorAll(".calendar-day").forEach(d => d.classList.remove("selected"));
  const clicked = Array.from(document.querySelectorAll(".calendar-day")).find(d =>
    !d.classList.contains("empty") && d.querySelector(".day-num").textContent == dayNum
  );
  if (clicked) clicked.classList.add("selected");

  const nameEl = document.getElementById("selected-day-name");
  const dateEl = document.getElementById("selected-day-date");
  const contentEl = document.getElementById("day-history-content");

  const date = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), dayNum);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

  nameEl.textContent = date.toLocaleDateString('it-IT', { weekday: 'long' }).toUpperCase();
  dateEl.textContent = date.toLocaleDateString('it-IT', options);

  if (sessions.length === 0) {
    contentEl.innerHTML = `
      <div class="empty-selection">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
        </svg>
        <p>Giorno di recupero. Nessuna attività registrata.</p>
      </div>
    `;
    return;
  }

  contentEl.innerHTML = sessions.map(s => `
    <div class="history-item">
      <div class="history-item-header">
        <div>
          <span class="history-exercise-name">${s.workout_plans?.name || 'Sessione Personalizzata'}</span>
          <span class="history-volume">${s.duration_minutes || '--'} MIN</span>
        </div>
        <button class="btn-delete-session" onclick="deleteWorkoutSession('${s.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          CANCELLA
        </button>
      </div>
      <div class="history-details">
        ${s.exercise_logs?.map(log => {
    const weights = log.weight || [0];
    const reps = log.reps || [0];
    let detailStr = "";
    for (let i = 0; i < log.sets; i++) {
      detailStr += `Set ${i + 1}: ${weights[i] || weights[0]}kg x ${reps[i] || reps[0]} | `;
    }
    return `<div>• <b>${log.exercise_name}</b><br><small>${detailStr.slice(0, -3)}</small></div>`;
  }).join('') || 'Nessun log esercizi salvato'}
      </div>
    </div>
  `).join('');
}

window.deleteWorkoutSession = async (id) => {
  if (!confirm("Sei sicuro di voler eliminare questo allenamento? Questa azione è irreversibile.")) return;

  try {
    const { error } = await sb.from('workout_sessions').delete().eq('id', id);
    if (error) throw error;

    alert("Sessione eliminata con successo. 🗑️");
    renderCalendar();
    refreshStats();
  } catch (e) {
    console.error("Errore eliminazione sessione:", e);
    alert("Errore durante l'eliminazione.");
  }
};

// ============================================================================
// DASHBOARD & PROFILO
// ============================================================================
async function loadProfile() {
  console.log("👤 Caricamento profilo...");

  // 1. Fallback immediato da LocalStorage
  const saved = localStorage.getItem('neurocoach_profile');
  if (saved) {
    try {
      LIVE_PROFILE = { ...LIVE_PROFILE, ...JSON.parse(saved) };
    } catch (e) { }
  }

  // 2. Fetch da Supabase
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        // Mappa campi se necessario (legacy support)
        if (profile.goal && !profile.primary_goal) profile.primary_goal = profile.goal;
        if (profile.equip && !profile.equipment) profile.equipment = profile.equip;

        // Aggiorna cache e carica dashboard
        LIVE_PROFILE = profile;
        localStorage.setItem('neurocoach_profile', JSON.stringify(LIVE_PROFILE));
        
        // Check-in Giornaliero
        checkDailySync();
        
        nav('dashboard');
        applyStats();
      }
    }
  } catch (err) {
    console.error("❌ Errore caricamento profilo Supabase:", err);
    showError("Errore applicazione profilo: " + err.message);
  }
}

async function checkDailySync() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split('T')[0];
  
  // Controlla se esiste già un check-in per oggi
  const { data: checkin } = await sb
    .from('daily_checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single();

  if (!checkin) {
    // Apri il modal
    document.getElementById("modal-check-in").classList.remove("hidden");
    playNeuralSound('timer_start');
  } else {
    // Usa i dati del check-in per il Readiness
    LIVE_PROFILE.sleep_hours = checkin.sleep_hours;
    LIVE_PROFILE.stress_level = checkin.stress_level;
    calculateNeuralReadiness(LIVE_PROFILE);
  }
}

async function submitDailyCheckin() {
  const sleep = parseFloat(document.getElementById("checkin-sleep").value);
  const stress = document.getElementById("checkin-stress").value;
  
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split('T')[0];

  try {
    const { error } = await sb.from('daily_checkins').insert({
      user_id: user.id,
      date: today,
      sleep_hours: sleep,
      stress_level: stress
    });

    if (error && error.code !== '23505') throw error; // 23505 = unique constraint

    // Chiudi modal e aggiorna UI
    document.getElementById("modal-check-in").classList.add("hidden");
    playNeuralSound('complete');
    
    // Aggiorna profilo in memoria per il Readiness immediato
    LIVE_PROFILE.sleep_hours = sleep;
    LIVE_PROFILE.stress_level = stress;
    calculateNeuralReadiness(LIVE_PROFILE);
    
    showError("Sincronizzazione biometria completata. Neural link ottimizzato.", "success");
  } catch (err) {
    showError("Errore sincronizzazione: " + err.message);
  }
}

function applyStats() {
  console.log("📊 Applicazione statistiche UI...");
  const dDays = document.getElementById("stat-days");
  const dStress = document.getElementById("stat-stress");
  const dGoal = document.getElementById("stat-goal");
  const dEquip = document.getElementById("stat-equip");

  const schedule = LIVE_PROFILE.training_schedule || [1, 3, 5];
  if (dDays) dDays.textContent = schedule.length;
  if (dStress) dStress.textContent = LIVE_PROFILE.stress_level || 5;
  if (dGoal) dGoal.textContent = (LIVE_PROFILE.primary_goal || 'Hypertrophy').toUpperCase();
  if (dEquip) dEquip.textContent = (LIVE_PROFILE.equipment || 'Full Gym').toUpperCase();

  // Profile Form (se presente)
  const schedContainer = document.getElementById("training-schedule");
  if (schedContainer) {
    const checks = schedContainer.querySelectorAll("input[type='checkbox']");
    checks.forEach(c => {
      c.checked = schedule.includes(parseInt(c.value));
    });

    document.getElementById("stress").value = LIVE_PROFILE.stress_level || 5;
  }

  // Inizializza le nuove funzioni Neurali
  initNeuralDashboard(LIVE_PROFILE);
  calculateNeuralRank(LIVE_PROFILE);
}

// ============================================================================
// NEURAL INTELLIGENCE & ANALYTICS
// ============================================================================

async function initNeuralDashboard(profile) {
  calculateNeuralReadiness(profile);
  updateMuscleHeatMap();
  generateNeuralInsights();
}

function calculateNeuralReadiness(profile) {
  const sleep = profile.sleep_hours || 7;
  const stress = profile.stress_level || "Media";
  
  // Algoritmo di Readiness Base (0-100)
  let score = 50;
  
  // Fattore Sonno (ottimale 8 ore)
  score += (sleep - 7) * 10;
  
  // Fattore Stress
  const stressModifiers = { "Bassa": 15, "Media": 0, "Alta": -20 };
  score += stressModifiers[stress] || 0;
  
  // Limiti
  score = Math.max(10, Math.min(100, score));
  
  // Aggiorna UI
  const gauge = document.getElementById("readiness-gauge");
  const valueText = document.getElementById("readiness-value");
  const adviceText = document.getElementById("readiness-advice");
  
  if (gauge) {
    // 125.6 è lo stroke-dasharray per il semicerchio
    const offset = 125.6 - (125.6 * score / 100);
    gauge.style.strokeDashoffset = offset;
    
    // Colore dinamico
    if (score > 80) gauge.style.stroke = "var(--success)";
    else if (score < 50) gauge.style.stroke = "var(--danger)";
    else gauge.style.stroke = "var(--neon)";
  }
  
  if (valueText) valueText.innerText = `${score}%`;
  
  if (adviceText) {
    if (score > 85) adviceText.innerText = "Stato Neurale Ottimale. Oggi puoi spingere al massimo e cercare nuovi PR.";
    else if (score > 60) adviceText.innerText = "Sincronizzazione Stabile. Allenamento standard consigliato.";
    else if (score > 40) adviceText.innerText = "Low Power State. Considera di ridurre il carico del 10%.";
    else adviceText.innerText = "Neural Fatigue Detected. Riposo o sessione di scarico obbligatoria.";
  }
}

async function updateMuscleHeatMap() {
  const container = document.getElementById("human-map-svg");
  if (!container) return;

  // Carica gli ultimi 7 giorni di allenamenti
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const { data: logs } = await sb
      .from('exercise_logs')
      .select('muscle_group, workout_sessions!inner(user_id)')
      .eq('workout_sessions.user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString());

    const activation = {};
    if (logs) {
      logs.forEach(l => {
        const muscle = l.muscle_group?.toLowerCase();
        activation[muscle] = (activation[muscle] || 0) + 1;
      });
    }

    // Genera SVG dinamico degli omini
    container.innerHTML = `
      <svg viewBox="0 0 200 200" style="width:100%; height:100%;">
        <!-- Testa -->
        <circle cx="100" cy="30" r="15" fill="${getActivationColor(activation.collo)}" />
        <!-- Busto -->
        <rect x="80" y="50" width="40" height="60" rx="5" fill="${getActivationColor(activation.petto || activation.addome)}" />
        <!-- Braccia -->
        <rect x="55" y="55" width="20" height="50" rx="5" fill="${getActivationColor(activation.braccia || activation.bicipiti)}" />
        <rect x="125" y="55" width="20" height="50" rx="5" fill="${getActivationColor(activation.braccia || activation.tricipiti)}" />
        <!-- Spalle -->
        <circle cx="70" cy="55" r="10" fill="${getActivationColor(activation.spalle)}" />
        <circle cx="130" cy="55" r="10" fill="${getActivationColor(activation.spalle)}" />
        <!-- Gambe -->
        <rect x="80" y="115" width="18" height="60" rx="5" fill="${getActivationColor(activation.gambe || activation.quadricipiti)}" />
        <rect x="102" y="115" width="18" height="60" rx="5" fill="${getActivationColor(activation.gambe || activation.femorali)}" />
      </svg>
    `;
  } catch (e) {
    console.error("Errore Muscle Map:", e);
  }
}

function getActivationColor(value) {
  if (!value) return "rgba(255,255,255,0.05)";
  if (value > 4) return "var(--neon)";
  return "rgba(0, 242, 255, 0.4)";
}

async function generateNeuralInsights() {
  const container = document.getElementById("insights-container");
  if (!container) return;

  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const { data: logs } = await sb
      .from('exercise_logs')
      .select('*, workout_sessions!inner(user_id)')
      .eq('workout_sessions.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!logs || logs.length === 0) {
      container.innerHTML = `<div class="insight-item"><p class="insight-text">In attesa di dati per generare analisi predittive...</p></div>`;
      return;
    }

    const insights = [];

    // 1. Analisi Volume Recente
    const recentVolume = logs.slice(0, 10).reduce((acc, l) => acc + (l.sets * (l.reps?.[0] || 0) * (l.weight?.[0] || 20)), 0);
    const prevVolume = logs.slice(10, 20).reduce((acc, l) => acc + (l.sets * (l.reps?.[0] || 0) * (l.weight?.[0] || 20)), 0);

    if (recentVolume > prevVolume * 1.05) {
      insights.push({
        type: "PRESTAZIONE",
        text: "Volume neurale in crescita. Il tuo sistema nervoso si sta adattando bene ai carichi."
      });
    }

    // 2. Analisi PR Predittiva
    const benchLogs = logs.filter(l => l.exercise_name?.toLowerCase().includes("panca"));
    if (benchLogs.length >= 2) {
      const last = benchLogs[0].weight?.[0] || 0;
      const prev = benchLogs[1].weight?.[0] || 0;
      if (last > prev) {
        insights.push({
          type: "PREDICTIVE",
          text: `In base alla tua ultima sessione di Panca, prevedo un potenziale incremento di +2.5kg nella prossima settimana.`
        });
      }
    }

    // Render finale
    container.innerHTML = insights.map(i => `
      <div class="insight-item">
        <div class="insight-type">${i.type}</div>
        <p class="insight-text">${i.text}</p>
      </div>
    `).join("") || `<div class="insight-item"><p class="insight-text">Analisi completata. Sincronizzazione stabile.</p></div>`;
  } catch (e) {
    console.error("Errore insights:", e);
  }
}

window.syncProfile = async () => {
  const btn = document.querySelector(".btn-sync");
  const originalText = btn.innerText;
  btn.innerText = "SINCRONIZZAZIONE...";

  // Read schedule from checkboxes
  const schedContainer = document.getElementById("training-schedule");
  const schedule = [];
  if (schedContainer) {
    schedContainer.querySelectorAll("input:checked").forEach(c => schedule.push(parseInt(c.value)));
  }

  LIVE_PROFILE.training_schedule = schedule;
  LIVE_PROFILE.training_days = schedule.length;
  LIVE_PROFILE.primary_goal = document.getElementById("goal").value;
  LIVE_PROFILE.equipment = document.getElementById("equip").value;
  LIVE_PROFILE.stress_level = parseInt(document.getElementById("stress").value);

  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    await sb.from('profiles').update({
      training_days: LIVE_PROFILE.training_days,
      training_schedule: LIVE_PROFILE.training_schedule,
      primary_goal: LIVE_PROFILE.primary_goal,
      equipment: LIVE_PROFILE.equipment,
      stress_level: LIVE_PROFILE.stress_level
    }).eq('id', user.id);
  }

  localStorage.setItem('neurocoach_profile', JSON.stringify(LIVE_PROFILE));

  alert("Profilo sincronizzato correttamente!");
  btn.innerText = originalText;
  applyStats();
  // Forza ricaricamento workout dopo sync profilo
  renderWorkout();
};

// ============================================================================
// STATISTICHE - LOGICA TAB
// ============================================================================
window.switchStatsTab = (tabId) => {
  // Update Buttons
  document.querySelectorAll(".stats-tab").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  // Update Content
  document.querySelectorAll(".stats-tab-content").forEach(content => content.classList.add("hidden"));
  const targetContent = document.getElementById(`stats-${tabId}`);
  if (targetContent) targetContent.classList.remove("hidden");

  if (tabId === 'personal') {
    populateExerciseSelector();
    renderPersonalRecords();
  }
};

async function populateExerciseSelector() {
  const selector = document.getElementById("exercise-selector");
  if (!selector) return;

  try {
    const { data: { user } } = await sb.auth.getUser();

    // Fetch unique exercise names from logs
    const { data: logs, error } = await sb
      .from('exercise_logs')
      .select('exercise_name')
      .order('exercise_name');

    if (error) throw error;

    // Filter unique names
    const uniqueExercises = [...new Set(logs.map(l => l.exercise_name))];

    selector.innerHTML = '<option value="">Seleziona un esercizio...</option>';
    uniqueExercises.forEach(ex => {
      selector.innerHTML += `<option value="${ex}">${ex}</option>`;
    });

  } catch (e) {
    console.error("Errore popolamento selettore esercizi:", e);
  }
}

async function renderPersonalRecords() {
  const container = document.getElementById("personal-records-list");
  if (!container) return;

  container.innerHTML = "<div class='loading-spinner'>ANALISI RECORD...</div>";

  try {
    const { data: { user } } = await sb.auth.getUser();
    const { data: logs, error } = await sb
      .from('exercise_logs')
      .select('exercise_name, weight');

    if (error) throw error;

    // Calculate PR for each exercise
    const prs = {};
    logs.forEach(log => {
      const maxWeight = Math.max(...(log.weight || [0]));
      if (!prs[log.exercise_name] || maxWeight > prs[log.exercise_name]) {
        prs[log.exercise_name] = maxWeight;
      }
    });

    if (Object.keys(prs).length === 0) {
      container.innerHTML = "<p class='empty-selection'>Nessun dato ancora disponibile. Inizia ad allenarti!</p>";
      return;
    }

    container.innerHTML = Object.entries(prs).map(([name, weight]) => `
      <div class="record-item">
        <div class="record-name">${name}</div>
        <div class="record-value">${weight} KG</div>
      </div>
    `).join('');

  } catch (e) {
    console.error("Errore rendering PR:", e);
    container.innerHTML = "Errore nel caricamento record.";
  }
}

window.loadExerciseProgression = async () => {
  const selector = document.getElementById("exercise-selector");
  const chartContainer = document.getElementById("progression-chart");
  if (!selector || !chartContainer) return;

  const exercise = selector.value;
  if (!exercise) {
    chartContainer.innerHTML = "<p class='empty-selection'>Seleziona un esercizio per vedere la progressione</p>";
    return;
  }

  chartContainer.innerHTML = "<div class='loading-spinner'>CALCOLO PROGRESSIONE...</div>";

  try {
    const { data: logs, error } = await sb
      .from('exercise_logs')
      .select('weight, created_at')
      .eq('exercise_name', exercise)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Per ora mostriamo un riassunto testuale, in futuro un grafico reale
    const values = logs.map(l => ({
      date: new Date(l.created_at).toLocaleDateString(),
      weight: Math.max(...(l.weight || [0]))
    }));

    let html = `<div class="progression-summary" style="padding-top:20px;">`;
    values.forEach(v => {
      html += `
        <div style="display:flex; justify-content:space-between; margin-bottom:5px; padding:5px; background:rgba(0,242,255,0.05); border-radius:4px;">
          <span>${v.date}</span>
          <b style="color:var(--neon)">${v.weight} KG</b>
        </div>`;
    });
    html += `</div>`;
    chartContainer.innerHTML = html;

  } catch (e) {
    console.error("Errore caricamento progressione:", e);
    chartContainer.innerHTML = "Errore durante l'analisi dati.";
  }
};

// ============================================================================
// OGGI (TODAY'S WORKOUT)
// ============================================================================
async function renderToday() {
  const container = document.getElementById("today-workout-container");
  const dateEl = document.getElementById("today-date");
  const emptyEl = document.getElementById("today-empty");
  if (!container || !dateEl) return;

  const now = new Date();
  dateEl.textContent = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  container.innerHTML = "<div class='loading-spinner'>ANALISI BIOMETRICA...</div>";
  emptyEl.classList.add("hidden");

  try {
    const { data: { user } } = await sb.auth.getUser();
    const { data: plans } = await sb.from('workout_plans').select('*').eq('user_id', user.id).eq('is_active', true).limit(1);

    if (!plans || plans.length === 0) {
      container.innerHTML = "";
      emptyEl.classList.remove("hidden");
      emptyEl.querySelector("p").textContent = "Nessun piano attivo. Generane uno nel Profilo!";
      return;
    }

    const plan = plans[0];
    const todayIndex = isProjectedTrainingDay(now.getFullYear(), now.getMonth(), now.getDate());
    const planDayKey = todayIndex ? `day${todayIndex}` : null;

    if (!planDayKey || !plan.exercises[planDayKey]) {
      container.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }

    // CHECK IF ALREADY LOGGED TODAY
    const todayStr = now.toISOString().split('T')[0];
    const { data: todaySessions } = await sb.from('workout_sessions')
      .select('*, exercise_logs(*)')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .limit(1);

    const existingSession = todaySessions && todaySessions.length > 0 ? todaySessions[0] : null;

    container.innerHTML = `
      <div class="today-plan-header">${existingSession ? 'SESSIONE COMPLETATA (MODIFICA)' : 'SESSIONE DI OGGI'}: ${planDayKey.toUpperCase()}</div>
      <div class="ex-list" id="today-ex-list">
        ${plan.exercises[planDayKey].map((ex, exIdx) => {
      let setsHtml = "";
      const loggedEx = existingSession?.exercise_logs?.find(l => l.exercise_name === ex.n);

      for (let s = 0; s < ex.sets; s++) {
        const valW = loggedEx?.weight?.[s] || "";
        const valR = loggedEx?.reps?.[s] || "";
        setsHtml += `
              <div class="set-row">
                <span class="set-num">SET ${s + 1}</span>
                <input type="number" class="track-input" placeholder="KG" id="weight-${exIdx}-${s}" value="${valW}">
                <input type="number" class="track-input" placeholder="REPS" id="reps-${exIdx}-${s}" value="${valR}">
              </div>`;
      }
      return `
            <div class="ex-row tracker-row-multi">
              <div class="ex-header-row">
                <b>${ex.n}</b>
                <button class="btn-rest" onclick="startRestTimer(90)">REST 90s</button>
              </div>
              <div class="sets-container">
                ${setsHtml}
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;

    // Show action button
    const actions = document.getElementById("today-actions");
    if (actions) {
      actions.classList.remove("hidden");
      const btn = actions.querySelector(".btn-neon-main");
      if (btn) btn.innerText = existingSession ? "AGGIORNA SESSIONE" : "COMPLETA SESSIONE";
      // Store current plan/day for completion
      window.CURRENT_TODAY_SESSION = { planId: plan.id, dayKey: planDayKey, exercises: plan.exercises[planDayKey] };
    }

  } catch (e) {
    container.innerHTML = "Errore durante il caricamento.";
  }
}

window.completeCurrentSession = async (source) => {
  const session = window.CURRENT_TODAY_SESSION;
  if (!session) return;

  const btn = document.querySelector(`#${source}-actions .btn-neon-main`);
  const originalText = btn.innerText;
  btn.innerText = "REGISTRAZIONE IN CORSO...";
  btn.disabled = true;

  try {
    const { data: { user } } = await sb.auth.getUser();
    const today = new Date().toISOString().split('T')[0];

    // 0. Check for existing session
    const { data: existing } = await sb.from('workout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .limit(1);

    if (existing && existing.length > 0) {
      if (!confirm("Hai già registrato un allenamento oggi. Vuoi sovrascriverlo?")) {
        return;
      }
      // Delete existing to "overwrite"
      await sb.from('workout_sessions').delete().eq('id', existing[0].id);
    }

    // 1. Create session
    const { data: ws, error: wsErr } = await sb.from('workout_sessions').insert({
      user_id: user.id,
      workout_plan_id: session.planId,
      date: today,
      duration_minutes: 60,
      completed: true
    }).select().single();

    if (wsErr) throw wsErr;

    // 2. Create exercise logs with actual values for EACH set
    const logs = session.exercises.map((ex, exIdx) => {
      const weights = [];
      const reps = [];

      for (let s = 0; s < ex.sets; s++) {
        const wVal = document.getElementById(`weight-${exIdx}-${s}`)?.value;
        const rVal = document.getElementById(`reps-${exIdx}-${s}`)?.value;

        const w = parseFloat(wVal) || 0;
        const r = parseInt(rVal) || parseInt(ex.reps) || 12;
        weights.push(w);
        reps.push(r);
      }

      return {
        session_id: ws.id,
        exercise_name: ex.n,
        muscle_group: ex.m,
        sets: ex.sets,
        reps: reps,
        weight: weights
      };
    });

    const { error: logErr } = await sb.from('exercise_logs').insert(logs);
    if (logErr) throw logErr;

    // Update total_sessions in profile
    LIVE_PROFILE.total_sessions = (LIVE_PROFILE.total_sessions || 0) + 1;
    await sb.from('profiles').update({ total_sessions: LIVE_PROFILE.total_sessions }).eq('id', user.id);
    localStorage.setItem('neurocoach_profile', JSON.stringify(LIVE_PROFILE));

    // Play Success Sound
    playNeuralSound('complete');
    
    showError("Neural link synced. Session recorded.", "success");
    nav("dashboard");
    applyStats();

  } catch (e) {
    console.error("Errore salvataggio sessione:", e);
    alert("Errore durante il salvataggio.");
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
};

// ============================================================================
// GENERAZIONE WORKOUT
// ============================================================================
// ============================================================================
// GENERAZIONE WORKOUT (INTERACTIVE TRACKER)
// ============================================================================
async function renderWorkout() {
  const container = document.getElementById("workout-list");
  if (!container) return;

  container.innerHTML = "<div class='loading-spinner'>ANALISI BIOMETRICA...</div>";

  try {
    const { data: { user } } = await sb.auth.getUser();
    const { data: plans } = await sb.from('workout_plans').select('*').eq('user_id', user.id).eq('is_active', true).limit(1);

    if (plans && plans.length > 0) {
      const plan = plans[0];
      const exercises = plan.exercises;
      container.innerHTML = "";

      Object.keys(exercises).forEach(dayKey => {
        const dayNum = dayKey.replace('day', '');
        let html = `<div class="ex-day-header">Sessione ${dayNum}</div><div class="ex-list">`;
        exercises[dayKey].forEach((ex, idx) => {
          html += `
            <div class="ex-row">
              <div class="ex-info">
                <div class="ex-name">${ex.n}</div>
                <div class="ex-muscle">${ex.m}</div>
                <button class="btn-swap-neural" onclick="swapExercise('${ex.n}', ${idx})">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L21 2" />
                  </svg>
                  NEURAL SWAP
                </button>
              </div>
              <div class="ex-volume">
                <span class="ex-sets">${ex.sets}</span>
                <span class="ex-separator">x</span>
                <span class="ex-reps">${ex.reps}</span>
              </div>
            </div>`;
        });
        html += `</div>`;
        container.insertAdjacentHTML("beforeend", html);
      });

      // Show action button
      const actions = document.getElementById("workout-actions");
      if (actions) actions.classList.remove("hidden");
      window.CURRENT_WORKOUT_PLAN = plan;

    } else {
      // Fallback a MASTER_DB se non ci sono piani su Supabase
      console.log("ℹ️ Nessun piano su Supabase, uso MASTER_DB");
      container.innerHTML = "";
      const filtered = window.MASTER_DB.filter(ex => {
        if (LIVE_PROFILE.equipment === "body" && ex.type !== "body") return false;
        return true;
      });

      for (let d = 1; d <= (LIVE_PROFILE.training_days || 3); d++) {
        let html = `<div class="ex-day-header">Sessione Provvisoria ${d}</div><div class="ex-list">`;
        filtered.slice((d - 1) * 4, d * 4).forEach(ex => {
          html += `
            <div class="ex-row">
              <div class="ex-info"><b>${ex.n}</b><br><small>${ex.m}</small></div>
              <div class="ex-volume">${ex.sets} x ${ex.reps}</div>
            </div>`;
        });
        html += `</div>`;
        container.insertAdjacentHTML("beforeend", html);
      }
    }
  } catch (e) {
    console.error("❌ Errore in renderWorkout:", e);
    container.innerHTML = "Errore nel caricamento del programma.";
  }
}

window.openSessionLogger = () => {
  const plan = window.CURRENT_WORKOUT_PLAN;
  if (!plan) return;

  // Per ora simuliamo il completamento del "Giorno 1" se cliccato dalla scheda completa
  // In futuro potremmo far scegliere all'utente quale giorno ha fatto
  if (confirm("Vuoi registrare il completamento del Giorno 1 di questo piano?")) {
    window.CURRENT_TODAY_SESSION = {
      planId: plan.id,
      dayKey: 'day1',
      exercises: plan.exercises['day1']
    };
    completeCurrentSession('workout');
  }
};

// ============================================================================
// DYNAMIC ADAPTATION: EXERCISE SWAP
// ============================================================================

const NEURAL_ALTERNATIVES = {
  "Panca Piana": "Chest Press",
  "Panca Inclinata": "Dumbbell Incline Press",
  "Squat": "Leg Press",
  "Stacco da terra": "Leg Curl",
  "Pull up": "Lat Machine",
  "Rematore": "Pulley",
  "Military Press": "Shoulder Press",
  "Curl Bilanciere": "Curl Manubri",
  "Pushdown": "Dip Machine"
};

function swapExercise(currentName, index) {
  playNeuralSound('click');
  const alt = NEURAL_ALTERNATIVES[currentName];
  
  if (!alt) {
    showError("Nessuna alternativa neurale trovata per questo esercizio.");
    return;
  }
  
  if (confirm(`Confermi lo swap: ${currentName} -> ${alt}?`)) {
    // Aggiorna il workout corrente in memoria
    const currentWorkout = JSON.parse(localStorage.getItem('neurocoach_current_workout'));
    if (currentWorkout && currentWorkout.exercises[index]) {
      currentWorkout.exercises[index].exercise_name = alt;
      localStorage.setItem('neurocoach_current_workout', JSON.stringify(currentWorkout));
      renderToday(); // Ricarica la vista
      showError(`Neural Link Adapted: ${alt} caricato.`, "success");
    }
  }
}
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes("onboarding.html")) return;

  console.log("🚀 AXON PRO inizializzato");
  sb.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      loginSuccess();
    }
  });
});

// ============================================================================
// AUDIO FEEDBACK (WEB AUDIO API)
// ============================================================================

const AUDIO_CONTEXT = new (window.AudioContext || window.webkitAudioContext)();

// "Neural Wake-up": Unlock audio on first interaction
document.addEventListener('click', () => {
  if (AUDIO_CONTEXT.state === 'suspended') {
    AUDIO_CONTEXT.resume().then(() => {
      console.log("🔊 Neural Audio Engine: ONLINE");
    });
  }
}, { once: true });

function playNeuralSound(type) {
  if (AUDIO_CONTEXT.state === 'suspended') {
    AUDIO_CONTEXT.resume();
  }

  const osc = AUDIO_CONTEXT.createOscillator();
  const gain = AUDIO_CONTEXT.createGain();
  
  osc.connect(gain);
  gain.connect(AUDIO_CONTEXT.destination);

  const now = AUDIO_CONTEXT.currentTime;

  switch (type) {
    case 'timer_start':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
      
    case 'timer_end':
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;

    case 'complete':
      // Effetto "Successo" Neurale
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
      
    case 'click':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
  }
}

// ============================================================================
// NEURAL RANKING & BADGES
// ============================================================================

function calculateNeuralRank(profile) {
  const sessions = profile.total_sessions || 0;
  let rank = "RECRUIT";
  let color = "var(--text-muted)";
  
  if (sessions > 50) {
    rank = "NEURAL OVERLORD";
    color = "var(--danger)";
  } else if (sessions > 20) {
    rank = "CYBORG ELITE";
    color = "var(--success)";
  } else if (sessions > 5) {
    rank = "SYCHRONIZED";
    color = "var(--neon)";
  }
  
  const rankEl = document.getElementById("neural-rank-display");
  if (rankEl) {
    rankEl.innerText = rank;
    rankEl.style.color = color;
    rankEl.style.textShadow = `0 0 10px ${color}`;
  }
}

// ============================================================================
// REST TIMER
// ============================================================================
let restInterval = null;
// Hook Audio into Rest Timer
window.startRestTimer = (seconds) => {
  playNeuralSound('timer_start');
  const overlay = document.getElementById("rest-timer-overlay");
  const timeDisplay = document.getElementById("rest-time-left"); // Changed to timeDisplay
  if (!overlay || !timeDisplay) return; // Changed to timeDisplay

  overlay.classList.remove("hidden");
  let left = seconds;

  clearInterval(restInterval);
  restInterval = setInterval(() => {
    left--;
    timeDisplay.textContent = left + "s"; // Changed to timeDisplay
    if (left <= 3 && left > 0) {
       playNeuralSound('click');
    }
    if (left <= 0) {
      clearInterval(restInterval);
      playNeuralSound('timer_end');
      setTimeout(() => {
        overlay.classList.add("hidden");
        alert("Recupero terminato! Torna sotto al peso. 🦾");
      }, 1000); // Delay closing overlay to allow sound to play
    }
  }, 1000);
};

window.closeRestTimer = () => {
  clearInterval(restInterval);
  document.getElementById("rest-timer-overlay").classList.add("hidden");
};
