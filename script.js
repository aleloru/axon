const SUPABASE_URL = "https://eckwueoihttjhygmeifo.supabase.co";
const SUPABASE_KEY = "sb_publishable_UAJR8pVZKF4CRjl2-URAcQ_Z3tRg3M3";
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESERCIZI_DB = [
    { nome: "Panca Piana", muscoli: ["Petto"], sports: ["palestra", "combat"] },
    { nome: "Squat Bilanciere", muscoli: ["Gambe"], sports: ["palestra", "calcio", "combat"] },
    { nome: "Stacco Terra", muscoli: ["Schiena"], sports: ["palestra", "combat"] },
    { nome: "Trazioni Sbarra", muscoli: ["Schiena"], sports: ["palestra", "tennis", "combat"] },
    { nome: "Military Press", muscoli: ["Spalle"], sports: ["palestra", "tennis"] },
    { nome: "Box Jump", muscoli: ["Gambe"], sports: ["calcio", "combat"] },
    { nome: "Rotazione Core", muscoli: ["Braccia"], sports: ["tennis", "calcio", "combat"] },
    { nome: "Affondi", muscoli: ["Gambe"], sports: ["calcio", "corsa", "palestra"] },
    { nome: "Plank", muscoli: ["Braccia"], sports: ["corsa", "tennis", "calcio"] }
];

const GRUPPI = ["Petto", "Schiena", "Gambe", "Spalle", "Braccia"];

async function logout() {
    await _sb.auth.signOut();
    location.reload();
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const { error } = await _sb.auth.signInWithPassword({ email, password: pass });
    if (error) {
        await _sb.auth.signUp({ email, password: pass });
        alert("Controlla la mail!");
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
        sport: document.getElementById('f-sport').value // QUESTO SALVA LO SPORT
    };
    await _sb.from('profiles').upsert(profile);
    nav('workout-gen');
}

async function generateNeuralWorkout() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data: p, error } = await _sb.from('profiles').select('*').eq('id', user.id).single();
    
    if (error || !p) return nav('profile-setup');

    // FIX SICUREZZA: Se sport è undefined, usa "palestra" di default
    const userSport = p.sport || "palestra";

    let container = document.getElementById('workout-gen');
    container.innerHTML = `<div class="glass-card"><h1>PROTOCOLLO: ${userSport.toUpperCase()}</h1></div>`;

    for (let d = 1; d <= p.training_days; d++) {
        container.innerHTML += generateDay(p, d, userSport);
    }
}

function generateDay(p, dayNum, userSport) {
    let sessione = [];
    
    // 1. Esercizi per lo sport
    let esSport = ESERCIZI_DB.filter(ex => ex.sports.includes(userSport));
    sessione.push(...esSport.sort(() => 0.5 - Math.random()).slice(0, 2));

    // 2. Punto carente
    let esCarente = ESERCIZI_DB.filter(ex => ex.muscoli.includes(p.weak_point));
    sessione.push(...esCarente.sort(() => 0.5 - Math.random()).slice(0, 2));

    // 3. Altro muscolo
    let altro = GRUPPI[dayNum % GRUPPI.length];
    let esAltro = ESERCIZI_DB.filter(ex => ex.muscoli.includes(altro));
    sessione.push(...esAltro.slice(0, 2));

    let selezione = Array.from(new Set(sessione)).slice(0, 7);

    let html = `
        <div class="glass-card">
            <h3>GIORNO ${dayNum}</h3>
            <table class="workout-table">
                <thead><tr><th>Esercizio</th><th>Muscolo</th><th>Log</th></tr></thead>
                <tbody>`;

    selezione.forEach((ex, i) => {
        html += `<tr class="${ex.muscoli.includes(p.weak_point) ? 'weak-point-row' : ''}">
            <td><strong>${ex.nome}</strong></td>
            <td><span class="tag">${ex.muscoli[0]}</span></td>
            <td><input type="number" id="kg-${dayNum}-${i}" style="width:50px"> <button onclick="saveLog('${ex.muscoli[0]}','${ex.nome}',3,10,'kg-${dayNum}-${i}')" class="glow-btn" style="padding:2px 5px; width:auto">ADD</button></td>
        </tr>`;
    });
    return html + "</tbody></table></div>";
}

async function saveLog(g, n, s, r, id) {
    const val = document.getElementById(id).value;
    if(!val) return alert("Metti peso!");
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

_sb.auth.onAuthStateChange((event, session) => {
    if (session) {
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('auth-screen').classList.add('hidden');
        nav('dash');
    }
});