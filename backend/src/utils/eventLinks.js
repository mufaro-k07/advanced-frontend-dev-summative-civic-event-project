// Video and social links an admin can add to an event (metadata.links)

export const ALLOWED_LINK_DOMAINS = ['youtube.com', 'youtu.be', 'instagram.com', 'tiktok.com'];
export const MAX_EVENT_LINKS = 5;

// Accepts the domain itself and its subdomains, like www.youtube.com or vm.tiktok.com
const isAllowedHost = (hostname) => {
    const host = hostname.toLowerCase();
    return ALLOWED_LINK_DOMAINS.some(
        (domain) => host === domain || host.endsWith(`.${domain}`)
    );
};

// The form sends one URL per line. Anything that isn't a proper http(s) link
// to one of the allowed sites is dropped, and we keep the first 5.
export const parseEventLinks = (text) => {
    if (typeof text !== 'string') return [];

    const links = [];
    for (const line of text.split(/\r?\n/)) {
        const value = line.trim();
        if (!value) continue;

        try {
            const url = new URL(value);
            const isWebLink = url.protocol === 'https:' || url.protocol === 'http:';
            if (isWebLink && isAllowedHost(url.hostname) && !links.includes(value)) {
                links.push(value);
            }
        } catch {
            // Not a URL at all, so skip it
        }

        if (links.length === MAX_EVENT_LINKS) break;
    }
    return links;
};
