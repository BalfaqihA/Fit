import {
  ALL_EXERCISES,
  exerciseImageUrl,
  exerciseImageUrls,
  getExerciseById,
} from '../exercises';

describe('ALL_EXERCISES', () => {
  it('loads a non-empty exercise catalog', () => {
    expect(ALL_EXERCISES.length).toBeGreaterThan(0);
    expect(ALL_EXERCISES[0]).toHaveProperty('id');
    expect(ALL_EXERCISES[0]).toHaveProperty('name');
  });
});

describe('getExerciseById', () => {
  it('returns the matching record for a known id', () => {
    const first = ALL_EXERCISES[0];
    expect(getExerciseById(first.id)).toEqual(first);
  });

  it('returns undefined for unknown ids', () => {
    expect(getExerciseById('does-not-exist-xyz')).toBeUndefined();
  });

  it('returns undefined for null/undefined/empty input', () => {
    expect(getExerciseById(null)).toBeUndefined();
    expect(getExerciseById(undefined)).toBeUndefined();
    expect(getExerciseById('')).toBeUndefined();
  });
});

describe('exerciseImageUrl', () => {
  it('prefixes the free-exercise-db raw base and encodes the path', () => {
    expect(exerciseImageUrl('Dead_Bug/0.jpg')).toBe(
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dead_Bug/0.jpg',
    );
  });

  it('encodes spaces in the relative path', () => {
    expect(exerciseImageUrl('Bench Press/0.jpg')).toContain('Bench%20Press/0.jpg');
  });
});

describe('exerciseImageUrls', () => {
  it('returns [] for missing record or empty images', () => {
    expect(exerciseImageUrls(undefined)).toEqual([]);
    expect(
      exerciseImageUrls({ images: [] } as never),
    ).toEqual([]);
  });

  it('maps every image to a full url', () => {
    const urls = exerciseImageUrls({ images: ['A/0.jpg', 'A/1.jpg'] } as never);
    expect(urls).toEqual([
      exerciseImageUrl('A/0.jpg'),
      exerciseImageUrl('A/1.jpg'),
    ]);
  });
});
