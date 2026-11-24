// Admin: list of users with search and filters

let allUsers = [];
let userSearchTimer = null;

function matchesUserFilters(user, searchText, role, status) {
  const haystack = (user.full_name + ' ' + user.email).toLowerCase();
  if (searchText !== '' && haystack.indexOf(searchText) === -1) {
    return false;
  }
  if (role !== 'all' && user.role !== role) {
    return false;
  }
  if (status === 'active' && !user.is_active) {
    return false;
  }
  if (status === 'disabled' && user.is_active) {
    return false;
  }
  return true;
}

function filteredUsers() {
  const searchText = $('#search').val().trim().toLowerCase();
  const role = $('#role').val();
  const status = $('#status').val();
  const results = [];
  for (let i = 0; i < allUsers.length; i++) {
    if (matchesUserFilters(allUsers[i], searchText, role, status)) {
      results.push(allUsers[i]);
    }
  }
  return results;
}

function userRowHtml(user) {
  const href = 'user.html?id=' + encodeURIComponent(user.id);
  return '<tr class="border-t border-line">' +
      '<th scope="row" class="px-4 py-3 text-left font-semibold">' +
        '<a href="' + href + '" class="text-lily-teal underline-offset-2 hover:underline">' + UI.escapeHtml(user.full_name) + '</a>' +
      '</th>' +
      '<td class="px-4 py-3 break-all">' + UI.escapeHtml(user.email) + '</td>' +
      '<td class="px-4 py-3">' + Cards.badgeHtml(user.role === 'admin' ? 'admin' : 'user') + '</td>' +
      '<td class="px-4 py-3">' + Cards.badgeHtml(user.is_active ? 'active' : 'disabled') + '</td>' +
      '<td class="px-4 py-3 whitespace-nowrap text-ink-soft">' + UI.escapeHtml(UI.formatDate(user.created_at)) + '</td>' +
    '</tr>';
}

function renderUsers() {
  const results = filteredUsers();
  $('#results-summary').text(results.length === 1 ? '1 user.' : results.length + ' users.');

  if (results.length === 0) {
    UI.showEmpty($('#user-list'), 'No users match', 'Try a different name, or set the filters back to Everyone and Any status.');
    return;
  }

  let rows = '';
  for (let i = 0; i < results.length; i++) {
    rows += userRowHtml(results[i]);
  }

  // On narrow screens the table scrolls sideways inside its box instead of stretching the page.
  // tabindex lets keyboard users scroll it too.
  $('#user-list').html(
    '<div role="region" aria-label="Users table" tabindex="0" class="card-border overflow-x-auto rounded-card border border-line bg-white">' +
      '<table class="w-full min-w-[640px] text-sm">' +
        '<caption class="sr-only">Users</caption>' +
        '<thead class="bg-mist text-left"><tr>' +
          '<th scope="col" class="px-4 py-3">Name</th>' +
          '<th scope="col" class="px-4 py-3">Email</th>' +
          '<th scope="col" class="px-4 py-3">Role</th>' +
          '<th scope="col" class="px-4 py-3">Status</th>' +
          '<th scope="col" class="px-4 py-3">Joined</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>'
  );
}

function loadUsers() {
  UI.showSkeleton($('#user-list'), 3);
  $('#results-summary').text('Loading users...');

  // The backend pages users 20 at a time, so ask for a big page and filter here
  Api.get('/users?page=1&limit=500')
    .done(function (response) {
      allUsers = response.data || [];
      renderUsers();
    })
    .fail(function (xhr) {
      $('#results-summary').text('');
      UI.showError($('#user-list'), Api.errorMessage(xhr), loadUsers);
    });
}

// ROLE GUARD: only admins get past this point. The backend checks again anyway.
if (Guards.requireAdmin()) {
  Layout.init({ page: 'admin-users', area: 'admin' });
  loadUsers();

  $('#search').on('input', function () {
    clearTimeout(userSearchTimer);
    userSearchTimer = setTimeout(renderUsers, 250);
  });
  $('#role, #status').on('change', renderUsers);
  $('#user-filters').on('submit', function (event) {
    event.preventDefault();
    renderUsers();
  });
}
