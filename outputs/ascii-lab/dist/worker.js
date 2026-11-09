import { render } from './engine.js';
self.onmessage = (event) => { try {
    const result = render(event.data);
    self.postMessage(result, { transfer: result.image ? [result.image.data.buffer] : [] });
}
catch (error) {
    self.postMessage({ id: event.data.id, error: error instanceof Error ? error.message : String(error) });
} };
