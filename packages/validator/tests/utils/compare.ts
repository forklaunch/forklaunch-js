export const compare = (received: unknown, expected: unknown) => {
  switch (typeof received) {
    case 'bigint':
      return expect(received).toBe(expected);
    default:
      return expect(JSON.stringify(received)).toBe(JSON.stringify(expected));
  }
};
