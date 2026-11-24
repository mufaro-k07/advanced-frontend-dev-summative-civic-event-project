// Notifications inbox. The header already fetches the list for the bell, so we reuse it here.

function visibleNotifications() {
  const onlyUnread = $('input[name="show"]:checked').val() === 'unread';
  const results = [];
  for (let i = 0; i < Layout.notifications.length; i++) {
    const notification = Layout.notifications[i];
    if (!onlyUnread || !Layout.isRead(notification.id)) {
      results.push(notification);
    }
  }
  return results;
}

// ROLE GUARD: only admins get a Delete button. The backend refuses deletes from anyone else.
function deleteButtonHtml(notification) {
  if (!Auth.isAdmin()) {
    return '';
  }
  return '<button type="button" class="js-delete btn btn-danger shrink-0" data-id="' + UI.escapeHtml(notification.id) + '" data-title="' + UI.escapeHtml(notification.title) + '">' +
    '<span class="js-button-label">Delete</span><span class="sr-only"> ' + UI.escapeHtml(notification.title) + '</span></button>';
}

// Unread ones get a dot, bold title and the word "Unread" for screen readers, so it's never colour alone
function inboxItemHtml(notification) {
  const unread = !Layout.isRead(notification.id);
  const href = 'notification.html?id=' + encodeURIComponent(notification.id);
  return '<li class="card-border flex flex-col gap-3 rounded-card border border-line bg-white p-5 sm:flex-row sm:items-start ' + (unread ? 'border-l-4 border-l-flame' : '') + '">' +
      '<span aria-hidden="true" class="mt-2 hidden h-2.5 w-2.5 shrink-0 rounded-full sm:block ' + (unread ? 'bg-flame' : 'bg-transparent') + '"></span>' +
      '<div class="min-w-0 flex-1">' +
        '<p class="mb-1 text-[0.8125rem] font-semibold tracking-wide text-ink-soft uppercase">' +
          UI.escapeHtml(Layout.notificationTypeLabel(notification)) + (unread ? ' · <span class="text-flame">New</span>' : '') +
        '</p>' +
        '<h2 class="text-lg ' + (unread ? 'font-extrabold' : 'font-bold') + '">' +
          '<a href="' + href + '" class="rounded-control hover:underline">' + (unread ? '<span class="sr-only">Unread: </span>' : '') + UI.escapeHtml(notification.title) + '</a>' +
        '</h2>' +
        '<p class="text-ink-soft">' + UI.escapeHtml(notification.message) + '</p>' +
        '<p class="mt-1 text-[0.8125rem] text-ink-soft">' + UI.escapeHtml(UI.timeAgo(notification.created_at)) + '</p>' +
      '</div>' +
      deleteButtonHtml(notification) +
    '</li>';
}

function renderInbox() {
  const items = visibleNotifications();
  const unreadCount = Layout.countUnread(Layout.notifications);
  $('#inbox-summary').text(Layout.notifications.length + ' notifications, ' + unreadCount + ' unread.');

  if (Layout.notifications.length === 0) {
    UI.showEmpty($('#inbox'), 'All quiet for now', 'When a new event, announcement or promo goes up, you\'ll see it here.');
    return;
  }
  if (items.length === 0) {
    UI.showEmpty($('#inbox'), 'You\'re all caught up', 'Nothing unread. Choose "All" to see older notifications.');
    return;
  }

  let html = '<ul class="grid gap-3">';
  for (let i = 0; i < items.length; i++) {
    html += inboxItemHtml(items[i]);
  }
  $('#inbox').html(html + '</ul>');
}

function deleteNotification(id, $button) {
  UI.setButtonLoading($button, true, 'Deleting...');
  Api.remove('/notifications/' + encodeURIComponent(id))
    .done(function () {
      Layout.notifications = Layout.notifications.filter(function (item) { return item.id !== id; });
      Layout.updateBell();
      Layout.renderDrawerList();
      UI.toast('Notification deleted.', 'success');
      renderInbox();
      $('#main').trigger('focus');
    })
    .fail(function (xhr) {
      UI.setButtonLoading($button, false);
      UI.toast(Api.errorMessage(xhr), 'error');
    });
}

function loadInbox() {
  UI.showSkeleton($('#inbox'), 3);
  $('#inbox-summary').text('Loading notifications...');
  Layout.notificationsRequest
    .done(renderInbox)
    .fail(function (xhr) {
      $('#inbox-summary').text('');
      UI.showError($('#inbox'), Api.errorMessage(xhr), function () {
        Layout.loadNotifications();
        loadInbox();
      });
    });
}

// ROLE GUARD: any logged-in user can see this page, logged-out people go to login
if (Guards.requireAuth()) {
  Layout.init({ page: '', area: 'resident' });
  loadInbox();

  $('input[name="show"]').on('change', renderInbox);
  // Marking things read from the bell drawer updates this list too
  $(document).on('notifications:read', renderInbox);

  $('#mark-all').on('click', function () {
    const ids = [];
    for (let i = 0; i < Layout.notifications.length; i++) {
      ids.push(Layout.notifications[i].id);
    }
    Layout.markAsRead(ids);
    Layout.renderDrawerList();
    UI.toast('All notifications marked as read.', 'success');
  });

  $('#inbox').on('click', '.js-delete', function () {
    const $button = $(this);
    UI.confirm({
      title: 'Delete this notification?',
      message: '"' + $button.attr('data-title') + '" will be removed for everyone. This can\'t be undone.',
      confirmLabel: 'Delete notification',
      cancelLabel: 'Keep it',
      destructive: true
    }, function () {
      deleteNotification($button.attr('data-id'), $button);
    });
  });
}
