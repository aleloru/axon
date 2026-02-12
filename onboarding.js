// ============================================================================
// ONBOARDING LOGIC - EXPANDED VERSION
// ============================================================================

let currentStep = 1;
const totalSteps = 8;

// ============================================================================
// NAVIGATION
// ============================================================================

window.nextStep = () => {
    if (!validateCurrentStep()) {
        return;
    }

    if (currentStep < totalSteps) {
        document.getElementById(`step-${currentStep}`).classList.remove('active');
        currentStep++;
        document.getElementById(`step-${currentStep}`).classList.add('active');
        updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.prevStep = () => {
    if (currentStep > 1) {
        document.getElementById(`step-${currentStep}`).classList.remove('active');
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add('active');
        updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

function updateProgress() {
    const progressFill = document.getElementById('progress-fill');
    const progressCurrent = document.getElementById('progress-current');

    const percentage = (currentStep / totalSteps) * 100;
    progressFill.style.width = `${percentage}%`;
    progressCurrent.textContent = currentStep;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateCurrentStep() {
    const stepContainer = document.getElementById(`step-${currentStep}`);
    const inputs = stepContainer.querySelectorAll('input, select, textarea');

    for (const input of inputs) {
        if (!input.checkValidity()) {
            alert(`Valore non valido per "${input.labels?.[0]?.innerText || input.id}". Controlla i limiti consentiti.`);
            return false;
        }
    }

    let isValid = true;
    let errorMessage = '';

    switch (currentStep) {
        case 1:
            const age = document.getElementById('age').value;
            const gender = document.getElementById('gender').value;
            const weight = document.getElementById('weight').value;
            const height = document.getElementById('height').value;

            if (!age || !gender || !weight || !height) {
                errorMessage = 'Compila tutti i campi obbligatori (*)';
                isValid = false;
            }
            break;

        case 2:
            const experience = document.getElementById('experience').value;
            const trainingHistory = document.getElementById('training-history').value;

            if (!experience || !trainingHistory) {
                errorMessage = 'Compila tutti i campi obbligatori (*)';
                isValid = false;
            }
            break;

        case 3:
            const primaryGoal = document.getElementById('primary-goal').value;
            const timeline = document.getElementById('timeline').value;

            if (!primaryGoal || !timeline) {
                errorMessage = 'Compila tutti i campi obbligatori (*)';
                isValid = false;
            }
            break;

        case 4:
            const trainingDays = document.getElementById('training-days').value;
            const sessionDuration = document.getElementById('session-duration').value;
            const equipment = document.getElementById('equipment').value;
            const preferredTime = document.getElementById('preferred-time').value;
            const workoutSplit = document.getElementById('workout-split').value;

            if (!trainingDays || !sessionDuration || !equipment || !preferredTime || !workoutSplit) {
                errorMessage = 'Compila tutti i campi obbligatori (*)';
                isValid = false;
            }
            break;

        case 5:
            // No required fields
            isValid = true;
            break;

        case 6:
            const sleepHours = document.getElementById('sleep-hours').value;
            const sleepQuality = document.getElementById('sleep-quality').value;
            const stressLevel = document.getElementById('stress-level').value;
            const jobType = document.getElementById('job-type').value;
            const cardioPreference = document.getElementById('cardio-preference').value;

            if (!sleepHours || !sleepQuality || !stressLevel || !jobType || !cardioPreference) {
                errorMessage = 'Compila tutti i campi obbligatori (*)';
                isValid = false;
            }
            break;

        case 7:
            const dietType = document.getElementById('diet-type').value;
            const mealsPerDay = document.getElementById('meals-per-day').value;
            const waterIntake = document.getElementById('water-intake').value;

            if (!dietType || !mealsPerDay || !waterIntake) {
                errorMessage = 'Compila tutti i campi obbligatori (*)';
                isValid = false;
            }
            break;

        case 8:
            const trainingStyle = document.getElementById('training-style').value;
            const intensityPreference = document.getElementById('intensity-preference').value;
            const musicPreference = document.getElementById('music-preference').value;
            const motivationLevel = document.getElementById('motivation-level').value;

            if (!trainingStyle || !intensityPreference || !musicPreference || !motivationLevel) {
                errorMessage = 'Compila tutti i campi obbligatori (*)';
                isValid = false;
            }
            break;
    }

    if (!isValid) {
        alert(errorMessage);
    }

    return isValid;
}

// ============================================================================
// COMPLETE ONBOARDING
// ============================================================================

window.completeOnboarding = async () => {
    if (!validateCurrentStep()) {
        return;
    }

    const btn = document.querySelector('.btn-complete');
    const btnText = document.getElementById('complete-btn-text');

    btn.classList.add('loading');
    btn.disabled = true;
    btnText.textContent = 'ANALISI PROFILO...';

    try {
        const profileData = collectProfileData();
        console.log('📝 Dati profilo raccolti:', profileData);

        const { data: { user }, error: userError } = await sb.auth.getUser();

        if (userError || !user) {
            throw new Error('Utente non autenticato');
        }

        console.log('👤 Utente:', user.email);

        // Save profile to Supabase
        btnText.textContent = 'SALVATAGGIO PROFILO...';
        const { data, error } = await sb
            .from('profiles')
            .upsert({
                id: user.id,
                ...profileData,
                onboarding_completed: true,
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error('❌ Errore salvataggio profilo:', error);
            throw error;
        }

        console.log('✅ Profilo salvato:', data);

        // Generate workout plan with AI
        btnText.textContent = 'GENERAZIONE SCHEDA AI...';
        await generateAIWorkoutPlan(user.id, profileData);

        console.log('✅ Workout plan generato');

        btnText.textContent = 'COMPLETATO! ✓';

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        console.error('❌ Errore durante onboarding:', error);
        alert('Errore durante il salvataggio: ' + error.message);

        btn.classList.remove('loading');
        btn.disabled = false;
        btnText.textContent = 'GENERA IL MIO PROGRAMMA';
    }
};

// ============================================================================
// DATA COLLECTION - EXPANDED
// ============================================================================

function collectProfileData() {
    // Step 1: Personal data
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value;
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const targetWeight = document.getElementById('target-weight').value ?
        parseFloat(document.getElementById('target-weight').value) : null;
    const bodyFat = document.getElementById('body-fat').value ?
        parseFloat(document.getElementById('body-fat').value) : null;

    // Step 2: Experience
    const experience = document.getElementById('experience').value;
    const trainingHistory = document.getElementById('training-history').value;
    const knownExercises = Array.from(document.querySelectorAll('.known-exercise:checked'))
        .map(cb => cb.value);
    const maxSquat = document.getElementById('max-squat').value ?
        parseFloat(document.getElementById('max-squat').value) : null;
    const maxBench = document.getElementById('max-bench').value ?
        parseFloat(document.getElementById('max-bench').value) : null;
    const maxDeadlift = document.getElementById('max-deadlift').value ?
        parseFloat(document.getElementById('max-deadlift').value) : null;

    // Step 3: Goals
    const primaryGoal = document.getElementById('primary-goal').value;
    const secondaryGoals = Array.from(document.querySelectorAll('.secondary-goal:checked'))
        .map(cb => cb.value);
    const focusAreas = Array.from(document.querySelectorAll('.focus-area:checked'))
        .map(cb => cb.value);
    const timeline = document.getElementById('timeline').value;

    // Step 4: Availability
    const trainingDays = parseInt(document.getElementById('training-days').value);
    const sessionDuration = parseInt(document.getElementById('session-duration').value);
    const equipment = document.getElementById('equipment').value;
    const preferredTime = document.getElementById('preferred-time').value;
    const workoutSplit = document.getElementById('workout-split').value;

    // Step 5: Limitations
    const injuries = Array.from(document.querySelectorAll('.injury:checked'))
        .map(cb => cb.value);
    const painLevel = document.getElementById('pain-level').value ?
        parseInt(document.getElementById('pain-level').value) : 0;
    const medicalNotes = document.getElementById('medical-notes').value || null;
    const avoidExercises = document.getElementById('avoid-exercises').value || null;

    // Step 6: Lifestyle
    const sleepHours = parseFloat(document.getElementById('sleep-hours').value);
    const sleepQuality = document.getElementById('sleep-quality').value;
    const stressLevel = parseInt(document.getElementById('stress-level').value);
    const jobType = document.getElementById('job-type').value;
    const extraActivities = Array.from(document.querySelectorAll('.extra-activity:checked'))
        .map(cb => cb.value);
    const cardioPreference = document.getElementById('cardio-preference').value;

    // Step 7: Nutrition
    const dietType = document.getElementById('diet-type').value;
    const mealsPerDay = parseInt(document.getElementById('meals-per-day').value);
    const proteinIntake = document.getElementById('protein-intake').value ?
        parseInt(document.getElementById('protein-intake').value) : null;
    const supplements = Array.from(document.querySelectorAll('.supplement:checked'))
        .map(cb => cb.value);
    const waterIntake = parseFloat(document.getElementById('water-intake').value);

    // Step 8: Preferences
    const trainingStyle = document.getElementById('training-style').value;
    const intensityPreference = document.getElementById('intensity-preference').value;
    const musicPreference = document.getElementById('music-preference').value;
    const motivationLevel = document.getElementById('motivation-level').value;
    const notes = document.getElementById('notes').value || null;

    return {
        // Personal
        age, gender, weight, height, target_weight: targetWeight, body_fat: bodyFat,

        // Experience
        experience_level: experience,
        training_history: trainingHistory,
        known_exercises: knownExercises,
        max_squat: maxSquat,
        max_bench: maxBench,
        max_deadlift: maxDeadlift,

        // Goals
        primary_goal: primaryGoal,
        secondary_goals: secondaryGoals,
        focus_areas: focusAreas,
        timeline,

        // Availability
        training_days: trainingDays,
        session_duration: sessionDuration,
        equipment,
        preferred_time: preferredTime,
        workout_split: workoutSplit,

        // Limitations
        injuries,
        pain_level: painLevel,
        medical_notes: medicalNotes,
        exercises_to_avoid: avoidExercises ? avoidExercises.split(',').map(e => e.trim()) : [],

        // Lifestyle
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        stress_level: stressLevel,
        job_type: jobType,
        extra_activities: extraActivities,
        cardio_preference: cardioPreference,

        // Nutrition
        diet_type: dietType,
        meals_per_day: mealsPerDay,
        protein_intake: proteinIntake,
        supplements,
        water_intake: waterIntake,

        // Preferences
        training_style: trainingStyle,
        intensity_preference: intensityPreference,
        music_preference: musicPreference,
        motivation_level: motivationLevel,
        additional_notes: notes
    };
}

// ============================================================================
// AI WORKOUT PLAN GENERATION
// ============================================================================

async function generateAIWorkoutPlan(userId, profile) {
    console.log('🤖 Generazione workout plan AI-powered...');

    // Fetch exercises from ExerciseDB API
    const exercises = await fetchExercisesFromAPI(profile.equipment, profile.primary_goal);

    // Generate personalized workout plan
    const workoutPlan = createPersonalizedPlan(profile, exercises);

    // Save to Supabase
    const { data, error } = await sb
        .from('workout_plans')
        .insert({
            user_id: userId,
            name: `Piano ${profile.primary_goal.toUpperCase()} Personalizzato`,
            description: `Generato in base al tuo profilo completo - ${profile.training_days} giorni/settimana`,
            days_per_week: profile.training_days,
            exercises: workoutPlan,
            is_active: true
        })
        .select();

    if (error) {
        console.error('❌ Errore generazione workout plan:', error);
        throw error;
    }

    return data;
}

// ============================================================================
// EXERCISE API INTEGRATION (ExerciseDB alternative - using local enhanced DB)
// ============================================================================

async function fetchExercisesFromAPI(equipment, goal) {
    // For now, we'll use an enhanced local database
    // In production, you could integrate with ExerciseDB API or similar

    console.log('📚 Caricamento database esercizi...');

    // This would be replaced with actual API call:
    // const response = await fetch(`https://exercisedb.p.rapidapi.com/exercises`);
    // const allExercises = await response.json();

    // For now, return enhanced MASTER_DB
    return window.MASTER_DB;
}

function createPersonalizedPlan(profile, exercises) {
    console.log('🎯 Creazione piano personalizzato...');

    const { training_days, equipment, primary_goal, injuries, focus_areas, workout_split } = profile;

    // Filter exercises based on equipment and injuries
    let availableExercises = exercises.filter(ex => {
        // Equipment filter
        if (equipment === 'bodyweight' && ex.type !== 'body') return false;
        if (equipment === 'minimal' && ex.type === 'full') return false;
        if (equipment === 'home_gym' && ex.type === 'full') return false;

        // Injury filter
        if (injuries.includes('lower_back') && (ex.n.includes('Stacco') || ex.n.includes('Squat'))) return false;
        if (injuries.includes('shoulders') && ex.m === 'Spalle') return false;
        if (injuries.includes('knees') && ex.n.includes('Squat')) return false;

        return true;
    });

    // Generate workout split based on preference
    const workoutPlan = {};

    if (workout_split === 'full_body' || training_days <= 3) {
        for (let day = 1; day <= training_days; day++) {
            workoutPlan[`day${day}`] = generateFullBodyWorkout(availableExercises, primary_goal, focus_areas);
        }
    } else if (workout_split === 'upper_lower') {
        workoutPlan.day1 = generateUpperBodyWorkout(availableExercises, primary_goal, focus_areas);
        workoutPlan.day2 = generateLowerBodyWorkout(availableExercises, primary_goal, focus_areas);
        if (training_days >= 4) {
            workoutPlan.day3 = generateUpperBodyWorkout(availableExercises, primary_goal, focus_areas);
            workoutPlan.day4 = generateLowerBodyWorkout(availableExercises, primary_goal, focus_areas);
        }
    } else if (workout_split === 'push_pull_legs' || workout_split === 'ai_decide') {
        workoutPlan.day1 = generatePushWorkout(availableExercises, primary_goal, focus_areas);
        workoutPlan.day2 = generatePullWorkout(availableExercises, primary_goal, focus_areas);
        workoutPlan.day3 = generateLegsWorkout(availableExercises, primary_goal, focus_areas);
        if (training_days >= 4) {
            workoutPlan.day4 = generatePushWorkout(availableExercises, primary_goal, focus_areas);
        }
        if (training_days >= 5) {
            workoutPlan.day5 = generatePullWorkout(availableExercises, primary_goal, focus_areas);
        }
        if (training_days >= 6) {
            workoutPlan.day6 = generateLegsWorkout(availableExercises, primary_goal, focus_areas);
        }
    }

    return workoutPlan;
}

// Helper functions for workout generation
function generateFullBodyWorkout(exercises, goal, focusAreas) {
    const selected = [];
    const muscleGroups = ['Petto', 'Schiena', 'Gambe', 'Spalle'];

    muscleGroups.forEach(muscle => {
        const muscleExercises = exercises.filter(ex => ex.m === muscle);
        if (muscleExercises.length > 0) {
            const sorted = muscleExercises.sort((a, b) => a.priority - b.priority);
            selected.push(sorted[0]);
        }
    });

    return selected;
}

function generateUpperBodyWorkout(exercises, goal, focusAreas) {
    const selected = [];
    const muscleGroups = ['Petto', 'Schiena', 'Spalle', 'Bicipiti', 'Tricipiti'];

    muscleGroups.forEach(muscle => {
        const muscleExercises = exercises.filter(ex => ex.m === muscle);
        const sorted = muscleExercises.sort((a, b) => a.priority - b.priority);
        selected.push(...sorted.slice(0, 2));
    });

    return selected;
}

function generateLowerBodyWorkout(exercises, goal, focusAreas) {
    const selected = [];
    const muscleGroups = ['Gambe', 'Core'];

    muscleGroups.forEach(muscle => {
        const muscleExercises = exercises.filter(ex => ex.m === muscle);
        const sorted = muscleExercises.sort((a, b) => a.priority - b.priority);
        selected.push(...sorted.slice(0, 3));
    });

    return selected;
}

function generatePushWorkout(exercises, goal, focusAreas) {
    const selected = [];
    const muscleGroups = ['Petto', 'Spalle', 'Tricipiti'];

    muscleGroups.forEach(muscle => {
        const muscleExercises = exercises.filter(ex => ex.m === muscle);
        const sorted = muscleExercises.sort((a, b) => a.priority - b.priority);
        selected.push(...sorted.slice(0, 2));
    });

    return selected;
}

function generatePullWorkout(exercises, goal, focusAreas) {
    const selected = [];
    const muscleGroups = ['Schiena', 'Bicipiti'];

    muscleGroups.forEach(muscle => {
        const muscleExercises = exercises.filter(ex => ex.m === muscle);
        const sorted = muscleExercises.sort((a, b) => a.priority - b.priority);
        selected.push(...sorted.slice(0, 3));
    });

    return selected;
}

function generateLegsWorkout(exercises, goal, focusAreas) {
    return generateLowerBodyWorkout(exercises, goal, focusAreas);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Onboarding inizializzato (8 steps)');
    updateProgress();

    // Just log if user is authenticated, but don't redirect
    sb.auth.getUser().then(({ data: { user }, error }) => {
        if (user) {
            console.log('✅ Utente autenticato:', user.email);
        } else {
            console.log('⚠️ Nessuna sessione attiva, ma continuo con onboarding');
        }
    });
});
