const SUPABASE_URL = "INSERISCI_URL_QUI";
const SUPABASE_KEY = "INSERISCI_KEY_QUI";
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESERCIZI_DB = [
  // PETTO
  { nome: "Panca Piana Bilanciere", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["forza", "ipertrofia"], intensita: 3, tipo: "base" },
  { nome: "Panca Inclinata Manubri", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" },
  { nome: "Chest Press Machine", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" },
  { nome: "Dips Parallele", muscoli: ["Petto"], livelloMin: "intermediate", obiettivo: ["forza"], intensita: 3, tipo: "base" },
  { nome: "Croci ai Cavi alti", muscoli: ["Petto"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento" },
  // SCHIENA
  { nome: "Stacco da Terra Classico", muscoli: ["Schiena"], livelloMin: "intermediate", obiettivo: ["forza"], intensita: 3, tipo: "base" },
  { nome: "Trazioni alla Sbarra", muscoli: ["Schiena"], livelloMin: "intermediate", obiettivo: ["forza", "ipertrofia"], intensita: 3, tipo: "base" },
  { nome: "Rematore Bilanciere", muscoli: ["Schiena"], livelloMin: "intermediate", obiettivo: ["forza", "ipertrofia"], intensita: 3, tipo: "base" },
  { nome: "Lat Machine avanti", muscoli: ["Schiena"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" },
  { nome: "Pulley Basso", muscoli: ["Schiena"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" },
  // GAMBE
  { nome: "Squat Bilanciere", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["forza", "ipertrofia"], intensita: 3, tipo: "base" },
  { nome: "Leg Press 45°", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" },
  { nome: "Hack Squat", muscoli: ["Gambe"], livelloMin: "intermediate", obiettivo: ["ipertrofia"], intensita: 3, tipo: "base" },
  { nome: "Leg Extension", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento" },
  { nome: "Leg Curl", muscoli: ["Gambe"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento" },
  // SPALLE
  { nome: "Military Press", muscoli: ["Spalle"], livelloMin: "intermediate", obiettivo: ["forza"], intensita: 3, tipo: "base" },
  { nome: "Shoulder Press Manubri", muscoli: ["Spalle"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" },
  { nome: "Alzate Laterali", muscoli: ["Spalle"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento" },
  { nome: "Facepull", muscoli: ["Spalle"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento" },
  // BRACCIA
  { nome: "Curl Bilanciere EZ", muscoli: ["Braccia"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" },
  { nome: "Hammer Curl", muscoli: ["Braccia"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento" },
  { nome: "Pushdown Corda", muscoli: ["Braccia"], livelloMin: "beginner", obiettivo: ["ipertrofia"], intensita: 1, tipo: "isolamento" },
  { nome: "French Press", muscoli: ["Braccia"], livelloMin: "intermediate", obiettivo: ["ipertrofia"], intensita: 2, tipo: "base" }
];

const LIVELLI = ["beginner", "intermediate", "advanced"];

// AUTH & NAV
async function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const { error } = await _sb.auth.signInWithPassword({ email, password: pass });
    if (error) {
        const { error: signUpErr } = await _sb.auth.signUp({ email, password: pass });
        if(signUpErr) alert(signUpErr.message); else alert("Controlla email!");
    } else location.reload();
}

function nav(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if(id === 'workout-gen') generateNeuralWorkout();
    if(id === 'dash') updateDash();
}

// LOGICA CORE
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
    await _sb.from('profiles').upsert(profile);
    nav('workout-gen');
}

async function generateNeuralWorkout() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data: p } = await _sb.from('profiles').select('*').eq('id', user.id).single();

    // Filtro e Punteggio
    let filtrati = ESERCIZI_DB.filter(ex => 
        (LIVELLI.indexOf(p.experience_level) >= LIVELLI.indexOf(ex.livelloMin)) && 
        ex.obiettivo.includes(p.goal)
    );

    let pesati = filtrati.map(ex => {
        let score = (ex.muscoli.includes(p.weak_point)) ? 15 : 0;
        if(ex.tipo === "base") score += 5;
        return {...ex, score};
    }).sort((a, b) => b.score - a.score);

    let sessionSize = Math.floor(p.session_duration / 10);
    let selezione = pesati.slice(0, sessionSize);

    let html = `<h2>Protocollo Neural: ${p.goal.toUpperCase()}</h2><table class="workout-table"><thead><tr><th>Esercizio</th><th>Set x Rep</th><th>Rest</th><th>Kg</th><th>Log</th></tr></thead><tbody>`;

    selezione.forEach(ex => {
        let sets = p.goal === 'forza' ? 5 : 3;
        let reps = p.goal === 'forza' ? '5' : '10-12';
        let rest = p.goal === 'forza' ? '3m' : '90s';
        
        html += `<tr class="${ex.muscoli.includes(p.weak_point) ? 'weak-point-row' : ''}">
            <td><strong>${ex.nome}</strong><br><span class="tag">${ex.muscoli[0]}</span></td>
            <td>${sets} x ${reps}</td>
            <td>${rest}</td>
            <td><input type="number" id="k-${ex.nome.replace(/\s/g,'')}" style="width:50px"></td>
            <td><button onclick="saveLog('${ex.muscoli[0]}','${ex.nome}',${sets},10,'${rest}','k-${ex.nome.replace(/\s/g,'')}')">ADD</button></td>
        </tr>`;
    });
    document.getElementById('workout-display').innerHTML = html + "</tbody></table>";
}

async function saveLog(g, n, s, r, rs, id) {
    const kg = document.getElementById(id).value;
    const { data: { user } } = await _sb.auth.getUser();
    await _sb.from('workout_logs').insert({ user_id: user.id, muscle_group: g, exercise_name: n, weight_lifted: kg, sets: s, reps_done: r });
    alert("Dato salvato nel Neural Core!");
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