import { supabase } from './auth.service';

const urlCache = new Map<string, { url: string; expiresAt: number }>();

export const StorageService = {
  getSignedUrl: async (path: string): Promise<string | null> => {
    if (!path) return null;

    const cached = urlCache.get(path);
    if (cached && cached.expiresAt - Date.now() > 5 * 60 * 1000) {
      return cached.url;
    }

    const { data, error } = await supabase.storage
      .from('item-photos')
      .createSignedUrls([path], 3600);

    if (error || !data?.[0]?.signedUrl) return null;

    const signedUrl = data[0].signedUrl;
    urlCache.set(path, {
      url: signedUrl,
      expiresAt: Date.now() + 3600 * 1000,
    });

    return signedUrl;
  },

  getSignedUrls: async (paths: string[]): Promise<Record<string, string>> => {
    const result: Record<string, string> = {};
    const toFetch: string[] = [];

    for (const path of paths) {
      const cached = urlCache.get(path);
      if (cached && cached.expiresAt - Date.now() > 5 * 60 * 1000) {
        result[path] = cached.url;
      } else {
        toFetch.push(path);
      }
    }

    if (toFetch.length === 0) return result;

    const { data, error } = await supabase.storage
      .from('item-photos')
      .createSignedUrls(toFetch, 3600);

    if (error || !data) return result;

    for (const entry of data) {
      if (entry.path && entry.signedUrl) {
        result[entry.path] = entry.signedUrl;
        urlCache.set(entry.path, {
          url: entry.signedUrl,
          expiresAt: Date.now() + 3600 * 1000,
        });
      }
    }

    return result;
  },

  uploadItemPhoto: async (
    uri: string,
    fileExt: string = 'jpg'
  ): Promise<string> => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const fileName = `${timestamp}-${random}.${fileExt}`;
    const filePath = `items/${fileName}`;

    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from('item-photos')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (error) throw error;
    return filePath;
  },
};
