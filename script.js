const SUPABASE_URL = "https://eckwueoihttjhygmeifo.supabase.co";
const SUPABASE_KEY = "sb_publishable_UAJR8pVZKF4CRjl2-URAcQ_Z3tRg3M3";
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isLoginMode = true;

const EX_DATABASE = {
    Petto: ["Panca Piana", "Dips", "Croci Cavi"],
    Schiena: ["Trazioni", "Rematore", "Lat Machine"],
    Gambe: ["Squat", "Leg Press", "Leg Curl"],
    Spalle: ["Military Press", "Alzate Laterali"],
    Braccia: ["Curl Bilanciere", "Pushdown Tricipiti"]
};

// AUTH
function toggleAuth() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Neural Access" : "Create Account";
    document.getElementById('auth-btn').innerText = isLoginMode ? "ACCEDI" : "REGISTRATI";
    document.getElementById('auth-toggle-text').innerHTML = isLoginMode ? 
        'Non hai un account? <span onclick="toggleAuth()" style="color:#00d2ff; cursor:pointer;">Registrati</span>' : 
        'Hai un account? <span onclick="toggleAuth()" style="color:#00d2ff; cursor:pointer;">Accedi</span>';
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const { error } = isLoginMode ? 
        await _sb.auth.signInWithPassword({ email, password: pass }) : 
        await _sb.auth.signUp({ email, password: pass });
    if (error) alert(error.message); else location.reload();
}

// NAVIGATION
function nav(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if(id === 'dash') updateDash();
}

// PROFILE (Fixato con experience_level)
async function saveProfileData() {
    const { data: { user } } = await _sb.auth.getUser();
    const profile = {
        id: user.id,
        training_days: document.getElementById('f-days').value,
        session_duration: document.getElementById('f-duration').value,
        experience_level: document.getElementById('f-exp').value,
        goal: document.getElementById('f-goal').value,
        weak_point: document.getElementById('f-weak').value
    };
    const { error } = await _sb.from('profiles').upsert(profile);
    if(error) alert("Errore DB: " + error.message); else nav('workout-gen');
}

// GENERATOR
async function generateNeuralWorkout() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data: p } = await _sb.from('profiles').select('*').eq('id', user.id).single();

    let html = `<table class="workout-table"><thead><tr><th>Esercizio</th><th>Set x Rep</th><th>Rest</th><th>Kg</th><th>Azione</th></tr></thead><tbody>`;

    Object.keys(EX_DATABASE).forEach(group => {
        let count = (group === p.weak_point) ? 2 : 1;
        for(let i=0; i<count; i++) {
            const ex = EX_DATABASE[group][i % EX_DATABASE[group].length];
            const sets = p.experience_level === 'advanced' ? 4 : 3;
            const reps = p.goal === 'forza' ? 6 : 12;
            const rest = p.goal === 'forza' ? '3m' : '90s';

            html += `<tr>
                <td><strong>${ex}</strong></td>
                <td>${sets} x ${reps}</td>
                <td>${rest}</td>
                <td><input type="number" id="w-${ex}" style="width:70px"></td>
                <td><button onclick="saveLog('${group}','${ex}',${sets},${reps},'${rest}','w-${ex}')" class="glow-btn" style="padding:5px">LOG</button></td>
            </tr>`;
        }
    });
    document.getElementById('workout-display').innerHTML = html + `</tbody></table>`;
}

async function saveLog(group, name, sets, reps, rest, inputId) {
    const kg = document.getElementById(inputId).value;
    if(!kg) return;
    const { data: { user } } = await _sb.auth.getUser();
    await _sb.from('workout_logs').insert({
        user_id: user.id, muscle_group: group, exercise_name: name,
        sets: sets, reps_done: reps, weight_lifted: kg, rest_time: rest
    });
    alert("Dato salvato!");
    updateDash();
}

async function updateDash() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data } = await _sb.from('workout_logs').select('*').eq('user_id', user.id);
    const total = data ? data.reduce((acc, curr) => acc + (curr.weight_lifted * curr.reps_done * curr.sets), 0) : 0;
    document.getElementById('total-volume').innerText = `${total.toLocaleString()} kg`;
}

async function init() {
    const { data: { user } } = await _sb.auth.getUser();
    if(user) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('sidebar').classList.remove('hidden');
        const { data: p } = await _sb.from('profiles').select('*').eq('id', user.id).single();
        if(!p) nav('profile-setup'); else nav('dash');
    }
}
async function logout() { await _sb.auth.signOut(); location.reload(); }
init();