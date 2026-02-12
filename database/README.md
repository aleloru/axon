# AXON PRO - Database Setup

## 🚀 Come configurare il database

1. **Vai su Supabase Dashboard**
   - https://supabase.com/dashboard
   - Seleziona il progetto `eckwueoihttjhygmeifo`

2. **Apri SQL Editor**
   - Nel menu laterale, clicca su "SQL Editor"
   - Clicca su "New query"

3. **Esegui lo script**
   - Copia tutto il contenuto di `setup.sql`
   - Incollalo nell'editor
   - Clicca "Run" (o premi Ctrl+Enter)

4. **Verifica**
   - Vai su "Table Editor"
   - Dovresti vedere le tabelle:
     - `profiles`
     - `workout_plans`
     - `workout_sessions`
     - `exercise_logs`

## 📊 Struttura Database

### `profiles`
Profilo utente completo con dati personali, obiettivi, limitazioni e stile di vita.

### `workout_plans`
Piani di allenamento generati dall'AI basati sul profilo utente.

### `workout_sessions`
Cronologia delle sessioni di allenamento completate.

### `exercise_logs`
Log dettagliato di ogni esercizio (peso, reps, pause) per ogni sessione.

## 🔒 Sicurezza

Tutte le tabelle hanno Row Level Security (RLS) abilitato.
Gli utenti possono accedere solo ai propri dati.
