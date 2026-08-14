import { describe, it, expect } from 'vitest';
import { getInitials, truncate, toTitleCase, normalizeDifficulty, subjectEmoji } from './string';

describe('String Utilities', () => {
  describe('getInitials', () => {
    it('returns 1-2 uppercase initials from a full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Jane')).toBe('J');
      expect(getInitials('john doe smith')).toBe('JD');
      expect(getInitials('  Alice   Bob  ')).toBe('AB');
    });

    it('returns ? for empty or invalid names', () => {
      expect(getInitials('')).toBe('?');
      expect(getInitials('   ')).toBe('?');
      expect(getInitials(null as unknown as string)).toBe('?');
    });
  });

  describe('truncate', () => {
    it('truncates strings longer than maxLength and adds an ellipsis', () => {
      expect(truncate('Hello World', 5)).toBe('Hell…');
      expect(truncate('Short', 10)).toBe('Short');
    });

    it('handles null or empty strings gracefully', () => {
      expect(truncate('', 5)).toBe('');
      expect(truncate(null, 5)).toBe('');
      expect(truncate(undefined, 5)).toBe('');
    });
  });

  describe('toTitleCase', () => {
    it('converts snake_case to Title Case', () => {
      expect(toTitleCase('hello_world')).toBe('Hello World');
      expect(toTitleCase('my_awesome_project')).toBe('My Awesome Project');
    });
  });

  describe('normalizeDifficulty', () => {
    it('normalizes various strings correctly', () => {
      expect(normalizeDifficulty('Intermediate')).toBe('Intermediate');
      expect(normalizeDifficulty('medium difficulty')).toBe('Intermediate');
      expect(normalizeDifficulty('Hard')).toBe('Advanced');
      expect(normalizeDifficulty('advanced level')).toBe('Advanced');
      expect(normalizeDifficulty('Beginner')).toBe('Beginner');
      expect(normalizeDifficulty('Something else')).toBe('Beginner');
    });

    it('defaults to Beginner for null', () => {
      expect(normalizeDifficulty(null)).toBe('Beginner');
    });
  });

  describe('subjectEmoji', () => {
    it('maps subjects to correct emojis', () => {
      expect(subjectEmoji('Mathematics')).toBe('🔢');
      expect(subjectEmoji('Computer Science')).toBe('🔬'); // Wait, Computer Science matches 'science' first or 'computer' first depending on order
      expect(subjectEmoji('English Literature')).toBe('📚');
      expect(subjectEmoji('World History')).toBe('🏛️');
      expect(subjectEmoji('Unknown Subject')).toBe('📖');
    });
  });
});
