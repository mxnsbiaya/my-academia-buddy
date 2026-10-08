/**
 * Bilingual Internationalization (i18n) Engine — My Academia Buddy
 * Complete French (fr) and English (en) localization for all pages, modals, and coaching flows.
 */

const STORAGE_LANG_KEY = 'mab_preferred_language';

const translations = {
  en: {
    // Nav & Sidebar
    nav_dashboard: 'Dashboard',
    nav_courses: 'Courses',
    nav_assignments: 'Assignments',
    nav_exams: 'Exams',
    nav_study_planner: 'Study Planner',
    nav_timetable: 'Class Timetable',
    nav_syllabus_import: 'Import Syllabus',
    nav_checkin: 'Weekly Check-In',
    nav_profile: 'Profile',
    nav_backup_restore: 'Backup / Restore',
    nav_account_cloud: 'Account & Cloud',
    nav_sign_in: 'Sign In',
    nav_sign_out: 'Sign Out',
    nav_guest: 'Guest Student',
    nav_sync_synced: 'Synced',
    nav_sync_syncing: 'Syncing',
    nav_sync_offline: 'Offline',
    nav_sync_local: 'Local Only',
    header_due_soon: '{count} due soon',
    header_buffer_active: '+20% Buffer Active',
    prof_language: 'Interface Language',
    prof_language_desc: 'Switch between English and French. Course codes and syllabus titles remain unchanged.',

    // Dashboard Priorities
    dash_greeting: 'Welcome back,',
    dash_subtitle: 'Here is your personalized academic roadmap for today.',
    dash_hero_title: 'What should I do now?',
    dash_hero_action_checkin: 'Complete your weekly check-in (2 min)',
    dash_hero_action_class: 'Prepare for your upcoming class',
    dash_hero_action_study: 'Focus on your next planned study session',
    dash_hero_action_idle: 'All caught up! Review upcoming topics or take a well-deserved break.',
    dash_hero_start_btn: 'Start Now',
    dash_urgent_title: 'Urgent & Next Up',
    dash_next_class: 'Next Class',
    dash_next_deadline: 'Next Deadline',
    dash_no_classes_today: 'No more classes scheduled today.',
    dash_no_deadlines_soon: 'No pressing deadlines in the next 7 days.',
    dash_due_in: 'Due in',
    dash_days: 'days',
    dash_day: 'day',
    dash_today: 'Today',
    dash_tomorrow: 'Tomorrow',
    dash_hours: 'hours',
    dash_room: 'Room',
    dash_pace_title: 'Academic Health & Pacing',
    dash_pace_on_track: 'On Track',
    dash_pace_behind: 'Behind Schedule',
    dash_pace_accelerated: 'Ahead of Pace',
    dash_attendance_rate: 'Class Attendance',
    dash_topics_mastered: 'Topics Mastered',
    dash_weekly_hours_goal: 'Weekly Study Goal',
    dash_checkin_banner_title: 'Weekly Academic Check-In Ready',
    dash_checkin_banner_desc: 'Calibrate your study schedule based on what actually happened this week.',
    dash_checkin_banner_btn: 'Start Check-In (2 min)',
    dash_quick_actions: 'Quick Actions',

    // Check-In
    checkin_modal_title: 'Interactive Academic Check-In',
    checkin_step_attendance: '1. Class Attendance',
    checkin_step_topics: '2. Topic Understanding',
    checkin_step_study: '3. Study Sessions',
    checkin_step_assignments: '4. Upcoming Tasks',
    checkin_step_pace: '5. Pace & Commitments',
    checkin_q_attendance: 'Did you attend your scheduled lectures and labs this week?',
    checkin_att_attended: 'Attended All',
    checkin_att_partial: 'Attended Some',
    checkin_att_missed: 'Missed Classes',
    checkin_q_topics_studied: 'Which course topics did you actively study or review?',
    checkin_q_topics_difficult: 'Which topics felt difficult or require extra practice?',
    checkin_topic_status_mastered: 'Mastered',
    checkin_topic_status_understood: 'Understood',
    checkin_topic_status_difficult: 'Needs Work',
    checkin_topic_status_not_started: 'Not Started',
    checkin_q_study_completed: 'Did you complete your scheduled study sessions this week?',
    checkin_study_all: 'Completed all (100%)',
    checkin_study_most: 'Completed most (75%)',
    checkin_study_half: 'About half (50%)',
    checkin_study_little: 'Very few (< 25%)',
    checkin_q_assignments_started: 'Have you started your upcoming assignments or lab reports?',
    checkin_asg_ahead: 'Started & on track',
    checkin_asg_drafting: 'Just starting',
    checkin_asg_not_started: 'Not started yet',
    checkin_asg_none: 'No upcoming assignments',
    checkin_q_behind: 'Do you feel behind in any of your courses?',
    checkin_behind_no: 'No, feeling on track',
    checkin_behind_slight: 'A little behind in 1 course',
    checkin_behind_yes: 'Significantly behind',
    checkin_q_commitments: 'Any unexpected commitments or schedule changes for next week?',
    checkin_commitments_placeholder: 'e.g. Extra work shift Friday, midterm prep weekend, family event...',
    checkin_save_draft: 'Save Draft & Resume Later',
    checkin_submit_btn: 'Submit & Recalibrate Plan',
    checkin_prev: 'Previous',
    checkin_next: 'Next',
    checkin_draft_resumed: 'Resumed your previous incomplete check-in draft.',
    checkin_success_title: 'Adaptive Schedule Recalibrated!',
    checkin_success_explanation: 'Here is what changed in your academic schedule:',
    checkin_recal_topics_boosted: 'Prioritized topics requiring extra practice:',
    checkin_recal_pace_adjusted: 'Adjusted pace multiplier to match your real velocity.',
    checkin_recal_sessions_created: 'Added consolidation and review sessions before deadlines.',

    // Duplicate Syllabus Detection & Import
    dup_title: 'Potential Duplicate Syllabus Detected',
    dup_file_hash_match: 'Exact duplicate document upload detected via file hash.',
    dup_course_match: 'A course with code {code} already exists for {term} {year}.',
    dup_revised_detected: 'This appears to be a revised version of an existing course syllabus.',
    dup_opt_cancel: 'Cancel Import',
    dup_opt_review: 'Review Differences',
    dup_opt_update: 'Update Existing Course',
    dup_opt_merge: 'Merge Newly Discovered Info',
    dup_diff_title: 'Syllabus Differences Comparison',
    dup_diff_new_topics: 'New topics found in this syllabus:',
    dup_diff_new_assignments: 'New assignments/deliverables:',
    dup_diff_new_exams: 'New exams/tests:',
    dup_diff_preserved: 'Your existing progress, completed tasks, and notes will be preserved.',
    dup_btn_confirm_merge: 'Confirm Merge',
    dup_btn_confirm_update: 'Confirm Update',

    // Syllabus Understanding & Tasks
    syl_title: 'Intelligent Syllabus Import',
    syl_upload_prompt: 'Drag and drop your syllabus PDF or text file here, or browse files',
    syl_extracting: 'Extracting syllabus schedule, readings, assignments and exams...',
    syl_extracted_assessments: 'Extracted Deliverables & Exams',
    syl_review_tasks_notice: 'The following tasks will be automatically created in your calendar & deadlines:',
    syl_uncertain_date_warning: 'Uncertain date detected. Please verify before saving.',
    syl_import_success: 'Syllabus imported and tasks automatically scheduled!',
    syl_field_name: 'Assessment Name',
    syl_field_type: 'Type',
    syl_field_date: 'Due Date',
    syl_field_weight: 'Weight (%)',
    syl_field_time: 'Time',
    syl_btn_finalize: 'Confirm & Create Academic Tasks',

    // Timetable
    tt_title: 'Weekly Class Timetable',
    tt_subtitle: 'Manage your recurring lectures, labs, and tutorials to optimize study blocks.',
    tt_import_btn: 'Import Timetable (PDF / Text)',
    tt_add_class_btn: '+ Add Class',
    tt_col_course: 'Course',
    tt_col_type: 'Activity',
    tt_col_day: 'Day',
    tt_col_time: 'Time',
    tt_col_location: 'Location',
    tt_col_actions: 'Actions',
    tt_type_lecture: 'Lecture',
    tt_type_lab: 'Laboratory',
    tt_type_tutorial: 'Tutorial / DGD',
    tt_type_seminar: 'Seminar',
    tt_day_mon: 'Monday',
    tt_day_tue: 'Tuesday',
    tt_day_wed: 'Wednesday',
    tt_day_thu: 'Thursday',
    tt_day_fri: 'Friday',
    tt_day_sat: 'Saturday',
    tt_day_sun: 'Sunday',
    tt_empty_title: 'No timetable classes registered yet',
    tt_empty_desc: 'Upload your class schedule or add your weekly courses to automatically avoid conflicts and schedule pre-class reviews.',
    tt_save_success: 'Timetable updated and synchronized!',
    tt_conflict_warning: 'Scheduling conflict detected with an existing class.',
    tt_buffer_notice: '15-minute transition buffer automatically applied before and after classes.',

    // Common Buttons & Messages
    btn_save: 'Save',
    btn_cancel: 'Cancel',
    btn_delete: 'Delete',
    btn_edit: 'Edit',
    btn_close: 'Close',
    lang_switch_en: 'English',
    lang_switch_fr: 'Français',
    toast_lang_changed: 'Language set to English.',
  },

  fr: {
    // Nav & Sidebar
    nav_dashboard: 'Tableau de bord',
    nav_courses: 'Cours',
    nav_assignments: 'Devoirs',
    nav_exams: 'Examens',
    nav_study_planner: 'Plan d’étude',
    nav_timetable: 'Emploi du temps',
    nav_syllabus_import: 'Importer plan de cours',
    nav_checkin: 'Bilan hebdomadaire',
    nav_profile: 'Profil',
    nav_backup_restore: 'Sauvegarde & Données',
    nav_account_cloud: 'Compte & Nuage',
    nav_sign_in: 'Connexion',
    nav_sign_out: 'Déconnexion',
    nav_guest: 'Étudiant invité',
    nav_sync_synced: 'Synchronisé',
    nav_sync_syncing: 'Synchronisation',
    nav_sync_offline: 'Hors ligne',
    nav_sync_local: 'Local uniquement',
    header_due_soon: '{count} bientôt',
    header_buffer_active: 'Tampon +20% actif',
    prof_language: 'Langue de l’interface',
    prof_language_desc: 'Basculez entre l’anglais et le français. Les sigles de cours et titres de syllabus restent intacts.',

    // Dashboard Priorities
    dash_greeting: 'Bienvenue,',
    dash_subtitle: 'Voici votre feuille de route académique personnalisée pour aujourd’hui.',
    dash_hero_title: 'Que devrais-je faire maintenant ?',
    dash_hero_action_checkin: 'Complétez votre bilan hebdomadaire (2 min)',
    dash_hero_action_class: 'Préparez votre prochain cours magistral',
    dash_hero_action_study: 'Concentrez-vous sur votre séance d’étude prévue',
    dash_hero_action_idle: 'Tout est à jour ! Révisez vos prochains sujets ou accordez-vous une pause méritée.',
    dash_hero_start_btn: 'Commencer',
    dash_urgent_title: 'Urgent et à venir',
    dash_next_class: 'Prochain cours',
    dash_next_deadline: 'Prochaine échéance',
    dash_no_classes_today: 'Aucun autre cours prévu aujourd’hui.',
    dash_no_deadlines_soon: 'Aucune échéance urgente dans les 7 prochains jours.',
    dash_due_in: 'Échéance dans',
    dash_days: 'jours',
    dash_day: 'jour',
    dash_today: 'Aujourd’hui',
    dash_tomorrow: 'Demain',
    dash_hours: 'heures',
    dash_room: 'Local',
    dash_pace_title: 'Santé académique et rythme',
    dash_pace_on_track: 'En bonne voie',
    dash_pace_behind: 'En retard',
    dash_pace_accelerated: 'En avance',
    dash_attendance_rate: 'Présence aux cours',
    dash_topics_mastered: 'Sujets maîtrisés',
    dash_weekly_hours_goal: 'Objectif d’étude hebdo',
    dash_checkin_banner_title: 'Bilan académique hebdomadaire prêt',
    dash_checkin_banner_desc: 'Calibrez votre horaire d’étude en fonction de ce qui s’est réellement passé cette semaine.',
    dash_checkin_banner_btn: 'Démarrer le bilan (2 min)',
    dash_quick_actions: 'Actions rapides',

    // Check-In
    checkin_modal_title: 'Bilan académique interactif',
    checkin_step_attendance: '1. Présence aux cours',
    checkin_step_topics: '2. Compréhension des sujets',
    checkin_step_study: '3. Séances d’étude',
    checkin_step_assignments: '4. Tâches à venir',
    checkin_step_pace: '5. Rythme et engagements',
    checkin_q_attendance: 'Avez-vous assisté à vos cours magistraux et laboratoires cette semaine ?',
    checkin_att_attended: 'Assisté à tous',
    checkin_att_partial: 'Assisté à certains',
    checkin_att_missed: 'Cours manqués',
    checkin_q_topics_studied: 'Quels sujets de cours avez-vous activement étudiés ou révisés ?',
    checkin_q_topics_difficult: 'Quels sujets vous ont paru difficiles ou nécessitent de la pratique ?',
    checkin_topic_status_mastered: 'Maîtrisé',
    checkin_topic_status_understood: 'Compris',
    checkin_topic_status_difficult: 'À retravailler',
    checkin_topic_status_not_started: 'Non commencé',
    checkin_q_study_completed: 'Avez-vous complété vos séances d’étude prévues cette semaine ?',
    checkin_study_all: 'Toutes complétées (100%)',
    checkin_study_most: 'La plupart (75%)',
    checkin_study_half: 'Environ la moitié (50%)',
    checkin_study_little: 'Très peu (< 25%)',
    checkin_q_assignments_started: 'Avez-vous commencé vos devoirs ou rapports de laboratoire à venir ?',
    checkin_asg_ahead: 'Commencé et en bonne voie',
    checkin_asg_drafting: 'Débuté récemment',
    checkin_asg_not_started: 'Pas encore commencé',
    checkin_asg_none: 'Aucun devoir urgent',
    checkin_q_behind: 'Avez-vous l’impression d’avoir du retard dans l’un de vos cours ?',
    checkin_behind_no: 'Non, tout est sous contrôle',
    checkin_behind_slight: 'Léger retard dans 1 cours',
    checkin_behind_yes: 'Retard significatif',
    checkin_q_commitments: 'Des engagements imprévus ou changements d’horaire pour la semaine prochaine ?',
    checkin_commitments_placeholder: 'ex. Quart de travail supplémentaire vendredi, révisions pour un intra, événement...',
    checkin_save_draft: 'Enregistrer le brouillon',
    checkin_submit_btn: 'Soumettre et recalibrer le plan',
    checkin_prev: 'Précédent',
    checkin_next: 'Suivant',
    checkin_draft_resumed: 'Brouillon de bilan précédent rechargé.',
    checkin_success_title: 'Plan d’étude recalibré avec succès !',
    checkin_success_explanation: 'Voici les ajustements apportés à votre horaire académique :',
    checkin_recal_topics_boosted: 'Priorisation des sujets nécessitant plus de pratique :',
    checkin_recal_pace_adjusted: 'Ajustement du multiplicateur de rythme selon votre vitesse réelle.',
    checkin_recal_sessions_created: 'Ajout de séances de consolidation avant vos échéances.',

    // Duplicate Syllabus Detection & Import
    dup_title: 'Plan de cours en double détecté',
    dup_file_hash_match: 'Téléversement d’un fichier identique détecté via empreinte numérique (hash).',
    dup_course_match: 'Un cours avec le code {code} existe déjà pour {term} {year}.',
    dup_revised_detected: 'Ce document semble être une version révisée d’un plan de cours existant.',
    dup_opt_cancel: 'Annuler l’importation',
    dup_opt_review: 'Examiner les différences',
    dup_opt_update: 'Mettre à jour le cours',
    dup_opt_merge: 'Fusionner les nouvelles données',
    dup_diff_title: 'Comparaison des différences du plan de cours',
    dup_diff_new_topics: 'Nouveaux sujets trouvés dans ce plan :',
    dup_diff_new_assignments: 'Nouveaux devoirs / livrables :',
    dup_diff_new_exams: 'Nouveaux examens / tests :',
    dup_diff_preserved: 'Vos progrès actuels, devoirs complétés et notes personnelles seront préservés.',
    dup_btn_confirm_merge: 'Confirmer la fusion',
    dup_btn_confirm_update: 'Confirmer la mise à jour',

    // Syllabus Understanding & Tasks
    syl_title: 'Importation intelligente du plan de cours',
    syl_upload_prompt: 'Glissez-déposez votre plan de cours en PDF ou texte ici, ou parcourez vos fichiers',
    syl_extracting: 'Extraction de l’horaire, des lectures, des devoirs et des examens...',
    syl_extracted_assessments: 'Livrables et examens extraits',
    syl_review_tasks_notice: 'Les tâches suivantes seront automatiquement créées dans votre calendrier et vos échéances :',
    syl_uncertain_date_warning: 'Date incertaine détectée. Veuillez vérifier avant d’enregistrer.',
    syl_import_success: 'Plan de cours importé et tâches planifiées automatiquement !',
    syl_field_name: 'Nom de l’évaluation',
    syl_field_type: 'Type',
    syl_field_date: 'Date d’échéance',
    syl_field_weight: 'Pondération (%)',
    syl_field_time: 'Heure',
    syl_btn_finalize: 'Confirmer et créer les tâches académiques',

    // Timetable
    tt_title: 'Emploi du temps hebdomadaire',
    tt_subtitle: 'Gérez vos cours magistraux, laboratoires et DGD pour optimiser vos blocs d’étude.',
    tt_import_btn: 'Importer l’horaire (PDF / Texte)',
    tt_add_class_btn: '+ Ajouter un cours',
    tt_col_course: 'Cours',
    tt_col_type: 'Activité',
    tt_col_day: 'Jour',
    tt_col_time: 'Horaire',
    tt_col_location: 'Local',
    tt_col_actions: 'Actions',
    tt_type_lecture: 'Cours magistral',
    tt_type_lab: 'Laboratoire',
    tt_type_tutorial: 'DGD / Tutorat',
    tt_type_seminar: 'Séminaire',
    tt_day_mon: 'Lundi',
    tt_day_tue: 'Mardi',
    tt_day_wed: 'Mercredi',
    tt_day_thu: 'Jeudi',
    tt_day_fri: 'Vendredi',
    tt_day_sat: 'Samedi',
    tt_day_sun: 'Dimanche',
    tt_empty_title: 'Aucun cours enregistré dans l’horaire',
    tt_empty_desc: 'Téléversez votre horaire de cours pour éviter les conflits et planifier automatiquement des révisions avant vos cours.',
    tt_save_success: 'Emploi du temps mis à jour et synchronisé !',
    tt_conflict_warning: 'Conflit d’horaire détecté avec un cours existant.',
    tt_buffer_notice: 'Zone tampon de transition de 15 minutes appliquée avant et après chaque cours.',

    // Common Buttons & Messages
    btn_save: 'Enregistrer',
    btn_cancel: 'Annuler',
    btn_delete: 'Supprimer',
    btn_edit: 'Modifier',
    btn_close: 'Fermer',
    lang_switch_en: 'English',
    lang_switch_fr: 'Français',
    toast_lang_changed: 'Langue configurée en Français.',
  },
};

let currentLanguage = (() => {
  try {
    const saved = window.localStorage.getItem(STORAGE_LANG_KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch {
    // fallback
  }
  return 'en';
})();

const listeners = new Set();

/**
 * Get current active language code ('en' | 'fr')
 */
export function getLanguage() {
  return currentLanguage;
}

/**
 * Set active language code and notify listeners
 */
export function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'fr') return;
  currentLanguage = lang;
  try {
    window.localStorage.setItem(STORAGE_LANG_KEY, lang);
  } catch {
    // Ignore storage errors
  }
  listeners.forEach((fn) => {
    try {
      fn(lang);
    } catch (err) {
      console.warn('[i18n] listener error:', err);
    }
  });
}

/**
 * Subscribe to language changes
 */
export function subscribeLanguage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Translate a key with optional string parameter replacement
 */
export function t(key, params = {}) {
  const dict = translations[currentLanguage] || translations.en;
  let text = dict[key] || translations.en[key] || key;

  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([paramKey, val]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
    });
  }

  return text;
}

export default {
  getLanguage,
  setLanguage,
  subscribeLanguage,
  t,
};
