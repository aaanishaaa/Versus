export const PROBLEMS = {
  'two-sum': {
    id: 'two-sum',
    title: 'Two Sum (Indices)',
    difficulty: 'easy',
    description:
      'Given n and then n numbers followed by a target, print two 0-based indices whose values sum to target. Print -1 -1 if no solution exists.',
    samples: [
      {
        input: '4\n2 7 11 15\n9',
        expected: '0 1',
      },
      {
        input: '5\n1 4 6 8 10\n14',
        expected: '1 3',
      },
      {
        input: '3\n1 2 3\n10',
        expected: '-1 -1',
      },
    ],
    testCases: [
      { stdin: '4\n2 7 11 15\n9', expected: '0 1' },
      { stdin: '5\n1 4 6 8 10\n14', expected: '1 3' },
      { stdin: '6\n3 2 4 8 5 9\n13', expected: '2 4' },
    ],
  },
  'valid-parentheses': {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'easy',
    description:
      'Given a string containing only ()[]{} characters, print VALID if it is balanced, otherwise print INVALID.',
    samples: [
      { input: '()[]{}', expected: 'VALID' },
      { input: '([)]', expected: 'INVALID' },
      { input: '((()))', expected: 'VALID' },
    ],
    testCases: [
      { stdin: '()[]{}', expected: 'VALID' },
      { stdin: '([)]', expected: 'INVALID' },
      { stdin: '{[()()]}', expected: 'VALID' },
    ],
  },
  'merge-intervals': {
    id: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'medium',
    description:
      'Given n intervals as start end pairs, merge overlaps and print each merged interval on a new line as start end.',
    samples: [
      { input: '4\n1 3\n2 6\n8 10\n15 18', expected: '1 6\n8 10\n15 18' },
      { input: '3\n1 4\n4 5\n7 9', expected: '1 5\n7 9' },
      { input: '2\n1 2\n3 4', expected: '1 2\n3 4' },
    ],
    testCases: [
      { stdin: '4\n1 3\n2 6\n8 10\n15 18', expected: '1 6\n8 10\n15 18' },
      { stdin: '3\n1 4\n4 5\n7 9', expected: '1 5\n7 9' },
      { stdin: '5\n1 2\n2 3\n6 8\n7 9\n10 12', expected: '1 3\n6 9\n10 12' },
    ],
  },
};

export const getProblemById = (problemId) => {
  return PROBLEMS[problemId] || null;
};
