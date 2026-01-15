const SUPABASE_URL = "https://eckwueoihttjhygmeifo.supabase.co";
const SUPABASE_KEY = "sb_publishable_UAJR8pVZKF4CRjl2-URAcQ_Z3tRg3M3";
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MASTER_DB = [
    // PETTO (Spinta)
    { id: 1, nome: "Panca Piana Bilanciere", muscolo: "Petto", tipo: "Power", lvl: 1, reps: "5-6" },
    { id: 2, nome: "Panca Inclinata Manubri", muscolo: "Petto", tipo: "Hyper", lvl: 1, reps: "8-10" },
    { id: 3, nome: "Dips Parallele (Zavorra)", muscolo: "Petto", tipo: "Power", lvl: 2, reps: "6-8" },
    { id: 4, nome: "Croci ai Cavi 30°", muscolo: "Petto", tipo: "Pump", lvl: 1, reps: "12-15" },
    { id: 5, nome: "Chest Press Hammer", muscolo: "Petto", tipo: "Hyper", lvl: 1, reps: "10-12" },
    // SCHIENA (Tirata)
    { id: 6, nome: "Stacco da Terra Classico", muscolo: "Schiena", tipo: "Power", lvl: 2, reps: "3-5" },
    { id: 7, nome: "Trazioni Zavorrate", muscolo: "Schiena", tipo: "Power", lvl: 2, reps: "6-8" },
    { id: 8, nome: "Rematore Bilanciere", muscolo: "Schiena", tipo: "Power", lvl: 1, reps: "8" },
    { id: 9, nome: "Lat Machine Presa V", muscolo: "Schiena", tipo: "Hyper", lvl: 1, reps: "10-12" },
    { id: 10, nome: "Pulley Basso Corda", muscolo: "Schiena", tipo: "Pump", lvl: 1, reps: "15" },
    // GAMBE
    { id: 11, nome: "Back Squat", muscolo: "Gambe", tipo: "Power", lvl: 1, reps: "5-6" },
    { id: 12, nome: "Leg Press 45°", muscolo: "Gambe", tipo: "Hyper", lvl: 1, reps: "10-12" },
    { id: 13, nome: "Hack Squat", muscolo: "Gambe", tipo: "Hyper", lvl: 2, reps: "8-10" },
    { id: 14, nome: "Stacco Rumeno", muscolo: "Gambe", tipo: "Power", lvl: 2, reps: "8" },
    { id: 15, nome: "Leg Extension (Peak)", muscolo: "Gambe", tipo: "Pump", lvl: 1, reps: "20" },
    // SPALLE / BRACCIA
    { id: 16, nome: "Military Press", muscolo: "Spalle", tipo: "Power", lvl: 1, reps: "6" },
    { id: 17, nome: "Alzate Laterali Cavo", muscolo: "Spalle", tipo: "Pump", lvl: 1, reps: "15" },
    { id: 18, nome: "Curl EZ Scott", muscolo: "Braccia", tipo: "Hyper", lvl: 1, reps: "10" },
    { id: 19, nome: "French Press", muscolo: "Braccia", tipo: "Hyper", lvl: 2, reps: "10" }
];

// Inizializzazione e Auth (Logica Standard Supabase)
async function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const { data, error } = await _sb.auth.signInWithPassword({ email, password: pass });
    if (error) await _sb.auth.signUp({ email, password: pass });
    location.reload();
}

async function saveProfileData() {
    const { data: { user } } = await _sb.auth.getUser();
    const payload = {
        id: user.id,
        training_days: parseInt(document.getElementById('f-days').value),
        session_duration: parseInt(document.getElementById('f-duration').value),
        experience_level: document.getElementById('f-exp').value,
        goal: document.getElementById('f-goal').value,
        weak_point: document.getElementById('f-weak').value
    };
    await _sb.from('profiles').upsert(payload);
    nav('workout-gen');
}

async function generateNeuralWorkout() {
    const { data: { user } } = await _sb.auth.getUser();
    const { data: p } = await _sb.from('profiles').select('*').eq('id', user.id).single();

    // FILTRO NEURALE
    // Selezioniamo prima gli esercizi per il punto carente
    let pool = MASTER_DB.filter(ex => {
        const lvlMatch = (p.experience_level === 'beginner') ? ex.lvl === 1 : true;
        return lvlMatch;
    });

    // Costruiamo la sessione: Forza -> Ipertrofia -> Pump
    let session = [];
    const targetSize = Math.floor(p.session_duration / 8); // ~11 esercizi per 90 min

    // 1. Forza (Punto Carente o Fondamentali)
    session.push(...pool.filter(ex => ex.tipo === "Power" && ex.muscolo === p.weak_point).slice(0, 2));
    session.push(...pool.filter(ex => ex.tipo === "Power" && ex.muscolo !== p.weak_point).slice(0, 2));

    // 2. Ipertrofia (Mix)
    session.push(...pool.filter(ex => ex.tipo === "Hyper").sort(() => 0.5 - Math.random()).slice(0, 4));

    // 3. Pump (Finale)
    session.push(...pool.filter(ex => ex.tipo === "Pump").slice(0, 3));

    // Rendering
    let html = `<div class="container"><h2>NEURAL PROTOCOL: ACTIVE</h2>`;
    session.slice(0, targetSize).forEach(ex => {
        html += `
            <div class="exercise-card ${ex.muscolo === p.weak_point ? 'priority' : ''}">
                <div>
                    <div class="stat-label">${ex.muscolo}</div>
                    <div class="stat-value">${ex.nome}</div>
                </div>
                <div>
                    <div class="stat-label">Serie x Reps</div>
                    <div class="stat-value">${ex.tipo === 'Power' ? '4 x '+ex.reps : '3 x '+ex.reps}</div>
                </div>
                <input type="number" placeholder="Kg" class="kg-input">
                <button class="log-btn" onclick="saveLog()">LOG</button>
            </div>`;
    });
    document.getElementById('workout-gen').innerHTML = html + `</div>`;
}

function nav(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if(id === 'workout-gen') generateNeuralWorkout();
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