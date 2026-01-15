const SUPABASE_URL = "https://eckwueoihttjhygmeifo.supabase.co";
const SUPABASE_KEY = "sb_publishable_UAJR8pVZKF4CRjl2-URAcQ_Z3tRg3M3";
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


const ESERCIZI_DB = [
    { nome: "Panca Piana Bilanciere", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["forza", "ipertrofia"], intensita: 3, tipo: "base" },
    { nome: "Panca Inclinata Manubri", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" },
    { nome: "Dips Parallele (Zavorrate)", muscoli: ["Petto"], livelloMin: "intermediate", obiettivo: ["forza"], intensita: 3, tipo: "base" },
    { nome: "Croci ai Cavi", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento" },
    { nome: "Squat Bilanciere", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["forza", "ipertrofia"], intensita: 3, tipo: "base" },
    { nome: "Hack Squat", muscoli: ["Gambe"], livelloMin: "intermediate", obiettivo: ["ipertrofia"], intensita: 3, tipo: "base" },
    { nome: "Leg Press 45°", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" },
    { nome: "Stacco Rumeno", muscoli: ["Gambe"], livelloMin: "intermediate", obiettivo: ["forza", "ipertrofia"], intensita: 3, tipo: "base" },
    { nome: "Leg Extension", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento" },
    { nome: "Trazioni alla Sbarra", muscoli: ["Schiena"], livelloMin: "intermediate", obiettivo: ["forza", "ipertrofia"], intensita: 3, tipo: "base" },
    { nome: "Rematore Bilanciere", muscoli: ["Schiena"], livelloMin: "intermediate", obiettivo: ["forza", "ipertrofia"], intensita: 3, tipo: "base" },
    { nome: "Lat Machine", muscoli: ["Schiena"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" },
    { nome: "Pulley Basso", muscoli: ["Schiena"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" },
    { nome: "Military Press", muscoli: ["Spalle"], livelloMin: "intermediate", obiettivo: ["forza"], intensita: 3, tipo: "base" },
    { nome: "Alzate Laterali", muscoli: ["Spalle"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento" },
    { nome: "Facepull", muscoli: ["Spalle"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento" },
    { nome: "Curl Bilanciere EZ", muscoli: ["Braccia"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" },
    { nome: "Pushdown Tricipiti", muscoli: ["Braccia"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento" },
    { nome: "French Press", muscoli: ["Braccia"], livelloMin: "intermediate", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" }
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

    let filtrati = ESERCIZI_DB.filter(ex => 
        (LIVELLI.indexOf(p.experience_level) >= LIVELLI.indexOf(ex.livelloMin)) && 
        ex.obiettivo.includes(p.goal)
    );

    let pesati = filtrati.map(ex => {
        let score = (ex.muscoli.includes(p.weak_point)) ? 50 : 0;
        if(ex.tipo === "base") score += 20;
        return {...ex, score: score + Math.random() * 10};
    }).sort((a, b) => b.score - a.score);

    // LOGICA VOLUME: Se dura 90 minuti, assegna circa 10 esercizi
    let sessionSize = Math.max(6, Math.floor(p.session_duration / 8.5));
    let selezione = pesati.slice(0, sessionSize);

    let html = `
        <div class="glass-card">
            <h2>Protocollo Neural v3: ${p.goal.toUpperCase()}</h2>
            <p>Sessione da ${p.session_duration} min | Focus: ${p.weak_point}</p>
            <table class="workout-table">
                <thead><tr><th>Esercizio</th><th>Target</th><th>Serie x Rep</th><th>Rest</th><th>Kg</th><th>Log</th></tr></thead>
                <tbody>`;

    selezione.forEach((ex, i) => {
        let sets = (i < 3 && p.goal === 'forza') ? 5 : 3;
        let reps = (i < 3 && p.goal === 'forza') ? "5" : "10-12";
        if(ex.tipo === "isolamento") reps = "15";

        html += `<tr class="${ex.muscoli.includes(p.weak_point) ? 'weak-point-row' : ''}">
            <td><strong>${ex.nome}</strong></td>
            <td><span class="tag">${ex.muscoli[0]}</span></td>
            <td>${sets} x ${reps}</td>
            <td>${p.goal === 'forza' ? '3m' : '90s'}</td>
            <td><input type="number" id="kg-${i}" class="kg-input"></td>
            <td><button onclick="saveLog('${ex.muscoli[0]}','${ex.nome}',${sets},10,'kg-${i}')" class="log-btn">ADD</button></td>
        </tr>`;
    });
    document.getElementById('workout-gen').innerHTML = html + "</tbody></table></div>";
}

async function saveLog(g, n, s, r, id) {
    const kg = document.getElementById(id).value;
    const { data: { user } } = await _sb.auth.getUser();
    await _sb.from('workout_logs').insert({ user_id: user.id, muscle_group: g, exercise_name: n, weight_lifted: kg, sets: s, reps_done: r });
    alert("Volume registrato!");
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