/**
 * Unit tests for schedule.ts
 * Tests schedule parsing, serialization, and manipulation functions
 */

import { describe, it, expect } from 'vitest';
import {
  parseDaySchedule,
  serializeDaySchedule,
  parseWeeklySchedule,
  serializeWeeklySchedule,
  createEmptyDaySchedule,
  createEmptyWeeklySchedule,
  ensureMidnightTransition,
  sortTransitions,
  copyDaySchedule,
  removeDuplicateTransitions
} from '../../src/models/schedule';
import { DaySchedule, MQTTWeeklySchedule, Transition } from '../../src/models/types';

describe('schedule.ts', () => {
  describe('parseDaySchedule', () => {
    it('should parse valid schedule string', () => {
      const input = '00:00/20 06:00/22 08:00/18 17:00/22 22:00/18';
      const result = parseDaySchedule(input);

      expect(result.transitions).toHaveLength(5);
      expect(result.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
      expect(result.transitions[1]).toMatchObject({ time: '06:00', temperature: 22 });
      expect(result.transitions[2]).toMatchObject({ time: '08:00', temperature: 18 });
      expect(result.transitions[3]).toMatchObject({ time: '17:00', temperature: 22 });
      expect(result.transitions[4]).toMatchObject({ time: '22:00', temperature: 18 });
    });

    it('should parse schedule with decimal temperatures', () => {
      const input = '00:00/20.5 12:00/22.5';
      const result = parseDaySchedule(input);

      expect(result.transitions).toHaveLength(2);
      expect(result.transitions[0].temperature).toBe(20.5);
      expect(result.transitions[1].temperature).toBe(22.5);
    });

    it('should handle empty string', () => {
      const result = parseDaySchedule('');

      expect(result.transitions).toHaveLength(1);
      expect(result.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
    });

    it('should handle whitespace-only string', () => {
      const result = parseDaySchedule('   ');

      expect(result.transitions).toHaveLength(1);
      expect(result.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
    });

    it('should skip malformed transitions and continue parsing', () => {
      const input = '00:00/20 invalid 06:00/22 bad/format 08:00/18';
      const result = parseDaySchedule(input);

      // Should have 3 valid transitions
      expect(result.transitions).toHaveLength(3);
      expect(result.transitions[0].time).toBe('00:00');
      expect(result.transitions[1].time).toBe('06:00');
      expect(result.transitions[2].time).toBe('08:00');
    });

    it('should return default schedule when all transitions are malformed', () => {
      const input = 'invalid bad wrong';
      const result = parseDaySchedule(input);

      expect(result.transitions).toHaveLength(1);
      expect(result.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
    });

    it('should add midnight transition if missing', () => {
      const input = '06:00/22 08:00/18';
      const result = parseDaySchedule(input);

      expect(result.transitions[0].time).toBe('00:00');
      expect(result.transitions).toHaveLength(3);
    });

    it('should sort transitions chronologically', () => {
      const input = '22:00/18 06:00/22 00:00/20';
      const result = parseDaySchedule(input);

      expect(result.transitions[0].time).toBe('00:00');
      expect(result.transitions[1].time).toBe('06:00');
      expect(result.transitions[2].time).toBe('22:00');
    });

    it('should handle extra whitespace between transitions', () => {
      const input = '00:00/20    06:00/22   08:00/18';
      const result = parseDaySchedule(input);

      expect(result.transitions).toHaveLength(3);
      expect(result.transitions[0].time).toBe('00:00');
    });
  });

  describe('serializeDaySchedule', () => {
    it('should serialize schedule to MQTT format', () => {
      const schedule: DaySchedule = {
        transitions: [
          { time: '00:00', temperature: 20 },
          { time: '06:00', temperature: 22 },
          { time: '08:00', temperature: 18 }
        ]
      };

      const result = serializeDaySchedule(schedule);

      expect(result).toBe('00:00/20 06:00/22 08:00/18');
    });

    it('should format decimal temperatures correctly', () => {
      const schedule: DaySchedule = {
        transitions: [
          { time: '00:00', temperature: 20.5 },
          { time: '12:00', temperature: 22.5 }
        ]
      };

      const result = serializeDaySchedule(schedule);

      expect(result).toBe('00:00/20.5 12:00/22.5');
    });

    it('should format whole number temperatures without decimals', () => {
      const schedule: DaySchedule = {
        transitions: [
          { time: '00:00', temperature: 20.0 },
          { time: '12:00', temperature: 22.0 }
        ]
      };

      const result = serializeDaySchedule(schedule);

      expect(result).toBe('00:00/20 12:00/22');
    });

    it('should sort transitions before serializing', () => {
      const schedule: DaySchedule = {
        transitions: [
          { time: '22:00', temperature: 18 },
          { time: '06:00', temperature: 22 },
          { time: '00:00', temperature: 20 }
        ]
      };

      const result = serializeDaySchedule(schedule);

      expect(result).toBe('00:00/20 06:00/22 22:00/18');
    });

    it('should handle single transition', () => {
      const schedule: DaySchedule = {
        transitions: [{ time: '00:00', temperature: 20 }]
      };

      const result = serializeDaySchedule(schedule);

      expect(result).toBe('00:00/20');
    });
  });

  describe('parseWeeklySchedule', () => {
    it('should parse all days of the week', () => {
      const mqtt: MQTTWeeklySchedule = {
        sunday: '00:00/20 06:00/22',
        monday: '00:00/18 07:00/22',
        tuesday: '00:00/19 08:00/22',
        wednesday: '00:00/20 09:00/22',
        thursday: '00:00/21 10:00/22',
        friday: '00:00/22 11:00/22',
        saturday: '00:00/23 12:00/22'
      };

      const result = parseWeeklySchedule(mqtt);

      expect(result.sunday.transitions[0].temperature).toBe(20);
      expect(result.monday.transitions[0].temperature).toBe(18);
      expect(result.tuesday.transitions[0].temperature).toBe(19);
      expect(result.wednesday.transitions[0].temperature).toBe(20);
      expect(result.thursday.transitions[0].temperature).toBe(21);
      expect(result.friday.transitions[0].temperature).toBe(22);
      expect(result.saturday.transitions[0].temperature).toBe(23);
    });

    it('should handle empty day schedules', () => {
      const mqtt: MQTTWeeklySchedule = {
        sunday: '',
        monday: '',
        tuesday: '',
        wednesday: '',
        thursday: '',
        friday: '',
        saturday: ''
      };

      const result = parseWeeklySchedule(mqtt);

      // All days should have default schedule
      expect(result.sunday.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
      expect(result.monday.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
    });

    it('should handle missing day properties', () => {
      const mqtt = {} as MQTTWeeklySchedule;

      const result = parseWeeklySchedule(mqtt);

      // All days should have default schedule
      expect(result.sunday.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
      expect(result.monday.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
    });
  });

  describe('serializeWeeklySchedule', () => {
    it('should serialize all days of the week', () => {
      const schedule = createEmptyWeeklySchedule();
      schedule.sunday.transitions = [{ time: '00:00', temperature: 20 }];
      schedule.monday.transitions = [{ time: '00:00', temperature: 18 }];

      const result = serializeWeeklySchedule(schedule);

      expect(result.sunday).toBe('00:00/20');
      expect(result.monday).toBe('00:00/18');
      expect(result.tuesday).toBe('00:00/20');
    });

    it('should maintain day structure', () => {
      const schedule = createEmptyWeeklySchedule();

      const result = serializeWeeklySchedule(schedule);

      expect(result).toHaveProperty('sunday');
      expect(result).toHaveProperty('monday');
      expect(result).toHaveProperty('tuesday');
      expect(result).toHaveProperty('wednesday');
      expect(result).toHaveProperty('thursday');
      expect(result).toHaveProperty('friday');
      expect(result).toHaveProperty('saturday');
    });
  });

  describe('createEmptyDaySchedule', () => {
    it('should create schedule with midnight transition', () => {
      const result = createEmptyDaySchedule();

      expect(result.transitions).toHaveLength(1);
      expect(result.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
    });

    it('should create new instance each time', () => {
      const schedule1 = createEmptyDaySchedule();
      const schedule2 = createEmptyDaySchedule();

      expect(schedule1).not.toBe(schedule2);
      expect(schedule1.transitions).not.toBe(schedule2.transitions);
    });
  });

  describe('createEmptyWeeklySchedule', () => {
    it('should create schedule for all 7 days', () => {
      const result = createEmptyWeeklySchedule();

      expect(result.sunday.transitions).toHaveLength(1);
      expect(result.monday.transitions).toHaveLength(1);
      expect(result.tuesday.transitions).toHaveLength(1);
      expect(result.wednesday.transitions).toHaveLength(1);
      expect(result.thursday.transitions).toHaveLength(1);
      expect(result.friday.transitions).toHaveLength(1);
      expect(result.saturday.transitions).toHaveLength(1);
    });

    it('should initialize all days with default temperature', () => {
      const result = createEmptyWeeklySchedule();

      expect(result.sunday.transitions[0].temperature).toBe(20);
      expect(result.monday.transitions[0].temperature).toBe(20);
      expect(result.saturday.transitions[0].temperature).toBe(20);
    });
  });

  describe('ensureMidnightTransition', () => {
    it('should not modify schedule that already has midnight transition', () => {
      const schedule: DaySchedule = {
        transitions: [
          { time: '00:00', temperature: 20 },
          { time: '06:00', temperature: 22 }
        ]
      };

      const result = ensureMidnightTransition(schedule);

      expect(result.transitions).toHaveLength(2);
      expect(result.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
    });

    it('should add midnight transition when missing', () => {
      const schedule: DaySchedule = {
        transitions: [
          { time: '06:00', temperature: 22 },
          { time: '08:00', temperature: 18 }
        ]
      };

      const result = ensureMidnightTransition(schedule);

      expect(result.transitions).toHaveLength(3);
      expect(result.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
    });

    it('should add midnight transition with default temperature 20', () => {
      const schedule: DaySchedule = {
        transitions: [{ time: '12:00', temperature: 25 }]
      };

      const result = ensureMidnightTransition(schedule);

      expect(result.transitions[0].temperature).toBe(20);
    });

    it('should sort transitions after adding midnight', () => {
      const schedule: DaySchedule = {
        transitions: [
          { time: '22:00', temperature: 18 },
          { time: '06:00', temperature: 22 }
        ]
      };

      const result = ensureMidnightTransition(schedule);

      expect(result.transitions[0].time).toBe('00:00');
      expect(result.transitions[1].time).toBe('06:00');
      expect(result.transitions[2].time).toBe('22:00');
    });

    it('should not mutate original schedule', () => {
      const schedule: DaySchedule = {
        transitions: [{ time: '06:00', temperature: 22 }]
      };

      const result = ensureMidnightTransition(schedule);

      expect(schedule.transitions).toHaveLength(1);
      expect(result.transitions).toHaveLength(2);
    });
  });

  describe('sortTransitions', () => {
    it('should sort transitions chronologically', () => {
      const transitions: Transition[] = [
        { time: '22:00', temperature: 18 },
        { time: '06:00', temperature: 22 },
        { time: '00:00', temperature: 20 },
        { time: '12:00', temperature: 24 }
      ];

      const result = sortTransitions(transitions);

      expect(result[0].time).toBe('00:00');
      expect(result[1].time).toBe('06:00');
      expect(result[2].time).toBe('12:00');
      expect(result[3].time).toBe('22:00');
    });

    it('should not mutate original array', () => {
      const transitions: Transition[] = [
        { time: '22:00', temperature: 18 },
        { time: '06:00', temperature: 22 }
      ];

      const result = sortTransitions(transitions);

      expect(transitions[0].time).toBe('22:00');
      expect(result[0].time).toBe('06:00');
    });

    it('should handle already sorted transitions', () => {
      const transitions: Transition[] = [
        { time: '00:00', temperature: 20 },
        { time: '06:00', temperature: 22 },
        { time: '12:00', temperature: 24 }
      ];

      const result = sortTransitions(transitions);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ time: '00:00', temperature: 20 });
      expect(result[1]).toMatchObject({ time: '06:00', temperature: 22 });
      expect(result[2]).toMatchObject({ time: '12:00', temperature: 24 });
    });

    it('should handle single transition', () => {
      const transitions: Transition[] = [{ time: '00:00', temperature: 20 }];

      const result = sortTransitions(transitions);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ time: '00:00', temperature: 20 });
    });

    it('should handle empty array', () => {
      const transitions: Transition[] = [];

      const result = sortTransitions(transitions);

      expect(result).toHaveLength(0);
    });

    it('should correctly sort times with same hour', () => {
      const transitions: Transition[] = [
        { time: '06:30', temperature: 22 },
        { time: '06:00', temperature: 20 },
        { time: '06:45', temperature: 24 }
      ];

      const result = sortTransitions(transitions);

      expect(result[0].time).toBe('06:00');
      expect(result[1].time).toBe('06:30');
      expect(result[2].time).toBe('06:45');
    });
  });

  describe('copyDaySchedule', () => {
    it('should create deep copy of schedule', () => {
      const source: DaySchedule = {
        transitions: [
          { time: '00:00', temperature: 20 },
          { time: '06:00', temperature: 22 }
        ]
      };

      const result = copyDaySchedule(source);

      // Check that time and temperature are preserved
      expect(result.transitions).toHaveLength(2);
      expect(result.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
      expect(result.transitions[1]).toMatchObject({ time: '06:00', temperature: 22 });
      expect(result).not.toBe(source);
      expect(result.transitions).not.toBe(source.transitions);
    });

    it('should not share transition references', () => {
      const source: DaySchedule = {
        transitions: [{ time: '00:00', temperature: 20 }]
      };

      const result = copyDaySchedule(source);

      expect(result.transitions[0]).not.toBe(source.transitions[0]);
    });

    it('should allow independent modification of copy', () => {
      const source: DaySchedule = {
        transitions: [{ time: '00:00', temperature: 20 }]
      };

      const result = copyDaySchedule(source);
      result.transitions[0].temperature = 25;

      expect(source.transitions[0].temperature).toBe(20);
      expect(result.transitions[0].temperature).toBe(25);
    });

    it('should handle empty schedule', () => {
      const source: DaySchedule = {
        transitions: []
      };

      const result = copyDaySchedule(source);

      expect(result.transitions).toHaveLength(0);
      expect(result.transitions).not.toBe(source.transitions);
    });

    it('should preserve all transition properties', () => {
      const source: DaySchedule = {
        transitions: [
          { time: '00:00', temperature: 20.5 },
          { time: '06:30', temperature: 22.5 },
          { time: '12:45', temperature: 24.5 }
        ]
      };

      const result = copyDaySchedule(source);

      expect(result.transitions[0]).toMatchObject({ time: '00:00', temperature: 20.5 });
      expect(result.transitions[1]).toMatchObject({ time: '06:30', temperature: 22.5 });
      expect(result.transitions[2]).toMatchObject({ time: '12:45', temperature: 24.5 });
    });
  });

  describe('removeDuplicateTransitions', () => {
    it('should remove duplicate transitions with same time', () => {
      const transitions: Transition[] = [
        { time: '00:00', temperature: 20 },
        { time: '06:00', temperature: 22 },
        { time: '06:00', temperature: 24 },
        { time: '08:00', temperature: 18 }
      ];

      const result = removeDuplicateTransitions(transitions);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ time: '00:00', temperature: 20 });
      expect(result[1]).toMatchObject({ time: '06:00', temperature: 22 });
      expect(result[2]).toMatchObject({ time: '08:00', temperature: 18 });
    });

    it('should keep first occurrence when duplicates exist', () => {
      const transitions: Transition[] = [
        { time: '06:00', temperature: 20 },
        { time: '06:00', temperature: 22 },
        { time: '06:00', temperature: 24 }
      ];

      const result = removeDuplicateTransitions(transitions);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ time: '06:00', temperature: 20 });
    });

    it('should handle no duplicates', () => {
      const transitions: Transition[] = [
        { time: '00:00', temperature: 20 },
        { time: '06:00', temperature: 22 },
        { time: '08:00', temperature: 18 }
      ];

      const result = removeDuplicateTransitions(transitions);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ time: '00:00', temperature: 20 });
      expect(result[1]).toMatchObject({ time: '06:00', temperature: 22 });
      expect(result[2]).toMatchObject({ time: '08:00', temperature: 18 });
    });

    it('should not mutate original array', () => {
      const transitions: Transition[] = [
        { time: '06:00', temperature: 20 },
        { time: '06:00', temperature: 22 }
      ];

      const result = removeDuplicateTransitions(transitions);

      expect(transitions).toHaveLength(2);
      expect(result).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const transitions: Transition[] = [];

      const result = removeDuplicateTransitions(transitions);

      expect(result).toHaveLength(0);
    });

    it('should handle single transition', () => {
      const transitions: Transition[] = [{ time: '00:00', temperature: 20 }];

      const result = removeDuplicateTransitions(transitions);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ time: '00:00', temperature: 20 });
    });

    it('should preserve order of first occurrences', () => {
      const transitions: Transition[] = [
        { time: '12:00', temperature: 24 },
        { time: '06:00', temperature: 22 },
        { time: '12:00', temperature: 26 },
        { time: '00:00', temperature: 20 },
        { time: '06:00', temperature: 23 }
      ];

      const result = removeDuplicateTransitions(transitions);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ time: '12:00', temperature: 24 });
      expect(result[1]).toMatchObject({ time: '06:00', temperature: 22 });
      expect(result[2]).toMatchObject({ time: '00:00', temperature: 20 });
    });
  });

  describe('parseDaySchedule with duplicates', () => {
    it('should remove duplicate transitions when parsing', () => {
      const input = '00:00/20 06:00/22 06:00/24 08:00/18';
      const result = parseDaySchedule(input);

      expect(result.transitions).toHaveLength(3);
      expect(result.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
      expect(result.transitions[1]).toMatchObject({ time: '06:00', temperature: 22 });
      expect(result.transitions[2]).toMatchObject({ time: '08:00', temperature: 18 });
    });

    it('should keep first occurrence when parsing duplicates', () => {
      const input = '06:00/20 06:00/22 06:00/24';
      const result = parseDaySchedule(input);

      // Should have 00:00 (auto-added) and 06:00 (first occurrence)
      expect(result.transitions).toHaveLength(2);
      expect(result.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
      expect(result.transitions[1]).toMatchObject({ time: '06:00', temperature: 20 });
    });

    it('should handle multiple sets of duplicates', () => {
      const input = '06:00/20 06:00/22 08:00/18 08:00/19 10:00/21';
      const result = parseDaySchedule(input);

      expect(result.transitions).toHaveLength(4);
      expect(result.transitions[0]).toMatchObject({ time: '00:00', temperature: 20 });
      expect(result.transitions[1]).toMatchObject({ time: '06:00', temperature: 20 });
      expect(result.transitions[2]).toMatchObject({ time: '08:00', temperature: 18 });
      expect(result.transitions[3]).toMatchObject({ time: '10:00', temperature: 21 });
    });
  });

  describe('serializeDaySchedule with duplicates', () => {
    it('should remove duplicate transitions when serializing', () => {
      const schedule: DaySchedule = {
        transitions: [
          { time: '00:00', temperature: 20 },
          { time: '06:00', temperature: 22 },
          { time: '06:00', temperature: 24 },
          { time: '08:00', temperature: 18 }
        ]
      };

      const result = serializeDaySchedule(schedule);

      expect(result).toBe('00:00/20 06:00/22 08:00/18');
    });

    it('should keep first occurrence when serializing duplicates', () => {
      const schedule: DaySchedule = {
        transitions: [
          { time: '06:00', temperature: 20 },
          { time: '06:00', temperature: 22 },
          { time: '06:00', temperature: 24 }
        ]
      };

      const result = serializeDaySchedule(schedule);

      expect(result).toBe('06:00/20');
    });

    it('should handle duplicates with decimal temperatures', () => {
      const schedule: DaySchedule = {
        transitions: [
          { time: '00:00', temperature: 20.5 },
          { time: '06:00', temperature: 22.5 },
          { time: '06:00', temperature: 24.5 }
        ]
      };

      const result = serializeDaySchedule(schedule);

      expect(result).toBe('00:00/20.5 06:00/22.5');
    });
  });
});
