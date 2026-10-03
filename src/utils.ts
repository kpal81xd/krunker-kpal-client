export const tryCatch = <T>(fn: () => T) => {
    try {
        return [undefined, fn()] as const;
    } catch (e) {
        return [e instanceof Error ? e : new Error(String(e)), undefined] as const;
    }
};

/** classifies a url as a krunker page, or undefined for anything off krunker.io */
export const pageType = (raw: string) => {
    const [err, url] = tryCatch(() => new URL(raw));
    if (err || !['https:', 'http:'].includes(url.protocol)) {
        return;
    }
    if (url.hostname !== 'krunker.io' && !url.hostname.endsWith('.krunker.io')) {
        return;
    }
    const page = url.pathname.match(/^\/(social|editor|viewer)\.html$/)?.[1];
    return (page ?? 'game') as 'game' | 'social' | 'editor' | 'viewer';
};

export const isWebUrl = (raw: string) => /^https?:\/\//i.test(raw);
