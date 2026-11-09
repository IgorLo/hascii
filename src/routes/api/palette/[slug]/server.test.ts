import { describe, expect, it, vi } from 'vitest';

import { GET } from './+server';

function event(slug: string, fetcher: typeof fetch) {
  return { params: { slug }, fetch: fetcher } as Parameters<typeof GET>[0];
}
describe('Lospec server boundary', () => {
  it('fetches only the fixed upstream and normalizes palette data', async () => {
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ name: 'Example', colors: ['ff0088', '000000'] }));
    const response = await GET(event('example', upstream));
    expect(upstream).toHaveBeenCalledWith(
      'https://lospec.com/palette-list/example.json',
      expect.objectContaining({ redirect: 'error' }),
    );
    expect(await response.json()).toMatchObject({
      id: 'example',
      author: 'Lospec',
      colors: ['ff0088', '000000'],
    });
  });
  it('rejects path traversal without fetching', async () => {
    const upstream = vi.fn<typeof fetch>();
    await expect(GET(event('../secret', upstream))).rejects.toMatchObject({ status: 400 });
    expect(upstream).not.toHaveBeenCalled();
  });
  it('reports missing palettes', async () => {
    await expect(
      GET(
        event('absent', vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 404 }))),
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('reports network failure', async () => {
    await expect(
      GET(event('example', vi.fn<typeof fetch>().mockRejectedValue(new Error('timeout')))),
    ).rejects.toMatchObject({ status: 502 });
  });
  it.each([null, {}, { name: 'x', colors: [] }, { name: 'x', colors: ['invalid'] }])(
    'rejects malformed upstream data',
    async (data) => {
      await expect(
        GET(event('example', vi.fn<typeof fetch>().mockResolvedValue(Response.json(data)))),
      ).rejects.toMatchObject({ status: 502 });
    },
  );
});
