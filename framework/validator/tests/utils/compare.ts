export const compare = (received: unknown, expected: unknown) => {
  switch (typeof received) {
    case 'bigint':
      return expect(expected).toEqual(received);
    default:
      return expect(JSON.stringify(expected)).toEqual(JSON.stringify(received));
  }
};
