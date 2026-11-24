// My registrations: coming up, past and cancelled

let myRegistrations = [];

// Splits the list into the three groups we show
function groupRegistrations(registrations) {
  const groups = { upcoming: [], past: [], cancelled: [] };
  for (let i = 0; i < registrations.length; i++) {
    const registration = registrations[i];
    if (registration.status === 'cancelled') {
      groups.cancelled.push(registration);
    } else if (Cards.hasEnded(registration)) {
      groups.past.push(registration);
    } else {
      groups.upcoming.push(registration);
    }
  }

  // Soonest first for what's coming, most recent first for the rest
  groups.upcoming.sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); });
  groups.past.sort(function (a, b) { return new Date(b.starts_at) - new Date(a.starts_at); });
  groups.cancelled.sort(function (a, b) { return new Date(b.starts_at) - new Date(a.starts_at); });
  return groups;
}

// The registration rows come with the event's title, dates and location joined on
function registrationCardHtml(registration, group) {
  const href = 'event.html?id=' + encodeURIComponent(registration.event_id);
  let badge = Cards.badgeHtml('registered');
  let action = '';

  if (group === 'upcoming') {
    action = '<button type="button" class="js-cancel btn btn-secondary" data-event-id="' + UI.escapeHtml(registration.event_id) + '" data-title="' + UI.escapeHtml(registration.title) + '">' +
      '<span class="js-button-label">Cancel</span><span class="sr-only"> registration for ' + UI.escapeHtml(registration.title) + '</span></button>';
  } else if (group === 'past') {
    badge = Cards.badgeHtml('ended');
    action = '<a href="' + href + '#feedback" class="btn btn-secondary">Leave feedback<span class="sr-only"> for ' + UI.escapeHtml(registration.title) + '</span></a>';
  } else {
    badge = Cards.badgeHtml('cancelled');
  }

  return '<li class="card-border flex flex-col gap-4 rounded-card border border-line bg-white p-5 sm:flex-row sm:items-center">' +
      Cards.dateBlockHtml(registration.starts_at) +
      '<div class="min-w-0 flex-1">' +
        '<div class="mb-1">' + badge + '</div>' +
        '<h3 class="text-lg font-bold"><a href="' + href + '" class="rounded-control hover:underline">' + UI.escapeHtml(registration.title) + '</a></h3>' +
        '<p class="text-sm text-ink-soft">' + UI.escapeHtml(Cards.eventWhenText(registration)) + '</p>' +
        '<p class="text-sm text-ink-soft">' + UI.escapeHtml(registration.location || 'Location to be confirmed') + '</p>' +
      '</div>' +
      (action ? '<div class="shrink-0">' + action + '</div>' : '') +
    '</li>';
}

function groupSectionHtml(id, title, items, group, emptyText) {
  let html = '<section aria-labelledby="' + id + '-heading" class="mb-10">' +
    '<h2 id="' + id + '-heading" tabindex="-1" class="mb-4 text-2xl font-bold">' + title +
      ' <span class="font-body text-base font-normal text-ink-soft">(' + items.length + ')</span></h2>';

  if (items.length === 0) {
    html += '<p class="text-ink-soft">' + emptyText + '</p>';
  } else {
    html += '<ul class="grid gap-4">';
    for (let i = 0; i < items.length; i++) {
      html += registrationCardHtml(items[i], group);
    }
    html += '</ul>';
  }
  return html + '</section>';
}

function renderRegistrations() {
  const $container = $('#registrations');

  if (myRegistrations.length === 0) {
    $container.html(
      '<div class="rounded-card border border-line bg-white p-8 text-center">' +
        '<h2 class="mb-2 text-lg font-bold">You haven\'t signed up for anything yet</h2>' +
        '<p class="mb-4 text-ink-soft">Have a look at what\'s on. There\'s usually a market or a walk coming up.</p>' +
        '<a href="events.html" class="btn btn-primary">Browse events</a>' +
      '</div>'
    );
    return;
  }

  const groups = groupRegistrations(myRegistrations);
  $container.html(
    groupSectionHtml('upcoming', 'Coming up', groups.upcoming, 'upcoming', 'Nothing coming up. Find your next event on the events page.') +
    groupSectionHtml('past', 'Past events', groups.past, 'past', 'No past events yet.') +
    groupSectionHtml('cancelled', 'Cancelled', groups.cancelled, 'cancelled', 'Nothing cancelled.')
  );
}

function cancelRegistration(eventId, $button) {
  UI.setButtonLoading($button, true, 'Cancelling...');
  Api.post('/event-registrations/cancel', { event_id: eventId })
    .done(function () {
      for (let i = 0; i < myRegistrations.length; i++) {
        if (myRegistrations[i].event_id === eventId) {
          myRegistrations[i].status = 'cancelled';
        }
      }
      UI.toast('Your registration is cancelled.', 'success');
      renderRegistrations();
      // The card moved to the Cancelled list, so take focus back to the top of the list
      $('#upcoming-heading').trigger('focus');
    })
    .fail(function (xhr) {
      $button.prop('disabled', false).removeAttr('aria-busy');
      UI.toast(Api.errorMessage(xhr), 'error');
    });
}

function loadRegistrations() {
  UI.showSkeleton($('#registrations'), 3);
  Api.get('/event-registrations/my-registrations')
    .done(function (response) {
      myRegistrations = response.data || [];
      renderRegistrations();
    })
    .fail(function (xhr) {
      UI.showError($('#registrations'), Api.errorMessage(xhr), loadRegistrations);
    });
}

// ROLE GUARD: any logged-in user can see this page, logged-out people go to login
if (Guards.requireAuth()) {
  Layout.init({ page: 'my-registrations', area: 'resident' });
  loadRegistrations();

  $('#registrations').on('click', '.js-cancel', function () {
    const $button = $(this);
    UI.confirm({
      title: 'Cancel your registration?',
      message: 'You won\'t be able to register for "' + $button.attr('data-title') + '" again after cancelling.',
      confirmLabel: 'Yes, cancel it',
      cancelLabel: 'Keep my spot',
      destructive: true
    }, function () {
      cancelRegistration($button.attr('data-event-id'), $button);
    });
  });
}
