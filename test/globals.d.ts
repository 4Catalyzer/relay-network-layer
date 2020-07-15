declare namespace jest {
  interface Matchers<R> {
    toHaveFetched(
      filter: import('fetch-mock').MockMatcher,
      options?: import('fetch-mock').MockOptions,
    ): R;
    toHaveFetchedTimes(
      n: number,
      filter?: import('fetch-mock').MockMatcher,
      options?: import('fetch-mock').MockOptions,
    ): R;
  }
}

declare module 'fetch-mock-jest';
