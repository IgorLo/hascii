import { render } from './engine.js';
import type { Job } from './types.js';
self.onmessage = (event: MessageEvent<Job>) => {
  try {
    const result = render(event.data);
    self.postMessage(result, { transfer: result.image ? [result.image.data.buffer] : [] });
  } catch (error) {
    self.postMessage({
      id: event.data.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
