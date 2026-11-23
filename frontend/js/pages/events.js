// Events list. The backend has no search, filters or paging, so it all happens here in the browser.

const EVENTS_PER_PAGE = 6;

const eventsPage = {
  allEvents: [],
  statusByEventId: {},
  currentPage: 1,
  searchTimer: null
};

// Filtering

function matchesSearch(event, searchText) {
  if (searchText === '') {
    return true;
  }
  const haystack = [event.title, event.description, event.location].join(' ').toLowerCase();
  return haystack.indexOf(searchText) !== -1;
}

function matchesWhen(event, when) {
  const now = new Date();
  const start = new Date(event.starts_at);
  const ended = Cards.hasEnded(event);

  if (when === 'all') {
    return true;
  }
  if (when === 'past') {
    return ended;
  }
  if (when === 'upcoming') {
    return !ended;
  }
  if (when === 'week') {
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return !ended && start <= weekFromNow;
  }
  if (when === 'month') {
    return !ended && start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
  }
  return true;
}

function filteredEvents() {
  const searchText = $('#search').val().trim().toLowerCase();
  const when = $('#when').val();
  const sort = $('#sort').val();

  const results = [];
  for (let i = 0; i < eventsPage.allEvents.length; i++) {
    const event = eventsPage.allEvents[i];
    if (matchesSearch(event, searchText) && matchesWhen(event, when)) {
      results.push(event);
    }
  }

  results.sort(function (a, b) {
    const difference = new Date(a.starts_at) - new Date(b.starts_at);
    return sort === 'latest' ? -difference : difference;
  });
  return results;
}

// Drawing the page

function renderSummary(total, firstShown, lastShown) {
  let text;
  if (total === 0) {
    text = 'No events match.';
  } else if (total === 1) {
    text = 'Showing 1 event.';
  } else {
    text = 'Showing ' + firstShown + ' to ' + lastShown + ' of ' + total + ' events.';
  }
  $('#results-summary').text(text);
}

function renderNoMatches() {
  $('#event-list').html(
    '<div class="rounded-card bg-white p-8 text-center shadow-sm">' +
      '<h2 class="mb-2 text-lg font-bold">No events match your search</h2>' +
      '<p class="mb-4 text-ink-soft">Try a different word, or look at all events instead.</p>' +
      '<button type="button" id="clear-filters" class="btn btn-secondary">Clear search and filters</button>' +
    '</div>'
  );
  $('#clear-filters').on('click', function () {
    $('#search').val('');
    $('#when').val('all');
    $('#sort').val('soonest');
    showPage(1);
    $('#search').trigger('focus');
  });
}

function pageButtonHtml(label, page, isCurrent, isDisabled, ariaLabel) {
  const current = isCurrent ? ' aria-current="page"' : '';
  const disabled = isDisabled ? ' disabled' : '';
  const style = isCurrent ? 'btn-primary' : 'btn-secondary';
  return '<li><button type="button" class="btn ' + style + ' min-w-11 px-3" data-page="' + page + '" aria-label="' + ariaLabel + '"' + current + disabled + '>' + label + '</button></li>';
}

function renderPagination(totalPages) {
  if (totalPages <= 1) {
    $('#pagination').empty();
    return;
  }
  const page = eventsPage.currentPage;
  let html = '<ul class="flex flex-wrap items-center justify-center gap-2">';
  html += pageButtonHtml('Previous', page - 1, false, page === 1, 'Previous page');
  for (let i = 1; i <= totalPages; i++) {
    html += pageButtonHtml(String(i), i, i === page, false, 'Page ' + i);
  }
  html += pageButtonHtml('Next', page + 1, false, page === totalPages, 'Next page');
  html += '</ul>';
  $('#pagination').html(html);
}

function showPage(page) {
  const results = filteredEvents();
  const totalPages = Math.max(1, Math.ceil(results.length / EVENTS_PER_PAGE));
  eventsPage.currentPage = Math.min(Math.max(page, 1), totalPages);

  const startIndex = (eventsPage.currentPage - 1) * EVENTS_PER_PAGE;
  const pageEvents = results.slice(startIndex, startIndex + EVENTS_PER_PAGE);

  renderSummary(results.length, startIndex + 1, startIndex + pageEvents.length);
  renderPagination(totalPages);

  if (results.length === 0) {
    renderNoMatches();
    return;
  }

  let html = '<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">';
  for (let i = 0; i < pageEvents.length; i++) {
    const event = pageEvents[i];
    html += Cards.eventListCardHtml(event, eventsPage.statusByEventId[event.id]);
  }
  html += '</div>';
  $('#event-list').html(html);
}

// Loading

function rememberMyRegistrations(registrations) {
  eventsPage.statusByEventId = {};
  for (let i = 0; i < registrations.length; i++) {
    eventsPage.statusByEventId[registrations[i].event_id] = registrations[i].status;
  }
}

function loadEvents() {
  UI.showSkeleton($('#event-list'), 3);
  $('#results-summary').text('Loading events...');
  $('#pagination').empty();

  $.when(Api.get('/events'), Api.get('/event-registrations/my-registrations'))
    .done(function (eventsResult, registrationsResult) {
      const events = eventsResult[0].data || [];
      // ROLE GUARD: residents only see published events. Admins see everything so they can manage it.
      eventsPage.allEvents = Auth.isAdmin() ? events : Cards.onlyPublished(events);
      rememberMyRegistrations(registrationsResult[0].data || []);

      if (eventsPage.allEvents.length === 0) {
        $('#results-summary').text('');
        UI.showEmpty($('#event-list'), 'No events yet', 'New events are added all the time, so check back soon.');
        return;
      }
      showPage(1);
    })
    .fail(function (xhr) {
      $('#results-summary').text('');
      UI.showError($('#event-list'), Api.errorMessage(xhr), loadEvents);
    });
}

// ROLE GUARD: admins get a shortcut to create events. The create page checks the role again.
function showAdminActions() {
  if (!Auth.isAdmin()) {
    return;
  }
  $('#admin-actions').html('<a href="../admin/event-form.html" class="btn btn-primary">Add an event</a>');
}

function setupFilters() {
  // Wait until they stop typing for a moment, so the list doesn't jump on every key
  $('#search').on('input', function () {
    clearTimeout(eventsPage.searchTimer);
    eventsPage.searchTimer = setTimeout(function () {
      showPage(1);
    }, 250);
  });

  $('#when, #sort').on('change', function () {
    showPage(1);
  });

  $('#event-filters').on('submit', function (event) {
    event.preventDefault();
    showPage(1);
  });

  // Moving to another page puts focus on the summary, so screen readers hear where they are
  $('#pagination').on('click', 'button[data-page]', function () {
    showPage(parseInt($(this).attr('data-page'), 10));
    $('#results-summary').trigger('focus');
  });
}

// ROLE GUARD: any logged-in user can see this page, logged-out people go to login
if (Guards.requireAuth()) {
  Layout.init({ page: 'events', area: 'resident' });
  showAdminActions();
  setupFilters();
  loadEvents();
}
