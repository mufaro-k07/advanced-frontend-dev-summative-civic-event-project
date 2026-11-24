// Card templates shared by the dashboard and list pages, so events,
// announcements and promos all look like one product.
const Cards = {
  SHELL_CLASS: 'card-border rounded-card border border-mist bg-white p-5 shadow-sm',

  // Residents only see published items. The backend sends drafts too, so we filter here.
  onlyPublished: function (items) {
    const published = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].published !== false) {
        published.push(items[i]);
      }
    }
    return published;
  },

  // The date block on the left of an event card: month, big day number, weekday.
  // It's hidden from screen readers because the full date is written out next to it.
  dateBlockHtml: function (isoString) {
    const date = new Date(isoString);
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
    return '<div aria-hidden="true" class="flex w-16 shrink-0 flex-col items-center justify-center rounded-card bg-mist py-2 text-lily-teal">' +
        '<span class="text-xs font-bold uppercase">' + month + '</span>' +
        '<span class="font-heading text-[1.75rem] leading-none font-extrabold">' + date.getDate() + '</span>' +
        '<span class="text-xs">' + weekday + '</span>' +
      '</div>';
  },

  // The same status always gets the same colour, and always has a word, never colour alone
  BADGES: {
    registered: { label: 'Registered', className: 'bg-lily-teal text-white' },
    cancelled: { label: 'Cancelled', className: 'border border-ink-soft bg-white text-ink-soft' },
    ended: { label: 'Ended', className: 'bg-mist text-ink' },
    published: { label: 'Published', className: 'bg-success text-white' },
    draft: { label: 'Draft', className: 'bg-sunshine text-ink' },
    active: { label: 'Active', className: 'bg-success text-white' },
    disabled: { label: 'Disabled', className: 'bg-error text-white' },
    admin: { label: 'Admin', className: 'bg-teal-deep text-white' },
    user: { label: 'Resident', className: 'bg-mist text-ink' }
  },

  // The dashed box admins see on resident pages, holding the extra tools only they get
  adminPanelHtml: function (headingId, heading, innerHtml) {
    return '<section aria-labelledby="' + headingId + '" class="mt-12 rounded-panel border-2 border-dashed border-lily-teal bg-white p-6">' +
        '<p class="mb-2"><span class="inline-flex rounded-full bg-sunshine px-2.5 py-0.5 text-[0.8125rem] font-bold text-ink">Admin only</span></p>' +
        '<h2 id="' + headingId + '" tabindex="-1" class="mb-4 text-2xl font-bold">' + heading + '</h2>' +
        innerHtml +
      '</section>';
  },

  badgeHtml: function (status) {
    const badge = Cards.BADGES[status];
    if (!badge) {
      return '';
    }
    return '<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold ' + badge.className + '">' + badge.label + '</span>';
  },

  hasEnded: function (event) {
    const end = event.ends_at || event.starts_at;
    return new Date(end).getTime() < Date.now();
  },

  // "Sat 28 Nov 2026, 08:00 to 14:00", or both dates if it runs over more than one day
  eventWhenText: function (event) {
    const start = UI.formatDate(event.starts_at) + ', ' + UI.formatTime(event.starts_at);
    if (!event.ends_at) {
      return start;
    }
    const sameDay = new Date(event.starts_at).toDateString() === new Date(event.ends_at).toDateString();
    if (sameDay) {
      return start + ' to ' + UI.formatTime(event.ends_at);
    }
    return start + ' to ' + UI.formatDate(event.ends_at) + ', ' + UI.formatTime(event.ends_at);
  },

  // The uploaded photo, or a soft flame placeholder when there isn't one.
  // There's no alt text field in the backend, so the alt names the event.
  eventImageHtml: function (event, sizeClass) {
    const imageUrl = event.metadata && event.metadata.image_url;
    if (imageUrl) {
      return '<img src="' + UI.escapeHtml(imageUrl) + '" alt="Photo for ' + UI.escapeHtml(event.title) + '" class="w-full object-cover ' + sizeClass + '">';
    }
    return '<div aria-hidden="true" class="flame-gradient flex w-full items-center justify-center opacity-90 ' + sizeClass + '">' +
        '<svg class="h-12 w-12 text-white/80" viewBox="0 0 40 40" fill="currentColor">' +
          '<ellipse cx="20" cy="10" rx="5" ry="9"/><ellipse cx="20" cy="10" rx="5" ry="9" transform="rotate(60 20 20)"/>' +
          '<ellipse cx="20" cy="10" rx="5" ry="9" transform="rotate(120 20 20)"/><ellipse cx="20" cy="10" rx="5" ry="9" transform="rotate(180 20 20)"/>' +
          '<ellipse cx="20" cy="10" rx="5" ry="9" transform="rotate(240 20 20)"/><ellipse cx="20" cy="10" rx="5" ry="9" transform="rotate(300 20 20)"/>' +
        '</svg>' +
      '</div>';
  },

  // Bigger card for the events list: photo on top, date block and details underneath.
  // status is 'registered', 'cancelled' or empty, from the person's own registrations.
  eventListCardHtml: function (event, status) {
    const href = Config.pageUrl('pages/event.html?id=' + encodeURIComponent(event.id));
    let badges = '';
    if (Cards.hasEnded(event)) {
      badges += Cards.badgeHtml('ended');
    }
    if (status) {
      badges += Cards.badgeHtml(status);
    }

    return '<article class="card-border flex flex-col overflow-hidden rounded-card border border-mist bg-white shadow-sm">' +
        Cards.eventImageHtml(event, 'h-40') +
        '<div class="flex flex-1 gap-4 p-5">' +
          Cards.dateBlockHtml(event.starts_at) +
          '<div class="min-w-0 flex-1">' +
            (badges ? '<div class="mb-2 flex flex-wrap gap-2">' + badges + '</div>' : '') +
            '<h3 class="text-lg font-bold">' +
              '<a href="' + href + '" class="rounded-control hover:underline">' + UI.escapeHtml(event.title) + '</a>' +
            '</h3>' +
            '<p class="text-sm text-ink-soft">' + UI.escapeHtml(Cards.eventWhenText(event)) + '</p>' +
            '<p class="text-sm text-ink-soft">' + UI.escapeHtml(event.location || 'Location to be confirmed') + '</p>' +
          '</div>' +
        '</div>' +
      '</article>';
  },

  // Promo card. There's no thumbnail field, so a muted, paused video shows its first frame instead.
  // extraHtml is anything else the card needs, like admin badges and buttons.
  promoCardHtml: function (promo, extraHtml) {
    const href = Config.pageUrl('pages/promo.html?id=' + encodeURIComponent(promo.id));
    return '<article class="card-border flex h-full flex-col overflow-hidden rounded-card border border-mist bg-white shadow-sm">' +
        '<div class="relative bg-ink">' +
          '<video src="' + UI.escapeHtml(promo.video_url) + '#t=0.5" preload="metadata" muted playsinline aria-hidden="true" tabindex="-1" class="h-44 w-full object-cover"></video>' +
          '<span aria-hidden="true" class="absolute inset-0 flex items-center justify-center">' +
            '<span class="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-lily-teal">' +
              '<svg class="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.9-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z"/></svg>' +
            '</span>' +
          '</span>' +
        '</div>' +
        '<div class="flex flex-1 flex-col p-5">' +
          '<p class="mb-2"><span class="inline-flex items-center rounded-full bg-mist px-2.5 py-0.5 text-[0.8125rem] font-semibold text-ink">Captions on</span></p>' +
          '<h3 class="text-lg font-bold"><a href="' + href + '" class="rounded-control hover:underline">' + UI.escapeHtml(promo.title) + '</a></h3>' +
          '<p class="mt-1 line-clamp-2 text-sm text-ink-soft">' + UI.escapeHtml(promo.description || '') + '</p>' +
          '<p class="mt-2 text-[0.8125rem] text-ink-soft">' + UI.escapeHtml(UI.formatDate(promo.created_at)) + '</p>' +
          (extraHtml ? '<div class="mt-4">' + extraHtml + '</div>' : '') +
        '</div>' +
      '</article>';
  },

  eventCardHtml: function (event) {
    const href = Config.pageUrl('pages/event.html?id=' + encodeURIComponent(event.id));
    return '<article class="' + Cards.SHELL_CLASS + ' flex gap-4">' +
        Cards.dateBlockHtml(event.starts_at) +
        '<div class="min-w-0">' +
          '<h3 class="text-lg font-bold">' +
            '<a href="' + href + '" class="rounded-control hover:underline">' + UI.escapeHtml(event.title) + '</a>' +
          '</h3>' +
          '<p class="text-sm text-ink-soft">' +
            UI.escapeHtml(UI.formatDate(event.starts_at)) + ' · ' + UI.escapeHtml(UI.formatTime(event.starts_at)) +
          '</p>' +
          '<p class="text-sm text-ink-soft">' + UI.escapeHtml(event.location || 'Location to be confirmed') + '</p>' +
        '</div>' +
      '</article>';
  }
};
