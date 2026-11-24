// Admin dashboard: big numbers, sign-ups chart, upcoming events and the latest service requests

// The admin stats arrive as strings ("12"), so everything goes through this first
function toNumber(value) {
  return parseInt(value, 10) || 0;
}

// Kept here so the open requests number can update when a status changes
let dashboardRequests = [];

// Big numbers

// highlight is for the one yellow card, like in the design
function adminStatHtml(value, label, note, highlight) {
  const colours = highlight ? 'border-sunshine bg-sunshine' : 'border-line bg-white';
  return '<div class="card-border flex flex-col rounded-card border p-5 text-ink ' + colours + '">' +
      '<p class="font-heading text-[2.75rem] leading-none font-extrabold">' + value + '</p>' +
      '<h3 class="mt-2 font-body text-[0.9375rem] font-bold text-ink">' + label + '</h3>' +
      '<p class="mt-0.5 text-[0.8125rem]">' + note + '</p>' +
    '</div>';
}

function renderStats(stats) {
  $('#admin-stats').html(
    adminStatHtml(toNumber(stats.events.total_events), 'Events', toNumber(stats.events.upcoming_events) + ' coming up', false) +
    adminStatHtml(toNumber(stats.users.total_users), 'Accounts', toNumber(stats.users.inactive_users) + ' disabled', false) +
    adminStatHtml(toNumber(stats.registrations.total_registrations), 'Registrations', 'all time', false)
  );
}

function isToday(isoString) {
  return new Date(isoString).toDateString() === new Date().toDateString();
}

function renderOpenRequestsStat() {
  let open = 0;
  let newToday = 0;
  for (let i = 0; i < dashboardRequests.length; i++) {
    if (dashboardRequests[i].status !== 'resolved') {
      open++;
    }
    if (isToday(dashboardRequests[i].created_at)) {
      newToday++;
    }
  }
  $('#open-requests-stat').html(adminStatHtml(open, 'Open requests', newToday + ' new today', true));
}

// Sign-ups bar chart

// The backend only lists months that had sign-ups, so we build all six and fill the gaps with 0
function lastSixMonths(growthRows) {
  const countByMonth = {};
  for (let i = 0; i < growthRows.length; i++) {
    countByMonth[growthRows[i].month] = toNumber(growthRows[i].new_users);
  }

  const months = [];
  const today = new Date();
  for (let back = 5; back >= 0; back--) {
    const date = new Date(today.getFullYear(), today.getMonth() - back, 1);
    const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    months.push({
      shortName: date.toLocaleDateString('en-GB', { month: 'short' }),
      longName: date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      count: countByMonth[key] || 0,
      isCurrent: back === 0
    });
  }
  return months;
}

// The bars are only a picture for sighted users. The table underneath holds the same numbers.
function renderGrowthChart(growthRows) {
  const months = lastSixMonths(growthRows);
  let highest = 1;
  for (let i = 0; i < months.length; i++) {
    highest = Math.max(highest, months[i].count);
  }

  $('#growth-range').text(months[0].shortName + ' to ' + months[months.length - 1].shortName + ' ' + new Date().getFullYear());

  let bars = '<ul aria-hidden="true" class="flex h-56 items-stretch gap-3.5 border-b border-line">';
  let rows = '';
  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    // Tallest bar fills 80%, leaving room for its number on top
    const heightPercent = (month.count / highest) * 80;
    // This month is solid teal so it stands out, the others are lighter
    const barColour = month.isCurrent ? 'bg-lily-teal' : 'bg-lily-teal/45';
    bars +=
      '<li class="flex flex-1 flex-col items-center justify-end gap-1.5">' +
        '<span class="text-[0.8125rem] font-bold">' + month.count + '</span>' +
        // The height depends on the data, so it has to be an inline style
        '<span class="block w-full max-w-16 rounded-t-[10px] ' + barColour + '" style="height: ' + heightPercent + '%"></span>' +
      '</li>';
    rows += '<tr class="border-t border-line"><th scope="row" class="py-2 text-left font-normal">' + month.longName + (month.isCurrent ? ' (this month)' : '') + '</th>' +
      '<td class="py-2 text-right font-semibold">' + month.count + '</td></tr>';
  }
  bars += '</ul>';

  let labels = '<ul aria-hidden="true" class="mt-2 flex gap-3.5">';
  for (let i = 0; i < months.length; i++) {
    labels += '<li class="flex-1 text-center text-[0.8125rem] text-ink-soft">' + months[i].shortName + '</li>';
  }
  labels += '</ul>';

  $('#growth-chart').html(
    bars + labels +
    '<details class="mt-4">' +
      '<summary class="min-h-11 cursor-pointer py-2 font-semibold text-lily-teal">Show these numbers as a table</summary>' +
      '<table class="mt-2 w-full text-sm">' +
        '<caption class="sr-only">New sign-ups per month</caption>' +
        '<thead><tr><th scope="col" class="py-2 text-left">Month</th><th scope="col" class="py-2 text-right">New accounts</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</details>'
  );
}

function loadAdminStats() {
  UI.showSkeleton($('#admin-stats'), 1);
  UI.showSkeleton($('#growth-chart'), 1);

  Api.get('/dashboard/admin')
    .done(function (response) {
      const stats = response.data;
      renderStats(stats);
      renderGrowthChart(stats.user_growth || []);
    })
    .fail(function (xhr) {
      UI.showError($('#admin-stats'), Api.errorMessage(xhr), loadAdminStats);
      $('#growth-chart').empty();
    });
}

// Coming up

function upcomingItemHtml(event) {
  const date = new Date(event.starts_at);
  const href = '../pages/event.html?id=' + encodeURIComponent(event.id);
  return '<li class="flex items-center gap-3">' +
      // The full date is written out next to it, so the block is hidden from screen readers
      '<span aria-hidden="true" class="w-12 flex-none rounded-control bg-mist py-1.5 text-center leading-tight">' +
        '<span class="block font-heading text-xl font-extrabold text-lily-teal">' + String(date.getDate()).padStart(2, '0') + '</span>' +
        '<span class="block text-[0.6875rem] font-bold text-ink-soft uppercase">' + date.toLocaleDateString('en-GB', { month: 'short' }) + '</span>' +
      '</span>' +
      '<span class="min-w-0 flex-1">' +
        '<a href="' + href + '" class="block rounded-control text-[0.9375rem] font-bold text-ink hover:text-lily-teal hover:underline">' + UI.escapeHtml(event.title) + '</a>' +
        '<span class="block text-[0.8125rem] text-ink-soft">' + UI.escapeHtml(UI.formatDate(event.starts_at)) + ' · ' + UI.escapeHtml(UI.formatTime(event.starts_at)) + '</span>' +
      '</span>' +
    '</li>';
}

// The backend sends every event, so we keep the future ones and take the next four
function nextFourEvents(events) {
  const now = Date.now();
  const upcoming = [];
  for (let i = 0; i < events.length; i++) {
    if (new Date(events[i].starts_at).getTime() > now) {
      upcoming.push(events[i]);
    }
  }
  upcoming.sort(function (a, b) {
    return new Date(a.starts_at) - new Date(b.starts_at);
  });
  return upcoming.slice(0, 4);
}

function loadUpcomingEvents() {
  const $list = $('#upcoming-events');
  UI.showSkeleton($list, 2);

  Api.get('/events')
    .done(function (response) {
      const events = nextFourEvents(response.data || []);
      if (events.length === 0) {
        UI.showEmpty($list, 'Nothing coming up', 'Add an event and it will show here.');
        return;
      }
      let html = '<ul class="flex flex-col gap-3">';
      for (let i = 0; i < events.length; i++) {
        html += upcomingItemHtml(events[i]);
      }
      html += '</ul>';
      $list.html(html);
    })
    .fail(function (xhr) {
      UI.showError($list, Api.errorMessage(xhr), loadUpcomingEvents);
    });
}

// Latest service requests

function updateRequestStatus(id, newStatus) {
  for (let i = 0; i < dashboardRequests.length; i++) {
    if (dashboardRequests[i].id === id) {
      dashboardRequests[i].status = newStatus;
    }
  }
  renderOpenRequestsStat();
}

function loadServiceRequests() {
  const $box = $('#service-requests');
  UI.showSkeleton($box, 2);
  UI.showSkeleton($('#open-requests-stat'), 1);

  Api.get('/service-requests')
    .done(function (response) {
      dashboardRequests = response.data || [];
      renderOpenRequestsStat();
      if (dashboardRequests.length === 0) {
        UI.showEmpty($box, 'No service requests yet', 'When a resident reports a problem, it shows up here.');
        return;
      }
      // Newest first already, so the first five are the latest
      $box.html(ServiceRequestTable.tableHtml(dashboardRequests.slice(0, 5)));
    })
    .fail(function (xhr) {
      UI.showError($box, Api.errorMessage(xhr), loadServiceRequests);
      $('#open-requests-stat').empty();
    });
}

// ROLE GUARD: only admins get past this point. The backend checks again anyway.
if (Guards.requireAdmin()) {
  Layout.init({ page: 'admin-dashboard', area: 'admin' });

  const user = Auth.getUser();
  if (user) {
    $('#user-name').text(user.full_name.split(' ')[0]);
  }
  ServiceRequestTable.setupStatusDropdowns($('#service-requests'), updateRequestStatus);
  loadAdminStats();
  loadUpcomingEvents();
  loadServiceRequests();
}
