const SUPABASE_URL = "https://eckwueoihttjhygmeifo.supabase.co";
const SUPABASE_KEY = "sb_publishable_UAJR8pVZKF4CRjl2-URAcQ_Z3tRg3M3"; // Assicurati sia la ANON PUBLIC KEY
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESERCIZI_DB = [
    // PETTO (Spinta)
    { nome: "Panca Piana Bilanciere", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["forza", "ipertrofia"], intensita: 3, tipo: "base", focus: "spinta" },
    { nome: "Panca Inclinata Manubri", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base", focus: "spinta" },
    { nome: "Dips Parallele", muscoli: ["Petto"], livelloMin: "intermediate", obiettivo: ["forza"], intensita: 3, tipo: "base", focus: "spinta" },
    { nome: "Croci ai Cavi", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento", focus: "spinta" },
    { nome: "Chest Press Machine", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base", focus: "spinta" },
    // SCHIENA (Tirata)
    { nome: "Stacco da Terra", muscoli: ["Schiena"], livelloMin: "intermediate", obiettivo: ["forza"], intensita: 3, tipo: "base", focus: "tirata" },
    { nome: "Trazioni alla Sbarra", muscoli: ["Schiena"], livelloMin: "intermediate", obiettivo: ["forza", "ipertrofia"], intensita: 3, tipo: "base", focus: "tirata" },
    { nome: "Rematore Bilanciere", muscoli: ["Schiena"], livelloMin: "intermediate", obiettivo: ["forza", "ipertrofia"], intensita: 3, tipo: "base", focus: "tirata" },
    { nome: "Lat Machine", muscoli: ["Schiena"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base", focus: "tirata" },
    { nome: "Pulley Basso", muscoli: ["Schiena"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base", focus: "tirata" },
    // GAMBE
    { nome: "Squat Bilanciere", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["forza", "ipertrofia"], intensita: 3, tipo: "base", focus: "gambe" },
    { nome: "Leg Press 45°", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base", focus: "gambe" },
    { nome: "Hack Squat", muscoli: ["Gambe"], livelloMin: "intermediate", obiettivo: ["ipertrofia"], intensita: 3, tipo: "base", focus: "gambe" },
    { nome: "Leg Extension", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento", focus: "gambe" },
    { nome: "Leg Curl", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento", focus: "gambe" },
    // SPALLE
    { nome: "Military Press", muscoli: ["Spalle"], livelloMin: "intermediate", obiettivo: ["forza"], intensita: 3, tipo: "base", focus: "spinta" },
    { nome: "Alzate Laterali", muscoli: ["Spalle"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento", focus: "spinta" },
    { nome: "Facepull", muscoli: ["Spalle"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento", focus: "tirata" },
    // BRACCIA
    { nome: "Curl Bilanciere EZ", muscoli: ["Braccia"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base", focus: "tirata" },
    { nome: "Pushdown Tricipiti", muscoli: ["Braccia"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento", focus: "spinta" }
];

const LIVELLI = ["beginner", "intermediate", "advanced"];

async function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const { data, error } = await _sb.auth.signInWithPassword({ email, password: pass });
    if (error) {
        await _sb.auth.signUp({ email, password: pass });
        alert("Account creato. Se è la prima volta, conferma l'email!");
    } else location.reload();
}

async function logout() { await _sb.auth.signOut(); location.reload(); }

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

async function generateNeuralWorkout() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data: p } = await _sb.from('profiles').select('*').eq('id', user.id).single();
    
    let container = document.getElementById('workout-gen');
    container.innerHTML = `<h1>Protocollo Settimanale: ${p.goal.toUpperCase()}</h1>`;

    for (let d = 1; d <= p.training_days; d++) {
        container.innerHTML += generateDaySession(p, d);
    }
}

function generateDaySession(p, dayNumber) {
    // Rotazione Focus: Giorno 1 Spinta/Gambe, Giorno 2 Tirata/Spalle, Giorno 3 Spinta/Gambe, etc.
    let focusDelGiorno = (dayNumber % 2 !== 0) ? ["spinta", "gambe"] : ["tirata", "spalle"];
    
    let filtrati = ESERCIZI_DB.filter(ex => 
        (LIVELLI.indexOf(p.experience_level) >= LIVELLI.indexOf(ex.livelloMin)) && 
        ex.obiettivo.includes(p.goal) &&
        (focusDelGiorno.includes(ex.focus) || ex.muscoli.includes(p.weak_point))
    );

    let pesati = filtrati.map(ex => {
        let score = (ex.muscoli.includes(p.weak_point)) ? 100 : 0;
        if(ex.tipo === "base") score += 30;
        return {...ex, score: score + Math.random() * 40};
    }).sort((a, b) => b.score - a.score);

    let sessionSize = Math.max(5, Math.floor(p.session_duration / 9));
    let selezione = pesati.slice(0, sessionSize);

    let html = `
        <div class="glass-card">
            <h3 style="color: var(--axon-cyan); border-bottom: 1px solid var(--border); padding-bottom:10px;">GIORNO ${dayNumber} - FOCUS ${focusDelGiorno.join(" & ").toUpperCase()}</h3>
            <table class="workout-table">
                <thead><tr><th>Esercizio</th><th>Set x Rep</th><th>Rest</th><th>Kg</th><th>Log</th></tr></thead>
                <tbody>`;

    selezione.forEach((ex, i) => {
        let sets = (ex.tipo === "base") ? 4 : 3;
        let reps = (p.goal === "forza" && ex.tipo === "base") ? "5-6" : "10-12";
        if(ex.tipo === "isolamento") reps = "15";

        html += `<tr class="${ex.muscoli.includes(p.weak_point) ? 'weak-point-row' : ''}">
            <td><strong>${ex.nome}</strong><br><span class="tag">${ex.muscoli[0]}</span></td>
            <td>${sets} x ${reps}</td>
            <td>${ex.tipo === "base" ? '120s' : '60s'}</td>
            <td><input type="number" id="kg-${dayNumber}-${i}" class="kg-input"></td>
            <td><button onclick="saveLog('${ex.muscoli[0]}','${ex.nome}',${sets},10,'kg-${dayNumber}-${i}')" class="glow-btn" style="padding:5px; font-size:10px;">ADD</button></td>
        </tr>`;
    });
    return html + "</tbody></table></div>";
}

async function saveLog(g, n, s, r, id) {
    const kg = document.getElementById(id).value;
    if(!kg) return alert("Inserisci il peso!");
    const { data: { user } } = await _sb.auth.getUser();
    await _sb.from('workout_logs').insert({ user_id: user.id, muscle_group: g, exercise_name: n, weight_lifted: kg, sets: s, reps_done: r });
    alert("Dato salvato!");
}

async function updateDash() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data } = await _sb.from('workout_logs').select('*').eq('user_id', user.id);
    const vol = data ? data.reduce((acc, c) => acc + (c.weight_lifted * c.reps_done * c.sets), 0) : 0;
    document.getElementById('total-volume').innerText = vol.toLocaleString() + " kg";
}

async function init() {
    const { data: { user } } = await _sb.auth.getUser();
    if(user) { 
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('auth-screen').classList.add('hidden');
        nav('dash'); 
    }
}
init();