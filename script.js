const SUPABASE_URL = "https://eckwueoihttjhygmeifo.supabase.co";
const SUPABASE_KEY = "sb_publishable_UAJR8pVZKF4CRjl2-URAcQ_Z3tRg3M3";
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESERCIZI_DB = [
    { nome: "Panca Piana", muscoli: ["Petto"], sports: ["palestra", "combat"] },
    { nome: "Squat", muscoli: ["Gambe"], sports: ["palestra", "calcio", "combat"] },
    { nome: "Trazioni Sbarra", muscoli: ["Schiena"], sports: ["palestra", "combat"] },
    { nome: "Military Press", muscoli: ["Spalle"], sports: ["palestra", "tennis"] },
    { nome: "Affondi", muscoli: ["Gambe"], sports: ["calcio", "palestra"] },
    { nome: "Hammer Curl", muscoli: ["Braccia"], sports: ["palestra"] }
];

// Seeded random per generare sempre la stessa scheda per lo stesso utente
function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function nav(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if(id === 'workout-gen') generateNeuralWorkout();
    if(id === 'dash') updateDash();
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    if(!email || !pass) return alert("Inserisci credenziali.");

    const { error } = await _sb.auth.signInWithPassword({ email, password: pass });
    if (error) {
        // Se non esiste, lo registra
        const { error: regErr } = await _sb.auth.signUp({ email, password: pass });
        if(regErr) return alert("Errore Registrazione: " + regErr.message);
        alert("Account creato. Completa l'analisi biometrica.");
    }
}

async function saveProfileData() {
    const { data: { user } } = await _sb.auth.getUser();
    const profile = {
        id: user.id,
        training_days: parseInt(document.getElementById('f-days').value),
        weak_point: document.getElementById('f-weak').value,
        sport: document.getElementById('f-sport').value,
        weeks_duration: parseInt(document.getElementById('f-weeks').value),
        created_at: new Date().toISOString()
    };
    await _sb.from('profiles').upsert(profile);
    nav('workout-gen');
}

async function generateNeuralWorkout() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data: p } = await _sb.from('profiles').select('*').eq('id', user.id).single();
    if (!p) return nav('profile-setup');

    const { data: logs } = await _sb.from('workout_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const userSeed = user.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

    let container = document.getElementById('workout-gen');
    container.innerHTML = `<div class="glass-card animate-in"><h2>PROTOCOL: ${p.sport.toUpperCase()}</h2><p>Focus: ${p.weak_point}</p></div>`;

    for (let d = 1; d <= p.training_days; d++) {
        let daySeed = userSeed + d;
        let esGiorno = [...ESERCIZI_DB]
            .filter(ex => ex.sports.includes(p.sport) || ex.muscoli.includes(p.weak_point))
            .sort((a, b) => seededRandom(daySeed + a.nome.charCodeAt(0)) - seededRandom(daySeed + b.nome.charCodeAt(0)))
            .slice(0, 5);

        let html = `<div class="glass-card animate-in"><h3>GIORNO ${d}</h3><table style="width:100%; border-collapse:collapse;">`;
        esGiorno.forEach((ex, i) => {
            const lastLog = logs?.find(l => l.exercise_name === ex.nome);
            html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding:15px 0;"><strong>${ex.nome}</strong><br><small style="color:#64748b">${lastLog ? 'Ultimo: '+lastLog.weight_lifted+'kg' : 'RPE 7 Start'}</small></td>
                <td><input type="number" id="kg-${d}-${i}" style="width:50px; background:#000; border:1px solid var(--neon-cyan); color:#fff; padding:5px; border-radius:4px;"></td>
                <td style="text-align:right"><button onclick="saveLog('${ex.muscoli[0]}','${ex.nome}',3,10,'kg-${d}-${i}')" class="neon-btn" style="padding:5px 10px; font-size:0.6rem; width:auto;">LOG</button></td>
            </tr>`;
        });
        container.innerHTML += html + `</table></div>`;
    }
}

async function saveLog(g, n, s, r, id) {
    const val = document.getElementById(id).value;
    if(!val) return;
    const { data: { user } } = await _sb.auth.getUser();
    await _sb.from('workout_logs').insert({ user_id: user.id, muscle_group: g, exercise_name: n, weight_lifted: val, sets: s, reps_done: r, created_at: new Date().toISOString() });
    alert("Dato Archiviato.");
    generateNeuralWorkout();
}

_sb.auth.onAuthStateChange((event, session) => {
    if (session) {
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('auth-screen').classList.add('hidden');
        _sb.from('profiles').select('*').eq('id', session.user.id).single().then(({data}) => {
            if(data && data.training_days) nav('workout-gen'); 
            else nav('profile-setup');
        });
    }
});

async function logout() { await _sb.auth.signOut(); location.reload(); }
async function updateDash() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data } = await _sb.from('workout_logs').select('*').eq('user_id', user.id);
    const vol = data ? data.reduce((acc, c) => acc + (parseFloat(c.weight_lifted) * c.reps_done * c.sets), 0) : 0;
    document.getElementById('total-volume').innerText = vol.toLocaleString() + " kg";
}