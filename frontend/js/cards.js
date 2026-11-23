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
