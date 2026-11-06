import { describe, expect, it } from 'vitest';
import { lessonById, lessons, storySequence, worlds } from './curriculum';

describe('curriculum integrity', () => {
  it('keeps every implemented lesson independently addressable and assigned to one world', () => {
    expect(new Set(lessons.map(({ id }) => id)).size).toBe(lessons.length);
    expect(worlds.map(({ id }) => id)).toEqual(Array.from({ length: 14 }, (_, index) => String(index).padStart(2, '0')));
    const assigned = worlds.flatMap(({ lessonIds }) => lessonIds);
    expect([...assigned].sort()).toEqual(lessons.map(({ id }) => id).sort());
    for (const world of worlds) {
      for (const id of world.lessonIds) {
        expect(lessonById[id], `World ${world.id} refers to missing lesson ${id}`).toBeDefined();
        expect(lessonById[id].worldId).toBe(world.id);
      }
    }
  });

  it('resolves every prerequisite and related link, with prerequisites earlier in the story', () => {
    expect(new Set(storySequence).size).toBe(storySequence.length);
    expect([...storySequence].sort()).toEqual(lessons.map(({ id }) => id).sort());
    for (const lesson of lessons) {
      for (const id of [...lesson.prerequisites, ...lesson.related]) {
        expect(lessonById[id], `${lesson.id} has a broken link to ${id}`).toBeDefined();
        expect(id).not.toBe(lesson.id);
      }
      for (const id of lesson.prerequisites) {
        expect(storySequence.indexOf(id)).toBeLessThan(storySequence.indexOf(lesson.id));
      }
    }
  });

  it('provides complete lesson rhythms, usable checkpoints, and explicit simulation boundaries', () => {
    for (const lesson of lessons) {
      expect(lesson.intro.length).toBeGreaterThan(0);
      for (const value of [lesson.title, lesson.summary, lesson.experiment, lesson.reveal, lesson.mentalModel, lesson.boundary, lesson.nextQuestion]) {
        expect(value.trim().length).toBeGreaterThan(10);
      }
      expect(lesson.deepDive.length).toBeGreaterThan(0);
      for (const question of [lesson.question, lesson.check]) {
        expect(question.options.length).toBeGreaterThan(1);
        expect(Number.isInteger(question.answer)).toBe(true);
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.answer).toBeLessThan(question.options.length);
        expect(question.explanation.length).toBeGreaterThan(20);
      }
    }
  });

  it('uses primary-source URLs and has a working lesson in every world', () => {
    for (const lesson of lessons) {
      expect(lesson.sources.length).toBeGreaterThan(0);
      for (const source of lesson.sources) {
        const url = new URL(source.url);
        expect(url.protocol).toBe('https:');
        expect(['ethereum.org', 'eips.ethereum.org', 'ethereum.github.io', 'github.com', 'docs.soliditylang.org', 'geth.ethereum.org', 'docs.chain.link']).toContain(url.hostname);
        if (url.hostname === 'github.com') expect(url.pathname).toMatch(/^\/ethereum\//);
      }
    }
    for (const world of worlds) {
      expect(world.lessonIds.length, `World ${world.id} is empty`).toBeGreaterThan(0);
      expect(world.description.toLowerCase()).not.toMatch(/coming (later|soon)|placeholder/);
      expect(world.topics.length).toBeGreaterThan(0);
    }
  });
});
