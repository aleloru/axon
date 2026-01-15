const SUPABASE_URL = "https://eckwueoihttjhygmeifo.supabase.co";
const SUPABASE_KEY = "sb_publishable_UAJR8pVZKF4CRjl2-URAcQ_Z3tRg3M3";
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESERCIZI_DB = [
    { nome: "Panca Piana Bilanciere", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["forza", "ipertrofia"], tipo: "base" },
    { nome: "Panca Inclinata Manubri", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["ipertrofia"], tipo: "base" },
    { nome: "Croci ai Cavi", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["ipertrofia"], tipo: "isolamento" },
    { nome: "Trazioni alla Sbarra", muscoli: ["Schiena"], livelloMin: "intermediate", obiettivo: ["forza", "ipertrofia"], tipo: "base" },
    { nome: "Rematore Bilanciere", muscoli: ["Schiena"], livelloMin: "intermediate", obiettivo: ["forza", "ipertrofia"], tipo: "base" },
    { nome: "Pulley Basso", muscoli: ["Schiena"], livelloMin: "beginner", obiettivo: ["ipertrofia"], tipo: "base" },
    { nome: "Squat Bilanciere", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["forza", "ipertrofia"], tipo: "base" },
    { nome: "Leg Press 45°", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["ipertrofia"], tipo: "base" },
    { nome: "Leg Extension", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["ipertrofia"], tipo: "isolamento" },
    { nome: "Military Press", muscoli: ["Spalle"], livelloMin: "intermediate", obiettivo: ["forza"], tipo: "base" },
    { nome: "Alzate Laterali", muscoli: ["Spalle"], livelloMin: "beginner", obiettivo: ["ipertrofia"], tipo: "isolamento" },
    { nome: "Curl Bilanciere EZ", muscoli: ["Braccia"], livelloMin: "beginner", obiettivo: ["ipertrofia"], tipo: "base" },
    { nome: "French Press", muscoli: ["Braccia"], livelloMin: "intermediate", obiettivo: ["ipertrofia"], tipo: "base" },
    { nome: "Pushdown Tricipiti", muscoli: ["Braccia"], livelloMin: "beginner", obiettivo: ["ipertrofia"], tipo: "isolamento" }
];

const GRUPPI_MUSCOLARI = ["Petto", "Schiena", "Gambe", "Spalle", "Braccia"];

async function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const { data, error } = await _sb.auth.signInWithPassword({ email, password: pass });
    if (error) { await _sb.auth.signUp({ email, password: pass }); alert("Conferma l'email!"); }
    else location.reload();
}

function nav(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if(id === 'workout-gen') generateNeuralWorkout();
    if(id === 'dash') updateDash();
}

async function saveProfileData() {
    const { data: { user } } = await _sb.auth.getUser();
    const profile = {
        id: user.id,
        training_days: parseInt(document.getElementById('f-days').value),
        session_duration: parseInt(document.getElementById('f-duration').value),
        experience_level: document.getElementById('f-exp').value,
        goal: document.getElementById('f-goal').value,
        weak_point: document.getElementById('f-weak').value
    };
    await _sb.from('profiles').upsert(profile);
    nav('workout-gen');
}

function generateNeuralWorkout() {
    _sb.auth.getUser().then(({data: {user}}) => {
        _sb.from('profiles').select('*').eq('id', user.id).single().then(({data: p}) => {
            let container = document.getElementById('workout-gen');
            container.innerHTML = `<h1>Protocollo Neural OS: Specializzazione ${p.weak_point}</h1>`;

            // 1. Distribuiamo i gruppi muscolari sui giorni disponibili
            // Esempio 4 giorni: G1: Petto/Braccia, G2: Schiena/Spalle, G3: Gambe, G4: Richiamo Totale
            for (let d = 1; d <= p.training_days; d++) {
                container.innerHTML += generateProfessionalDay(p, d);
            }
        });
    });
}

function generateProfessionalDay(p, dayNumber) {
    let sessione = [];
    
    // --- REGOLA 1: PRIORITÀ PUNTO CARENTE ---
    // Inseriamo sempre 2 esercizi del punto carente all'inizio di ogni allenamento
    let eserciziCarenti = ESERCIZI_DB.filter(ex => ex.muscoli.includes(p.weak_point));
    sessione.push(...eserciziCarenti.sort(() => 0.5 - Math.random()).slice(0, 2));

    // --- REGOLA 2: COPERTURA ROTATIVA ---
    // Scegliamo altri gruppi muscolari in base al giorno per coprire tutto a fine settimana
    let altriGruppi = GRUPPI_MUSCOLARI.filter(g => g !== p.weak_point);
    let gruppiDelGiorno = [altriGruppi[(dayNumber - 1) % altriGruppi.length], altriGruppi[dayNumber % altriGruppi.length]];

    gruppiDelGiorno.forEach(gruppo => {
        let eserciziGruppo = ESERCIZI_DB.filter(ex => ex.muscoli.includes(gruppo) && ex.obiettivo.includes(p.goal));
        sessione.push(...eserciziGruppo.slice(0, 3)); // 3 esercizi per ogni gruppo del giorno
    });

    // --- REGOLA 3: VOLUME VS TEMPO ---
    let maxEsercizi = Math.floor(p.session_duration / 9);
    let selezione = sessione.slice(0, maxEsercizi);

    let html = `
        <div class="glass-card">
            <h2 style="color: var(--axon-cyan)">GIORNO ${dayNumber}</h2>
            <p>Focus: <span class="tag">${p.weak_point} (Priorità)</span> + ${gruppiDelGiorno.join(" & ")}</p>
            <table class="workout-table">
                <thead><tr><th>Esercizio</th><th>Target</th><th>Serie x Rep</th><th>Kg</th><th>Azione</th></tr></thead>
                <tbody>`;

    selezione.forEach((ex, i) => {
        let sets = (ex.tipo === "base") ? 4 : 3;
        let reps = (ex.tipo === "base") ? "6-8" : "12";
        
        html += `
            <tr class="${ex.muscoli.includes(p.weak_point) ? 'weak-point-row' : ''}">
                <td><strong>${ex.nome}</strong></td>
                <td><span class="tag">${ex.muscoli[0]}</span></td>
                <td>${sets} x ${reps}</td>
                <td><input type="number" id="kg-${dayNumber}-${i}" class="kg-input" placeholder="0"></td>
                <td><button onclick="saveLog('${ex.muscoli[0]}','${ex.nome}',${sets},10,'kg-${dayNumber}-${i}')" class="glow-btn" style="padding:5px 10px; font-size:10px">LOG</button></td>
            </tr>`;
    });

    return html + "</tbody></table></div>";
}

async function saveLog(g, n, s, r, id) {
    const val = document.getElementById(id).value;
    if(!val) return alert("Inserisci il peso!");
    const { data: { user } } = await _sb.auth.getUser();
    await _sb.from('workout_logs').insert({ user_id: user.id, muscle_group: g, exercise_name: n, weight_lifted: val, sets: s, reps_done: r });
    alert("Dato registrato!");
}

async function updateDash() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data } = await _sb.from('workout_logs').select('*').eq('user_id', user.id);
    const vol = data ? data.reduce((acc, c) => acc + (parseFloat(c.weight_lifted) * c.reps_done * c.sets), 0) : 0;
    document.getElementById('total-volume').innerText = vol.toLocaleString() + " kg";
}

// Inizializzazione automatica
_sb.auth.getUser().then(({data}) => {
    if(data.user) {
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('auth-screen').classList.add('hidden');
        nav('dash');
    }
});