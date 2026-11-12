async function decodeNative(source: string | Blob): Promise<HTMLImageElement> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    if (typeof source !== 'string') URL.revokeObjectURL(url);
  }
}

/** Native decoders handle common photos; HEIC falls back to a browser-local decoder. */
export async function decodePhoto(
  source: string | File,
  onHeicConversion: () => void,
): Promise<HTMLImageElement> {
  try {
    return await decodeNative(source);
  } catch (error) {
    if (typeof source === 'string') throw error;
    // HEIC uses an ISO-BMFF container. Check its header as well as metadata,
    // since file pickers can supply an empty MIME type or a generic filename.
    const container = await source.slice(4, 8).text();
    if (
      container !== 'ftyp' &&
      !/\.hei[cf]$/i.test(source.name) &&
      !/^image\/hei[cf]/i.test(source.type)
    ) {
      throw error;
    }
    const { isHeic, heicTo } = await import('heic-to');
    if (!(await isHeic(source))) throw error;
    onHeicConversion();
    const converted = await heicTo({ blob: source, type: 'image/png' });
    return decodeNative(converted);
  }
}
