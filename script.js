const SUPABASE_URL = "https://eckwueoihttjhygmeifo.supabase.co";
const SUPABASE_KEY = "sb_publishable_UAJR8pVZKF4CRjl2-URAcQ_Z3tRg3M3";
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let authMode = 'login';

function toggleAuthMode(mode) {
    authMode = mode;
    document.getElementById('tgl-login').classList.toggle('active', mode === 'login');
    document.getElementById('tgl-reg').classList.toggle('active', mode === 'reg');
    document.getElementById('auth-title').innerText = mode === 'login' ? 'Bentornato' : 'Crea Account';
    document.getElementById('btn-auth').innerText = mode === 'login' ? 'ACCEDI' : 'REGISTRATI';
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    if (authMode === 'login') {
        const { error } = await _sb.auth.signInWithPassword({ email, password: pass });
        if (error) alert("Errore: " + error.message);
    } else {
        const { error } = await _sb.auth.signUp({ email, password: pass });
        if (error) alert("Errore: " + error.message);
        else alert("Registrazione completata! Ora compila il profilo.");
    }
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
        weak_point: document.getElementById('f-weak').value,
        sport: document.getElementById('f-sport').value,
        weeks_duration: parseInt(document.getElementById('f-weeks').value),
        created_at: new Date().toISOString()
    };
    await _sb.from('profiles').upsert(profile);
    nav('workout-gen');
}

const ESERCIZI_DB = [
    { nome: "Panca Piana", muscoli: ["Petto"], sports: ["palestra", "combat"] },
    { nome: "Squat", muscoli: ["Gambe"], sports: ["palestra", "calcio", "combat"] },
    { nome: "Trazioni", muscoli: ["Schiena"], sports: ["palestra", "combat"] },
    { nome: "Military Press", muscoli: ["Spalle"], sports: ["palestra"] }
];

async function generateNeuralWorkout() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data: p } = await _sb.from('profiles').select('*').eq('id', user.id).single();
    if (!p) return nav('profile-setup');

    let container = document.getElementById('workout-gen');
    container.innerHTML = `<div class="glass-panel"><h2>PROTOCOLLO ${p.sport.toUpperCase()}</h2></div>`;

    const userSeed = user.id.charCodeAt(0) + user.id.charCodeAt(1);

    for (let d = 1; d <= p.training_days; d++) {
        let esGiorno = [...ESERCIZI_DB].slice(0, 4); // Esempio fisso
        let html = `<div class="glass-panel" style="margin-top:20px"><h3>Giorno ${d}</h3><table style="width:100%">`;
        esGiorno.forEach((ex, i) => {
            html += `<tr><td style="padding:10px 0">${ex.nome}</td><td><input type="number" id="kg-${d}-${i}" style="width:60px; margin:0"></td>
            <td><button onclick="saveLog('${ex.muscoli[0]}','${ex.nome}',3,10,'kg-${d}-${i}')" class="main-btn" style="padding:5px">LOG</button></td></tr>`;
        });
        container.innerHTML += html + `</table></div>`;
    }
}

async function saveLog(g, n, s, r, id) {
    const val = document.getElementById(id).value;
    const { data: { user } } = await _sb.auth.getUser();
    await _sb.from('workout_logs').insert({ user_id: user.id, muscle_group: g, exercise_name: n, weight_lifted: val, sets: s, reps_done: r });
    alert("Salvato!");
}

_sb.auth.onAuthStateChange((event, session) => {
    if (session) {
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('auth-screen').classList.add('hidden');
        _sb.from('profiles').select('*').eq('id', session.user.id).single().then(({data}) => {
            if(data) nav('workout-gen'); else nav('profile-setup');
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