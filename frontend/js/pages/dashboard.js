// Resident dashboard

const JACARANDA_KEY = 'sunshine_jacaranda_closed';

// Greeting in Shona by the time of day on the person's own device, with the English underneath
function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return { shona: 'Mangwanani', english: 'Good morning' };
  }
  if (hour < 17) {
    return { shona: 'Masikati', english: 'Good afternoon' };
  }
  return { shona: 'Manheru', english: 'Good evening' };
}

function showWelcome() {
  const user = Auth.getUser();
  const greeting = greetingForNow();
  // "Thursday 26 November"
  $('#today-date').text(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }));
  $('#shona-greeting').text(greeting.shona);
  $('#english-greeting').text(greeting.english);
  if (user && user.full_name) {
    $('#first-name').text(user.full_name.split(' ')[0]);
  }
}

// "Your week" panel: three rows, each one a link with its own loading and error state

function weekRowHtml(href, label, value, linkText) {
  return '<a href="' + href + '" class="group flex min-h-11 items-center justify-between gap-3 py-3">' +
      '<span class="min-w-0">' +
        '<span class="block text-[0.8125rem] font-semibold text-ink-soft">' + label + '</span>' +
        '<span class="block font-semibold text-ink group-hover:text-lily-teal group-hover:underline">' + value + '</span>' +
      '</span>' +
      '<span class="shrink-0 text-sm font-semibold text-lily-teal">' + linkText + ' <span aria-hidden="true">→</span></span>' +
    '</a>';
}

function showWeekRowLoading($row, label) {
  $row.html(
    '<div class="py-3">' +
      '<span class="block text-[0.8125rem] font-semibold text-ink-soft">' + label + '</span>' +
      '<span aria-hidden="true" class="mt-1 block h-5 w-2/3 animate-pulse rounded bg-mist"></span>' +
      '<span class="sr-only">Loading</span>' +
    '</div>'
  );
}

function showWeekRowError($row, label, retry) {
  $row.html(
    '<div class="py-3">' +
      '<span class="block text-[0.8125rem] font-semibold text-ink-soft">' + label + '</span>' +
      '<p role="alert" class="flex flex-wrap items-center gap-x-2 text-sm text-error">' + UI.icons.error +
        "<span><strong>Error:</strong> this didn't load.</span>" +
        '<button type="button" class="js-retry min-h-11 font-semibold text-lily-teal underline underline-offset-2">Retry</button>' +
      '</p>' +
    '</div>'
  );
  $row.find('.js-retry').on('click', retry);
}

// The soonest event you're registered for that hasn't started yet, or null
function nextRegisteredEvent(registrations) {
  const now = Date.now();
  let next = null;
  for (let i = 0; i < registrations.length; i++) {
    const registration = registrations[i];
    const startsAt = new Date(registration.starts_at).getTime();
    if (registration.status === 'registered' && startsAt > now) {
      if (!next || startsAt < new Date(next.starts_at).getTime()) {
        next = registration;
      }
    }
  }
  return next;
}

function loadWeekEvent() {
  const $row = $('#week-event');
  showWeekRowLoading($row, 'Next event');

  Api.get('/event-registrations/my-registrations')
    .done(function (response) {
      const next = nextRegisteredEvent(response.data || []);
      if (!next) {
        $row.html(weekRowHtml('events.html', 'Next event', 'Nothing booked yet', 'Browse events'));
        return;
      }
      const when = UI.formatDate(next.starts_at) + ' · ' + UI.formatTime(next.starts_at);
      $row.html(weekRowHtml(
        'event.html?id=' + encodeURIComponent(next.event_id),
        'Next event',
        UI.escapeHtml(next.title) + '<span class="block text-sm font-normal text-ink-soft">' + UI.escapeHtml(when) + '</span>',
        'View'
      ));
    })
    .fail(function () {
      showWeekRowError($row, 'Next event', loadWeekEvent);
    });
}

// The header has already asked for the notifications, so we wait for that answer instead of asking again
function showWeekUnread() {
  const unread = Layout.countUnread(Layout.notifications);
  const value = unread === 0 ? 'None unread' : unread + ' unread';
  $('#week-unread').html(weekRowHtml('notifications.html', 'Unread notifications', value, 'Open'));
}

function loadWeekUnread() {
  showWeekRowLoading($('#week-unread'), 'Unread notifications');
  Layout.notificationsRequest
    .done(showWeekUnread)
    .fail(function () {
      showWeekRowError($('#week-unread'), 'Unread notifications', retryWeekUnread);
    });
}

function retryWeekUnread() {
  Layout.loadNotifications();
  loadWeekUnread();
}

// Open means submitted or in progress, so anything not resolved yet
function countOpenRequests(requests) {
  let count = 0;
  for (let i = 0; i < requests.length; i++) {
    if (requests[i].status === 'submitted' || requests[i].status === 'in_progress') {
      count++;
    }
  }
  return count;
}

function loadWeekRequests() {
  const $row = $('#week-requests');
  showWeekRowLoading($row, 'Service requests');

  Api.get('/service-requests/my')
    .done(function (response) {
      const open = countOpenRequests(response.data || []);
      const value = open === 0 ? 'None open' : open + ' open';
      $row.html(weekRowHtml('services.html', 'Service requests', value, 'Open'));
    })
    .fail(function () {
      showWeekRowError($row, 'Service requests', loadWeekRequests);
    });
}

function loadYourWeek() {
  loadWeekEvent();
  loadWeekUnread();
  loadWeekRequests();
}

// Jacaranda banner

// Jacarandas bloom in October and November, which is also exam season.
// Once closed it stays closed for the rest of that year.
function shouldShowJacaranda() {
  const now = new Date();
  const month = now.getMonth(); // 0 is January, so 9 and 10 are October and November
  if (month !== 9 && month !== 10) {
    return false;
  }
  try {
    return window.localStorage.getItem(JACARANDA_KEY) !== String(now.getFullYear());
  } catch (err) {
    return true;
  }
}

function jacarandaBannerHtml() {
  return '<section aria-label="Exam season" class="mb-6 flex items-start gap-4 rounded-panel border-l-4 border-jacaranda bg-jacaranda/10 p-5">' +
      // A little five-petal jacaranda flower
      '<svg aria-hidden="true" class="h-10 w-10 shrink-0 text-jacaranda" viewBox="0 0 40 40" fill="currentColor">' +
        '<ellipse cx="20" cy="10" rx="5" ry="8"/>' +
        '<ellipse cx="20" cy="10" rx="5" ry="8" transform="rotate(72 20 20)"/>' +
        '<ellipse cx="20" cy="10" rx="5" ry="8" transform="rotate(144 20 20)"/>' +
        '<ellipse cx="20" cy="10" rx="5" ry="8" transform="rotate(216 20 20)"/>' +
        '<ellipse cx="20" cy="10" rx="5" ry="8" transform="rotate(288 20 20)"/>' +
        '<circle cx="20" cy="20" r="3.5" fill="#F4B22E"/>' +
      '</svg>' +
      '<p class="flex-1 pt-1 text-ink">The jacarandas are falling, and every Harare student knows what that means. Good luck to everyone writing exams this season.</p>' +
      '<button type="button" id="jacaranda-close" class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink hover:bg-jacaranda/15">' +
        '<svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '<span class="sr-only">Close the exam season message</span>' +
      '</button>' +
    '</section>';
}

function closeJacarandaBanner() {
  $('#jacaranda-banner').addClass('hidden').empty();
  try {
    window.localStorage.setItem(JACARANDA_KEY, String(new Date().getFullYear()));
  } catch (err) {
    // It'll just come back on the next visit
  }
  // The button is gone, so give focus somewhere sensible
  $('#main').trigger('focus');
}

function showJacarandaBanner() {
  if (!shouldShowJacaranda()) {
    return;
  }
  $('#jacaranda-banner').html(jacarandaBannerHtml()).removeClass('hidden');
  $('#jacaranda-close').on('click', closeJacarandaBanner);
}

// Stats

function statHtml(id, value, label) {
  return '<div class="card-border flex flex-col rounded-card border border-line bg-white p-5">' +
      '<dt class="order-2 mt-2 text-sm text-ink-soft">' + label + '</dt>' +
      '<dd id="' + id + '" class="order-1 font-heading text-[2.5rem] leading-none font-extrabold text-lily-teal">' + value + '</dd>' +
    '</div>';
}

function showStatsSkeleton() {
  let html = '<div aria-busy="true" aria-label="Loading your stats" class="grid grid-cols-2 gap-4 lg:grid-cols-4">';
  for (let i = 0; i < 4; i++) {
    html += '<div class="animate-pulse rounded-card border border-line bg-white p-5"><div class="mb-3 h-9 w-12 rounded bg-mist"></div><div class="h-3 w-3/4 rounded bg-mist"></div></div>';
  }
  html += '</div>';
  $('#stats').html(html);
}

function countActiveRegistrations(registrations) {
  let count = 0;
  for (let i = 0; i < registrations.length; i++) {
    if (registrations[i].status === 'registered') {
      count++;
    }
  }
  return count;
}

// Published events that haven't started yet. The backend already sorts them by start time.
function upcomingEventsFrom(events) {
  const now = Date.now();
  const published = Cards.onlyPublished(events);
  const upcoming = [];
  for (let i = 0; i < published.length; i++) {
    if (new Date(published[i].starts_at).getTime() > now) {
      upcoming.push(published[i]);
    }
  }
  return upcoming;
}

function renderStats(myStats, registrations, upcoming) {
  // /dashboard/me counts cancelled registrations too, so we count active ones from the list instead
  const going = countActiveRegistrations(registrations);
  const feedbackGiven = parseInt(myStats.feedbacks.total_feedbacks, 10) || 0;

  $('#stats').html(
    '<dl class="grid grid-cols-2 gap-4 lg:grid-cols-4">' +
      statHtml('stat-going', going, "Events you're going to") +
      statHtml('stat-upcoming', upcoming.length, 'Upcoming events in Harare') +
      statHtml('stat-unread', '<span aria-hidden="true">&ndash;</span><span class="sr-only">Loading</span>', 'Unread notifications') +
      statHtml('stat-feedback', feedbackGiven, "Events you've reviewed") +
    '</dl>'
  );

  // The header already fetched notifications, so reuse that instead of asking again
  Layout.notificationsRequest.done(updateUnreadStat);
}

function updateUnreadStat() {
  $('#stat-unread').text(Layout.countUnread(Layout.notifications));
}

function renderUpcomingEvents(upcoming) {
  const $container = $('#upcoming-events');
  if (upcoming.length === 0) {
    UI.showEmpty($container, 'Nothing on the calendar yet', 'New events are added all the time, so check back soon.');
    return;
  }

  const nextFew = upcoming.slice(0, 3);
  let html = '<div class="grid gap-4 md:grid-cols-3">';
  for (let i = 0; i < nextFew.length; i++) {
    html += Cards.eventCardHtml(nextFew[i]);
  }
  html += '</div>';
  $container.html(html);
}

// Loads everything the dashboard needs in one go.
// $.when waits for all three, and each result arrives as [data, status, xhr].
function loadDashboard() {
  showStatsSkeleton();
  UI.showSkeleton($('#upcoming-events'), 3);

  $.when(
    Api.get('/dashboard/me'),
    Api.get('/event-registrations/my-registrations'),
    Api.get('/events')
  )
    .done(function (meResult, registrationsResult, eventsResult) {
      const upcoming = upcomingEventsFrom(eventsResult[0].data || []);
      renderStats(meResult[0].data, registrationsResult[0].data || [], upcoming);
      renderUpcomingEvents(upcoming);
    })
    .fail(function (xhr) {
      const message = Api.errorMessage(xhr);
      UI.showError($('#stats'), message, loadDashboard);
      UI.showError($('#upcoming-events'), message, loadDashboard);
    });
}

// ROLE GUARD: any logged-in user can see this page, logged-out people go to login
if (Guards.requireAuth()) {
  Layout.init({ page: 'dashboard', area: 'resident' });
  showWelcome();
  showJacarandaBanner();
  loadYourWeek();
  loadDashboard();
  $(document).on('notifications:read', function () {
    updateUnreadStat();
    showWeekUnread();
  });
}
