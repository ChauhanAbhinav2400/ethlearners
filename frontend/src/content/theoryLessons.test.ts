import { describe, expect, it } from 'vitest';
import { coreLessons } from './coreLessons';
import { executionLessons } from './executionLessons';
import { scalingLessons } from './scalingLessons';
import { evolutionLessons } from './evolutionLessons';
import { teachingByLessonId } from './theoryLessons';

// The AI-created playground has its own teaching flow. These are the original
// four content collections whose simulations must all have authored guidance.
const originalLessons = [...coreLessons, ...executionLessons, ...scalingLessons, ...evolutionLessons];

describe('theory-first teaching coverage', () => {
  it('provides exactly one authored teaching flow for each of the 24 existing lessons', () => {
    const expectedIds = originalLessons.map(lesson => lesson.id).sort();
    expect(expectedIds).toHaveLength(24);
    expect(Object.keys(teachingByLessonId).sort()).toEqual(expectedIds);
  });

  it.each(originalLessons.map(lesson => [lesson.id]))('%s is complete before the experiment opens', id => {
    const teaching = teachingByLessonId[id];
    expect(teaching.idea.length).toBeGreaterThanOrEqual(2);
    expect(teaching.example.body.length).toBeGreaterThanOrEqual(2);
    expect(teaching.mechanism.length).toBeGreaterThanOrEqual(3);
    expect(teaching.bridge.focus.length).toBeGreaterThanOrEqual(2);
    expect(teaching.steps.length).toBeGreaterThanOrEqual(3);

    const strings = [
      ...teaching.idea,
      teaching.example.title,
      ...teaching.example.body,
      teaching.example.limitation,
      ...teaching.mechanism.flatMap(item => [item.title, item.body]),
      teaching.bridge.intro,
      ...teaching.bridge.focus,
      teaching.bridge.firstAction,
      teaching.bridge.expected,
      ...teaching.steps.flatMap(item => [item.title, item.action, item.observe, item.why]),
    ];
    for (const value of strings) {
      expect(value.trim().length, `${id} has an empty teaching field`).toBeGreaterThan(10);
      expect(value).not.toMatch(/\b(?:TODO|TBD|lorem ipsum|coming soon)\b/i);
    }
    expect(new Set(teaching.mechanism.map(item => item.title)).size).toBe(teaching.mechanism.length);
    expect(new Set(teaching.steps.map(item => item.action)).size).toBe(teaching.steps.length);
  });

  it('uses lesson-specific first actions, observations, and analogy boundaries', () => {
    const teaching = Object.values(teachingByLessonId);
    expect(new Set(teaching.map(item => item.bridge.firstAction)).size).toBe(24);
    expect(new Set(teaching.map(item => item.bridge.expected)).size).toBe(24);
    expect(new Set(teaching.map(item => item.example.limitation)).size).toBe(24);
  });

  it('does not turn synthetic cryptography and elapsed teaching clocks into security claims', () => {
    const mechanismText = (id: string) => teachingByLessonId[id].mechanism.map(item => item.body).join(' ');
    expect(mechanismText('hashes')).toContain('Keccak-256');
    expect(mechanismText('signatures')).toContain('P-256');
    expect(mechanismText('signatures')).toContain('secp256k1');
    expect(teachingByLessonId.blocks.example.limitation).toContain('noncryptographic');
    expect(teachingByLessonId['proof-of-work'].example.limitation).toContain('Ethash');
    expect(teachingByLessonId.rollups.example.limitation).toContain('invents');
    expect(mechanismText('rollups')).toContain('challenger assumptions');
    expect(mechanismText('smart-accounts')).toContain('optional account logic');
  });
});
