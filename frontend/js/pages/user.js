// Admin: one user's details, with enable and disable

const userDetail = {
  id: new URLSearchParams(window.location.search).get('id'),
  user: null
};

function isMyOwnAccount() {
  const me = Auth.getUser();
  return me && me.id === userDetail.id;
}

function accountActionHtml(user) {
  // ROLE GUARD: admins can't disable themselves, or they'd lock themselves out with no way back in
  if (isMyOwnAccount()) {
    return '<p class="text-ink-soft">This is your own account, so you can\'t disable it here.</p>';
  }
  if (user.is_active) {
    return '<p class="mb-4 text-sm text-ink-soft">A disabled person can\'t log in. If they\'re logged in right now, they\'ll be signed out when their session ends, within the hour.</p>' +
      '<button type="button" id="toggle-account" class="btn btn-danger"><span class="js-button-label">Disable account</span></button>';
  }
  return '<p class="mb-4 text-sm text-ink-soft">This account is disabled. Enabling it lets them log in again straight away.</p>' +
    '<button type="button" id="toggle-account" class="btn btn-primary"><span class="js-button-label">Enable account</span></button>';
}

function renderUser() {
  const user = userDetail.user;
  document.title = user.full_name + ' · Sunshine 263';

  $('#user-content').html(
    '<div class="card-border max-w-2xl rounded-panel border border-line bg-white p-6">' +
      '<div class="mb-4 flex flex-wrap gap-2">' +
        Cards.badgeHtml(user.role === 'admin' ? 'admin' : 'user') +
        Cards.badgeHtml(user.is_active ? 'active' : 'disabled') +
      '</div>' +
      '<h1 class="text-[1.75rem] font-extrabold break-words md:text-[2rem]">' + UI.escapeHtml(user.full_name) + '</h1>' +
      '<dl class="mt-6 grid gap-4 sm:grid-cols-2">' +
        '<div><dt class="text-sm font-semibold text-ink-soft">Email</dt><dd class="break-all">' + UI.escapeHtml(user.email) + '</dd></div>' +
        '<div><dt class="text-sm font-semibold text-ink-soft">Role</dt><dd>' + (user.role === 'admin' ? 'Admin' : 'Resident') + '</dd></div>' +
        '<div><dt class="text-sm font-semibold text-ink-soft">Joined</dt><dd>' + UI.escapeHtml(UI.formatDate(user.created_at)) + '</dd></div>' +
        '<div><dt class="text-sm font-semibold text-ink-soft">Last updated</dt><dd>' + UI.escapeHtml(UI.formatDate(user.updated_at)) + '</dd></div>' +
      '</dl>' +
      '<div class="mt-8 border-t border-line pt-6">' +
        '<h2 id="account-heading" tabindex="-1" class="mb-2 text-2xl font-bold">Account access</h2>' +
        accountActionHtml(user) +
      '</div>' +
    '</div>'
  );

  $('#toggle-account').on('click', function () {
    if (userDetail.user.is_active) {
      UI.confirm({
        title: 'Disable ' + userDetail.user.full_name + '?',
        message: 'They won\'t be able to log in until an admin enables the account again.',
        confirmLabel: 'Disable account',
        cancelLabel: 'Keep it active',
        destructive: true
      }, function () { changeAccess('disable'); });
    } else {
      changeAccess('enable');
    }
  });
}

// action is 'enable' or 'disable', which is also the end of the API path
function changeAccess(action) {
  const $button = $('#toggle-account');
  UI.setButtonLoading($button, true, action === 'disable' ? 'Disabling...' : 'Enabling...');

  Api.patch('/users/' + encodeURIComponent(userDetail.id) + '/' + action)
    .done(function (response) {
      userDetail.user = response.data;
      UI.toast(action === 'disable' ? 'Account disabled.' : 'Account enabled.', 'success');
      renderUser();
      // The button was redrawn, so put focus back on the section heading
      $('#account-heading').trigger('focus');
    })
    .fail(function (xhr) {
      UI.setButtonLoading($button, false);
      UI.toast(Api.errorMessage(xhr), 'error');
    });
}

function showUserNotFound() {
  $('#user-content').html(
    '<div class="rounded-card border border-line bg-white p-8 text-center">' +
      '<h1 class="mb-2 text-[1.75rem] font-extrabold">We couldn\'t find that user</h1>' +
      '<p class="mb-4 text-ink-soft">The link may be missing part of its address.</p>' +
      '<a href="users.html" class="btn btn-primary">See all users</a>' +
    '</div>'
  );
}

function loadUser() {
  if (!userDetail.id) {
    showUserNotFound();
    return;
  }
  UI.showSkeleton($('#user-content'), 1);
  Api.get('/users/' + encodeURIComponent(userDetail.id))
    .done(function (response) {
      userDetail.user = response.data;
      renderUser();
    })
    .fail(function (xhr) {
      // A made-up id comes back as 404, or 500 when it isn't a valid id at all
      if (xhr.status === 404 || xhr.status === 500) {
        showUserNotFound();
        return;
      }
      UI.showError($('#user-content'), Api.errorMessage(xhr), loadUser);
    });
}

// ROLE GUARD: only admins get past this point. The backend checks again anyway.
if (Guards.requireAdmin()) {
  Layout.init({ page: 'admin-users', area: 'admin' });
  loadUser();
}
