let EVENTS = {};

const emitImpl = (event, ...args) => {
  setTimeout(() => {
    if (!EVENTS[event] || !EVENTS[event].length) return;

    EVENTS[event].forEach((func) => func(...args));
  });
};

export const serverEmit = jest.fn(emitImpl);

export function reset() {
  EVENTS = {};
  serverEmit.mockReset().mockImplementation(emitImpl);
}

export function io(origin, opts) {
  const socket = {
    origin,
    opts,
    connected: false,
    emit: jest.fn(),
    on: jest.fn((event, func) => {
      if (event === 'connect') {
        setTimeout(() => {
          socket.connected = true;
          serverEmit('connect');
        });
      }

      if (EVENTS[event]) EVENTS[event].push(func);
      else EVENTS[event] = [func];
      return socket;
    }),
    disconnect: reset,
  };

  return socket;
}
