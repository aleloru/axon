-- ============================================================================
-- AXON PRO - Database Schema Setup
-- ============================================================================
-- Esegui questo script nel SQL Editor di Supabase

-- ============================================================================
-- 1. PROFILES TABLE - Profilo utente completo
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Step 1: Dati personali
  age INTEGER,
  gender TEXT,
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  target_weight DECIMAL(5,2),
  body_fat DECIMAL(4,1),
  
  -- Step 2: Esperienza
  experience_level TEXT,
  training_history TEXT,
  known_exercises TEXT[],
  max_squat DECIMAL(5,2),
  max_bench DECIMAL(5,2),
  max_deadlift DECIMAL(5,2),
  
  -- Step 3: Obiettivi
  primary_goal TEXT,
  secondary_goals TEXT[],
  focus_areas TEXT[],
  timeline TEXT,
  
  -- Step 4: Disponibilità
  training_days INTEGER,
  session_duration INTEGER,
  equipment TEXT,
  preferred_time TEXT,
  workout_split TEXT,
  
  -- Step 5: Limitazioni
  injuries TEXT[],
  pain_level INTEGER,
  medical_notes TEXT,
  exercises_to_avoid TEXT[],
  
  -- Step 6: Lifestyle
  sleep_hours DECIMAL(3,1),
  sleep_quality TEXT,
  stress_level INTEGER,
  job_type TEXT,
  extra_activities TEXT[],
  cardio_preference TEXT,
  
  -- Step 7: Nutrizione
  diet_type TEXT,
  meals_per_day INTEGER,
  protein_intake INTEGER,
  supplements TEXT[],
  water_intake DECIMAL(3,1),
  
  -- Step 8: Preferenze
  training_style TEXT,
  intensity_preference TEXT,
  music_preference TEXT,
  motivation_level TEXT,
  additional_notes TEXT,
  
  -- Metadata
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. WORKOUT PLANS TABLE - Piani di allenamento generati
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  days_per_week INTEGER NOT NULL,
  
  -- Struttura workout (JSON)
  -- Format: { "day1": [...exercises], "day2": [...exercises], ... }
  exercises JSONB NOT NULL,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. WORKOUT SESSIONS TABLE - Sessioni di allenamento completate
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  workout_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. EXERCISE LOGS TABLE - Log dettagliato esercizi
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE NOT NULL,
  
  exercise_name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  
  -- Arrays per ogni serie
  sets INTEGER NOT NULL,
  reps INTEGER[] NOT NULL,
  weight DECIMAL[] NOT NULL,
  rest_seconds INTEGER[],
  
  -- Note per esercizio
  notes TEXT,
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 10),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. INDEXES per performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date 
  ON public.workout_sessions(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_session 
  ON public.exercise_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_workout_plans_user_active 
  ON public.workout_plans(user_id, is_active);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Workout plans policies
CREATE POLICY "Users can view own workout plans" 
  ON public.workout_plans FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout plans" 
  ON public.workout_plans FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout plans" 
  ON public.workout_plans FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout plans" 
  ON public.workout_plans FOR DELETE 
  USING (auth.uid() = user_id);

-- Workout sessions policies
CREATE POLICY "Users can view own workout sessions" 
  ON public.workout_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout sessions" 
  ON public.workout_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout sessions" 
  ON public.workout_sessions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout sessions" 
  ON public.workout_sessions FOR DELETE 
  USING (auth.uid() = user_id);

-- Exercise logs policies
CREATE POLICY "Users can view own exercise logs" 
  ON public.exercise_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions 
      WHERE id = exercise_logs.session_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own exercise logs" 
  ON public.exercise_logs FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions 
      WHERE id = exercise_logs.session_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own exercise logs" 
  ON public.exercise_logs FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions 
      WHERE id = exercise_logs.session_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own exercise logs" 
  ON public.exercise_logs FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions 
      WHERE id = exercise_logs.session_id 
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. TRIGGERS per updated_at
-- ============================================================================

-- Function per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per profiles
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger per workout_plans
CREATE TRIGGER update_workout_plans_updated_at 
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger per workout_sessions
CREATE TRIGGER update_workout_sessions_updated_at 
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DONE! 
-- ============================================================================
-- Ora hai:
-- ✅ 4 tabelle complete
-- ✅ RLS policies per sicurezza
-- ✅ Indexes per performance
-- ✅ Triggers per updated_at automatico
