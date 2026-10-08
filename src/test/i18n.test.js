import { describe, it, expect, beforeEach } from 'vitest';
import { getLanguage, setLanguage, subscribeLanguage, t } from '../services/i18n';

describe('Bilingual Internationalization (i18n) Engine', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  it('defaults to English and allows querying current language', () => {
    expect(getLanguage()).toBe('en');
  });

  it('switches language between English and French', () => {
    setLanguage('fr');
    expect(getLanguage()).toBe('fr');

    setLanguage('en');
    expect(getLanguage()).toBe('en');
  });

  it('ignores unsupported language codes safely', () => {
    setLanguage('de');
    expect(getLanguage()).toBe('en');
  });

  it('notifies registered subscribers upon language change', () => {
    let notifiedLang = null;
    const unsubscribe = subscribeLanguage((lang) => {
      notifiedLang = lang;
    });

    setLanguage('fr');
    expect(notifiedLang).toBe('fr');

    unsubscribe();
    setLanguage('en');
    // After unsubscribe, notifiedLang should not update
    expect(notifiedLang).toBe('fr');
  });

  it('translates core navigation labels in English and French', () => {
    setLanguage('en');
    expect(t('nav_dashboard')).toBe('Dashboard');
    expect(t('nav_courses')).toBe('Courses');
    expect(t('nav_assignments')).toBe('Assignments');
    expect(t('nav_timetable')).toBe('Class Timetable');
    expect(t('nav_checkin')).toBe('Weekly Check-In');

    setLanguage('fr');
    expect(t('nav_dashboard')).toBe('Tableau de bord');
    expect(t('nav_courses')).toBe('Cours');
    expect(t('nav_assignments')).toBe('Devoirs');
    expect(t('nav_timetable')).toBe('Emploi du temps');
    expect(t('nav_checkin')).toBe('Bilan hebdomadaire');
  });

  it('translates priority-driven dashboard messages in both languages', () => {
    setLanguage('en');
    expect(t('dash_hero_title')).toBe('What should I do now?');
    expect(t('dash_hero_action_checkin')).toContain('Complete your weekly check-in');
    expect(t('dash_next_class')).toBe('Next Class');
    expect(t('dash_next_deadline')).toBe('Next Deadline');

    setLanguage('fr');
    expect(t('dash_hero_title')).toBe('Que devrais-je faire maintenant ?');
    expect(t('dash_hero_action_checkin')).toContain('bilan hebdomadaire');
    expect(t('dash_next_class')).toBe('Prochain cours');
    expect(t('dash_next_deadline')).toBe('Prochaine échéance');
  });

  it('replaces interpolation parameters correctly in translated strings', () => {
    setLanguage('en');
    const enNotice = t('header_due_soon', { count: 4 });
    expect(enNotice).toBe('4 due soon');

    const enDup = t('dup_course_match', { code: 'CSI 2510', term: 'Fall', year: '2026' });
    expect(enDup).toBe('A course with code CSI 2510 already exists for Fall 2026.');

    setLanguage('fr');
    const frNotice = t('header_due_soon', { count: 2 });
    expect(frNotice).toBe('2 bientôt');

    const frDup = t('dup_course_match', { code: 'SEG 2505', term: 'Automne', year: '2026' });
    expect(frDup).toBe('Un cours avec le code SEG 2505 existe déjà pour Automne 2026.');
  });

  it('translates check-in flow questions and options accurately', () => {
    setLanguage('fr');
    expect(t('checkin_modal_title')).toBe('Bilan académique interactif');
    expect(t('checkin_att_attended')).toBe('Assisté à tous');
    expect(t('checkin_att_missed')).toBe('Cours manqués');
    expect(t('checkin_topic_status_mastered')).toBe('Maîtrisé');
    expect(t('checkin_topic_status_difficult')).toBe('À retravailler');
    expect(t('checkin_submit_btn')).toBe('Soumettre et recalibrer le plan');

    setLanguage('en');
    expect(t('checkin_modal_title')).toBe('Interactive Academic Check-In');
    expect(t('checkin_att_attended')).toBe('Attended All');
    expect(t('checkin_att_missed')).toBe('Missed Classes');
    expect(t('checkin_topic_status_mastered')).toBe('Mastered');
    expect(t('checkin_topic_status_difficult')).toBe('Needs Work');
    expect(t('checkin_submit_btn')).toBe('Submit & Recalibrate Plan');
  });

  it('translates timetable activities and week days properly', () => {
    setLanguage('en');
    expect(t('tt_type_lecture')).toBe('Lecture');
    expect(t('tt_type_lab')).toBe('Laboratory');
    expect(t('tt_type_tutorial')).toBe('Tutorial / DGD');
    expect(t('tt_day_mon')).toBe('Monday');

    setLanguage('fr');
    expect(t('tt_type_lecture')).toBe('Cours magistral');
    expect(t('tt_type_lab')).toBe('Laboratoire');
    expect(t('tt_type_tutorial')).toBe('DGD / Tutorat');
    expect(t('tt_day_mon')).toBe('Lundi');
  });

  it('preserves course codes and unknown keys gracefully without altering them', () => {
    // Official course identifiers or unknown text should not be damaged
    expect(t('CSI 2110')).toBe('CSI 2110');
    expect(t('SEG-3103')).toBe('SEG-3103');
  });
});
