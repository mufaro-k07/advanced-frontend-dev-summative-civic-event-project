// Video and social links on events (metadata.links). The admin form uses this to check
// the links, and the event page uses it to turn them into a video or a link card.
const EventLinks = {
  MAX: 5,

  // Same sites the backend accepts
  PLATFORMS: [
    { name: 'youtube', domains: ['youtube.com', 'youtu.be'] },
    { name: 'instagram', domains: ['instagram.com'] },
    { name: 'tiktok', domains: ['tiktok.com'] }
  ],

  // Returns a URL object, or null if the text isn't a proper web link
  parse: function (text) {
    try {
      const url = new URL(text.trim());
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url;
      }
    } catch (err) {
      // Not a URL
    }
    return null;
  },

  // 'youtube', 'instagram', 'tiktok', or '' for anything else. www. and other subdomains count too.
  platformFor: function (text) {
    const url = EventLinks.parse(text);
    if (!url) {
      return '';
    }
    const host = url.hostname.toLowerCase();
    for (let i = 0; i < EventLinks.PLATFORMS.length; i++) {
      const platform = EventLinks.PLATFORMS[i];
      for (let j = 0; j < platform.domains.length; j++) {
        const domain = platform.domains[j];
        if (host === domain || host.endsWith('.' + domain)) {
          return platform.name;
        }
      }
    }
    return '';
  },

  // Works for youtube.com/watch?v=ID and youtu.be/ID. Returns '' if there's no id we trust.
  youtubeId: function (text) {
    const url = EventLinks.parse(text);
    if (!url) {
      return '';
    }
    let id = '';
    if (url.hostname.toLowerCase().endsWith('youtu.be')) {
      id = url.pathname.slice(1).split('/')[0];
    } else {
      id = url.searchParams.get('v') || '';
    }
    // YouTube ids are letters, numbers, - and _, so anything else is a broken link
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : '';
  },

  // "instagram.com/p/C1abc" instead of the full link with https:// and tracking bits
  shortUrl: function (text) {
    const url = EventLinks.parse(text);
    if (!url) {
      return text;
    }
    const path = url.pathname.replace(/\/$/, '');
    return url.hostname.replace(/^www\./, '') + path;
  }
};
