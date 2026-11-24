// Admin: every notification in a table, with delete

function adminRowHtml(notification) {
  const title = UI.escapeHtml(notification.title);
  return '<tr class="border-t border-line align-top">' +
      '<td class="px-4 py-3">' + UI.escapeHtml(Layout.notificationTypeLabel(notification)) + '</td>' +
      '<th scope="row" class="px-4 py-3 text-left font-normal">' +
        '<a href="../pages/notification.html?id=' + encodeURIComponent(notification.id) + '" class="font-semibold text-lily-teal underline-offset-2 hover:underline">' + title + '</a>' +
        '<p class="text-ink-soft">' + UI.escapeHtml(notification.message) + '</p>' +
      '</th>' +
      '<td class="px-4 py-3 whitespace-nowrap text-ink-soft">' + UI.escapeHtml(UI.formatDate(notification.created_at)) + '</td>' +
      '<td class="px-4 py-3">' +
        '<button type="button" class="js-delete btn btn-danger" data-id="' + UI.escapeHtml(notification.id) + '" data-title="' + title + '">' +
          '<span class="js-button-label">Delete</span><span class="sr-only"> ' + title + '</span></button>' +
      '</td>' +
    '</tr>';
}

function renderAdminList() {
  const list = Layout.notifications;
  $('#admin-summary').text(list.length === 1 ? '1 notification.' : list.length + ' notifications.');

  if (list.length === 0) {
    UI.showEmpty($('#admin-notification-list'), 'No notifications yet', 'Add an event, announcement or promo and one goes out automatically.');
    return;
  }

  let rows = '';
  for (let i = 0; i < list.length; i++) {
    rows += adminRowHtml(list[i]);
  }
  // On narrow screens the table scrolls sideways inside its box. tabindex lets keyboard users scroll it.
  $('#admin-notification-list').html(
    '<div role="region" aria-label="Notifications table" tabindex="0" class="card-border overflow-x-auto rounded-card border border-line bg-white">' +
      '<table class="w-full min-w-[640px] text-sm">' +
        '<caption class="sr-only">All notifications</caption>' +
        '<thead class="bg-mist text-left"><tr>' +
          '<th scope="col" class="px-4 py-3">Type</th>' +
          '<th scope="col" class="px-4 py-3">Notification</th>' +
          '<th scope="col" class="px-4 py-3">Sent</th>' +
          '<th scope="col" class="px-4 py-3"><span class="sr-only">Actions</span></th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>'
  );
}

function deleteFromAdminList(id, $button) {
  UI.setButtonLoading($button, true, 'Deleting...');
  Api.remove('/notifications/' + encodeURIComponent(id))
    .done(function () {
      Layout.notifications = Layout.notifications.filter(function (item) { return item.id !== id; });
      Layout.updateBell();
      Layout.renderDrawerList();
      UI.toast('Notification deleted.', 'success');
      renderAdminList();
      $('#main').trigger('focus');
    })
    .fail(function (xhr) {
      UI.setButtonLoading($button, false);
      UI.toast(Api.errorMessage(xhr), 'error');
    });
}

function loadAdminList() {
  UI.showSkeleton($('#admin-notification-list'), 3);
  $('#admin-summary').text('Loading notifications...');
  // The header already fetched the list for the bell, so reuse it
  Layout.notificationsRequest
    .done(renderAdminList)
    .fail(function (xhr) {
      $('#admin-summary').text('');
      UI.showError($('#admin-notification-list'), Api.errorMessage(xhr), function () {
        Layout.loadNotifications();
        loadAdminList();
      });
    });
}

// ROLE GUARD: only admins get past this point. The backend checks again anyway.
if (Guards.requireAdmin()) {
  Layout.init({ page: 'admin-notifications', area: 'admin' });
  loadAdminList();

  $('#admin-notification-list').on('click', '.js-delete', function () {
    const $button = $(this);
    UI.confirm({
      title: 'Delete this notification?',
      message: '"' + $button.attr('data-title') + '" will be removed from everyone\'s inbox. This can\'t be undone.',
      confirmLabel: 'Delete notification',
      cancelLabel: 'Keep it',
      destructive: true
    }, function () {
      deleteFromAdminList($button.attr('data-id'), $button);
    });
  });
}
