const SUPABASE_URL = "https://eckwueoihttjhygmeifo.supabase.co";
const SUPABASE_KEY = "sb_publishable_UAJR8pVZKF4CRjl2-URAcQ_Z3tRg3M3";
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESERCIZI_DB = [
    { nome: "Panca Piana Bilanciere", muscoli: ["Petto"], tipo: "base", sports: ["gym", "combat"] },
    { nome: "Squat Bilanciere", muscoli: ["Gambe"], tipo: "base", sports: ["gym", "calcio", "combat"] },
    { nome: "Stacco da Terra", muscoli: ["Schiena"], tipo: "base", sports: ["gym", "combat"] },
    { nome: "Trazioni alla Sbarra", muscoli: ["Schiena"], tipo: "base", sports: ["gym", "tennis", "combat"] },
    { nome: "Military Press", muscoli: ["Spalle"], tipo: "base", sports: ["gym", "tennis", "combat"] },
    { nome: "Affondi Esplosivi", muscoli: ["Gambe"], tipo: "base", sports: ["calcio", "tennis", "corsa"] },
    { nome: "Box Jump", muscoli: ["Gambe"], tipo: "esplosivo", sports: ["calcio", "combat"] },
    { nome: "Rotazioni Core ai Cavi", muscoli: ["Addominali"], tipo: "core", sports: ["tennis", "combat", "calcio"] },
    { nome: "Plank con Peso", muscoli: ["Addominali"], tipo: "core", sports: ["corsa", "tennis", "gym"] },
    { nome: "Leg Press 45°", muscoli: ["Gambe"], tipo: "base", sports: ["gym", "corsa"] },
    { nome: "Curl Bilanciere EZ", muscoli: ["Braccia"], tipo: "isolamento", sports: ["gym"] },
    { nome: "Pushdown Tricipiti", muscoli: ["Braccia"], tipo: "isolamento", sports: ["gym", "combat"] }
];

const GRUPPI = ["Petto", "Schiena", "Gambe", "Spalle", "Braccia"];

// FIX LOGOUT
async function logout() {
    await _sb.auth.signOut();
    window.location.reload();
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const { error } = await _sb.auth.signInWithPassword({ email, password: pass });
    if (error) {
        await _sb.auth.signUp({ email, password: pass });
        alert("Account registrato. Controlla la mail!");
    } else location.reload();
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
        weak_point: document.getElementById('f-weak').value,
        sport: document.getElementById('f-sport').value
    };
    await _sb.from('profiles').upsert(profile);
    nav('workout-gen');
}

async function generateNeuralWorkout() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data: p } = await _sb.from('profiles').select('*').eq('id', user.id).single();
    
    let container = document.getElementById('workout-gen');
    container.innerHTML = `<div class="glass-card"><h1>PROTOCOLLO SETTIMANALE: ${p.sport.toUpperCase()}</h1><p>Specializzazione: ${p.weak_point}</p></div>`;

    // CICLO PER GENERARE TUTTI I GIORNI
    for (let d = 1; d <= p.training_days; d++) {
        container.innerHTML += generateDay(p, d);
    }
}

function generateDay(p, dayNum) {
    let sessione = [];
    
    // 1. Priorità Sportiva
    let esSport = ESERCIZI_DB.filter(ex => ex.sports.includes(p.sport));
    sessione.push(...esSport.sort(() => 0.5 - Math.random()).slice(0, 2));

    // 2. Punto Carente (Sempre presente)
    let esCarente = ESERCIZI_DB.filter(ex => ex.muscoli.includes(p.weak_point));
    sessione.push(...esCarente.sort(() => 0.5 - Math.random()).slice(0, 2));

    // 3. Rotazione altri gruppi (per coprire tutto il corpo)
    let altroGruppo = GRUPPI[dayNum % GRUPPI.length];
    let esRotazione = ESERCIZI_DB.filter(ex => ex.muscoli.includes(altroGruppo));
    sessione.push(...esRotazione.slice(0, 2));

    let selezione = Array.from(new Set(sessione)).slice(0, Math.floor(p.session_duration / 10));

    let html = `
        <div class="glass-card">
            <h3 style="color: var(--axon-cyan)">GIORNO ${dayNum}</h3>
            <table class="workout-table">
                <thead><tr><th>Esercizio</th><th>Target</th><th>Protocollo</th><th>Kg</th><th>Azione</th></tr></thead>
                <tbody>`;

    selezione.forEach((ex, i) => {
        let protocollo = "3 x 10";
        if(p.sport === 'calcio' || p.sport === 'combat') protocollo = "4 x 6 (Explo)";
        if(p.sport === 'corsa') protocollo = "3 x 20 (Res)";

        html += `<tr class="${ex.muscoli.includes(p.weak_point) ? 'weak-point-row' : ''}">
            <td><strong>${ex.nome}</strong></td>
            <td><span class="tag">${ex.muscoli[0]}</span></td>
            <td>${protocollo}</td>
            <td><input type="number" id="kg-${dayNum}-${i}" class="kg-input" placeholder="0"></td>
            <td><button onclick="saveLog('${ex.muscoli[0]}','${ex.nome}',3,10,'kg-${dayNum}-${i}')" class="glow-btn" style="padding:5px 10px; font-size:10px">LOG</button></td>
        </tr>`;
    });
    return html + "</tbody></table></div>";
}

async function saveLog(g, n, s, r, id) {
    const val = document.getElementById(id).value;
    if(!val) return alert("Metti il peso!");
    const { data: { user } } = await _sb.auth.getUser();
    await _sb.from('workout_logs').insert({ user_id: user.id, muscle_group: g, exercise_name: n, weight_lifted: val, sets: s, reps_done: r });
    alert("Salvato!");
}

async function updateDash() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data } = await _sb.from('workout_logs').select('*').eq('user_id', user.id);
    const vol = data ? data.reduce((acc, c) => acc + (parseFloat(c.weight_lifted) * c.reps_done * c.sets), 0) : 0;
    document.getElementById('total-volume').innerText = vol.toLocaleString() + " kg";
}

_sb.auth.getUser().then(({data}) => {
    if(data.user) {
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('auth-screen').classList.add('hidden');
        nav('dash');
    }
});