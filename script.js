const SUPABASE_URL = "https://eckwueoihttjhygmeifo.supabase.co";
const SUPABASE_KEY = "sb_publishable_UAJR8pVZKF4CRjl2-URAcQ_Z3tRg3M3";
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESERCIZI_DB = [
    { nome: "Panca Piana", muscoli: ["Petto"], sports: ["palestra", "combat"] },
    { nome: "Squat", muscoli: ["Gambe"], sports: ["palestra", "calcio", "combat"] },
    { nome: "Trazioni Sbarra", muscoli: ["Schiena"], sports: ["palestra", "combat"] },
    { nome: "Military Press", muscoli: ["Spalle"], sports: ["palestra", "tennis"] },
    { nome: "Dips", muscoli: ["Petto", "Braccia"], sports: ["palestra", "combat"] },
    { nome: "Affondi Bulcari", muscoli: ["Gambe"], sports: ["calcio", "palestra"] },
    { nome: "Rematore Manubrio", muscoli: ["Schiena"], sports: ["palestra", "combat"] }
];

function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function nav(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    target.classList.remove('hidden');
    if(id === 'workout-gen') generateNeuralWorkout();
    if(id === 'dash') updateDash();
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    if(!email || !pass) return alert("Inserisci dati validi");

    const { data, error } = await _sb.auth.signInWithPassword({ email, password: pass });
    
    if (error) {
        // Se non esiste, prova a registrarlo
        const { error: signUpErr } = await _sb.auth.signUp({ email, password: pass });
        if(signUpErr) return alert("Errore: " + signUpErr.message);
        alert("Account creato! Sincronizza ora il tuo profilo.");
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
    const { error } = await _sb.from('profiles').upsert(profile);
    if (!error) nav('workout-gen');
}

async function generateNeuralWorkout() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data: p } = await _sb.from('profiles').select('*').eq('id', user.id).single();
    if (!p) return nav('profile-setup');

    const { data: logs } = await _sb.from('workout_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const userSeed = user.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

    let container = document.getElementById('workout-gen');
    container.innerHTML = `<div class="glass-card animate-in"><h2>PROTOCOLLO ${p.sport.toUpperCase()}</h2><p>Focus: ${p.weak_point}</p></div>`;

    for (let d = 1; d <= p.training_days; d++) {
        let daySeed = userSeed + d;
        let esGiorno = [...ESERCIZI_DB]
            .filter(ex => ex.sports.includes(p.sport) || ex.muscoli.includes(p.weak_point))
            .sort((a, b) => seededRandom(daySeed + a.nome.charCodeAt(0)) - seededRandom(daySeed + b.nome.charCodeAt(0)))
            .slice(0, 5);

        let html = `<div class="glass-card animate-in" style="animation-delay:${d*0.1}s"><h3>Giorno ${d}</h3><table class="workout-table">`;
        esGiorno.forEach((ex, i) => {
            const lastLog = logs?.find(l => l.exercise_name === ex.nome);
            html += `<tr><td><strong>${ex.nome}</strong><br><small>${lastLog ? 'Ultimo: '+lastLog.weight_lifted+'kg' : 'Inizia leggero'}</small></td>
            <td><input type="number" id="kg-${d}-${i}" class="kg-input" style="width:60px" placeholder="kg"></td>
            <td><button onclick="saveLog('${ex.muscoli[0]}','${ex.nome}',3,10,'kg-${d}-${i}')" class="glow-btn" style="padding:5px 10px; font-size:0.7rem">LOG</button></td></tr>`;
        });
        container.innerHTML += html + `</table></div>`;
    }
}

async function saveLog(g, n, s, r, id) {
    const val = document.getElementById(id).value;
    if(!val) return;
    const { data: { user } } = await _sb.auth.getUser();
    await _sb.from('workout_logs').insert({ user_id: user.id, muscle_group: g, exercise_name: n, weight_lifted: val, sets: s, reps_done: r, created_at: new Date().toISOString() });
    alert("Dato salvato.");
    generateNeuralWorkout();
}

_sb.auth.onAuthStateChange((event, session) => {
    if (session) {
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('auth-screen').classList.add('hidden');
        _sb.from('profiles').select('*').eq('id', session.user.id).single().then(({data}) => {
            if(data && data.training_days) nav('workout-gen'); else nav('profile-setup');
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