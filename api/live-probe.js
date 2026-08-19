import handler from '../server-dist/live-source.js';

export const config = {
  maxDuration: 300,
};

export default {
  async fetch(request) {
    const target = new URL('/api/live', request.url);
    return handler.fetch(new Request(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ inep: '33069247' }),
    }));
  },
};
