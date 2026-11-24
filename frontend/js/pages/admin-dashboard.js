// Admin dashboard: big numbers, sign-ups bar chart and the accounts dot matrix

// The admin stats arrive as strings ("12"), so everything goes through this first
function toNumber(value) {
  return parseInt(value, 10) || 0;
}

// Big numbers

function adminStatHtml(value, label) {
  return '<div class="card-border flex flex-col rounded-card border border-mist bg-white p-5 shadow-sm">' +
      '<dt class="order-2 mt-2 text-sm text-ink-soft">' + label + '</dt>' +
      '<dd class="order-1 font-heading text-[2.5rem] leading-none font-extrabold text-lily-teal">' + value + '</dd>' +
    '</div>';
}

function renderStats(stats) {
  $('#admin-stats').html(
    '<dl class="grid grid-cols-2 gap-4 lg:grid-cols-4">' +
      adminStatHtml(toNumber(stats.users.total_users), 'Accounts') +
      adminStatHtml(toNumber(stats.events.upcoming_events), 'Upcoming events') +
      adminStatHtml(toNumber(stats.registrations.total_registrations), 'Registrations') +
      adminStatHtml(toNumber(stats.feedbacks.total_feedback), 'Feedback received') +
      adminStatHtml(toNumber(stats.events.past_events), 'Past events') +
      adminStatHtml(toNumber(stats.announcements.total_announcements), 'Announcements') +
      adminStatHtml(toNumber(stats.promos.total_promos), 'Promos') +
      adminStatHtml(toNumber(stats.notifications.total_notifications), 'Notifications sent') +
    '</dl>'
  );
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

  let bars = '<ul aria-hidden="true" class="flex h-52 items-stretch gap-2 border-b-2 border-ink-soft sm:gap-4">';
  let rows = '';
  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    // Tallest bar fills 85%, leaving room for its number on top
    const heightPercent = (month.count / highest) * 85;
    // This month's bar is flame so it stands out, and its label says "this month" too
    const barColour = month.isCurrent ? 'bg-flame' : 'bg-lily-teal';
    bars +=
      '<li class="flex flex-1 flex-col items-center justify-end">' +
        '<span class="mb-1 text-sm font-semibold">' + month.count + '</span>' +
        // The height depends on the data, so it has to be an inline style
        '<span class="block w-full max-w-12 rounded-t-control ' + barColour + '" style="height: ' + heightPercent + '%"></span>' +
      '</li>';
    rows += '<tr class="border-t border-mist"><th scope="row" class="py-2 text-left font-normal">' + month.longName + (month.isCurrent ? ' (this month)' : '') + '</th>' +
      '<td class="py-2 text-right font-semibold">' + month.count + '</td></tr>';
  }
  bars += '</ul>';

  let labels = '<ul aria-hidden="true" class="mt-2 flex gap-2 sm:gap-4">';
  for (let i = 0; i < months.length; i++) {
    labels += '<li class="flex-1 text-center text-[0.8125rem] text-ink-soft">' + months[i].shortName + (months[i].isCurrent ? '<br>now' : '') + '</li>';
  }
  labels += '</ul>';

  $('#growth-chart').html(
    bars + labels +
    '<details class="mt-6">' +
      '<summary class="min-h-11 cursor-pointer py-2 font-semibold text-lily-teal">Show these numbers as a table</summary>' +
      '<table class="mt-2 w-full text-sm">' +
        '<caption class="sr-only">New sign-ups per month</caption>' +
        '<thead><tr><th scope="col" class="py-2 text-left">Month</th><th scope="col" class="py-2 text-right">New accounts</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</details>'
  );
}

// Accounts dot matrix

// Active accounts are filled dots, disabled ones are hollow rings, so the shape tells them apart too
function renderUserDots(users) {
  const active = toNumber(users.active_users);
  const disabled = toNumber(users.inactive_users);
  const maxDots = 100;

  let dots = '<div aria-hidden="true" class="grid w-max grid-cols-10 gap-1.5">';
  for (let i = 0; i < Math.min(active, maxDots); i++) {
    dots += '<span class="h-4 w-4 rounded-full bg-lily-teal"></span>';
  }
  for (let i = 0; i < Math.min(disabled, maxDots - Math.min(active, maxDots)); i++) {
    dots += '<span class="h-4 w-4 rounded-full border-2 border-error"></span>';
  }
  dots += '</div>';

  $('#user-dots').html(
    dots +
    '<ul class="mt-5 grid gap-2 text-sm">' +
      '<li class="flex items-center gap-2"><span aria-hidden="true" class="h-4 w-4 rounded-full bg-lily-teal"></span><strong>' + active + '</strong> active</li>' +
      '<li class="flex items-center gap-2"><span aria-hidden="true" class="h-4 w-4 rounded-full border-2 border-error"></span><strong>' + disabled + '</strong> disabled</li>' +
    '</ul>' +
    (active + disabled > maxDots ? '<p class="mt-2 text-[0.8125rem] text-ink-soft">Showing the first ' + maxDots + ' accounts as dots.</p>' : '')
  );
}

// Loading

function loadAdminDashboard() {
  UI.showSkeleton($('#admin-stats'), 2);
  UI.showSkeleton($('#growth-chart'), 1);
  UI.showSkeleton($('#user-dots'), 1);

  Api.get('/dashboard/admin')
    .done(function (response) {
      const stats = response.data;
      renderStats(stats);
      renderGrowthChart(stats.user_growth || []);
      renderUserDots(stats.users);
    })
    .fail(function (xhr) {
      const message = Api.errorMessage(xhr);
      UI.showError($('#admin-stats'), message, loadAdminDashboard);
      $('#growth-chart').empty();
      $('#user-dots').empty();
    });
}

// ROLE GUARD: only admins get past this point. The backend checks again anyway.
if (Guards.requireAdmin()) {
  Layout.init({ page: 'admin-dashboard', area: 'admin' });

  const user = Auth.getUser();
  if (user) {
    $('#user-name').text(user.full_name.split(' ')[0]);
  }
  loadAdminDashboard();
}
