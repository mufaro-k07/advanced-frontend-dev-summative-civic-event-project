// Notification detail. Opening it counts as reading it.

const notificationId = new URLSearchParams(window.location.search).get('id');

function relatedButtonHtml(notification) {
  const link = Layout.relatedLinkFor(notification);
  if (!link) {
    return '';
  }
  return '<a href="' + link.href + '" class="btn btn-primary btn-pill mt-6">' +
      '<span>' + link.text + '</span>' +
      '<span class="btn-arrow" aria-hidden="true"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.64l-4.1-3.96a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.1-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd"/></svg></span>' +
    '</a>';
}

// ROLE GUARD: the delete panel is only drawn for admins, and the backend checks again
function adminPanelHtml() {
  if (!Auth.isAdmin()) {
    return '';
  }
  return Cards.adminPanelHtml('admin-heading', 'Manage this notification',
    '<p class="mb-4 text-sm text-ink-soft">Deleting removes it from everyone\'s inbox.</p>' +
    '<button type="button" id="delete-notification" class="btn btn-danger"><span class="js-button-label">Delete notification</span></button>'
  );
}

function renderNotification(notification) {
  document.title = notification.title + ' · Sunshine 263';
  $('#notification-content').html(
    '<article class="card-border rounded-panel border border-mist bg-white p-6 shadow-sm">' +
      '<p class="mb-2 text-[0.8125rem] font-semibold tracking-wide text-ink-soft uppercase">' + UI.escapeHtml(Layout.notificationTypeLabel(notification)) + '</p>' +
      '<h1 class="text-[1.75rem] font-extrabold md:text-[2rem]">' + UI.escapeHtml(notification.title) + '</h1>' +
      '<p class="mt-1 text-sm text-ink-soft">Sent ' + UI.escapeHtml(UI.formatDate(notification.created_at)) + ' at ' + UI.escapeHtml(UI.formatTime(notification.created_at)) + '</p>' +
      '<p class="mt-4 text-lg">' + UI.escapeHtml(notification.message) + '</p>' +
      relatedButtonHtml(notification) +
    '</article>' +
    adminPanelHtml()
  );

  $('#delete-notification').on('click', function () {
    UI.confirm({
      title: 'Delete this notification?',
      message: 'It will be removed from everyone\'s inbox. This can\'t be undone.',
      confirmLabel: 'Delete notification',
      cancelLabel: 'Keep it',
      destructive: true
    }, deleteNotification);
  });
}

function deleteNotification() {
  const $button = $('#delete-notification');
  UI.setButtonLoading($button, true, 'Deleting...');
  Api.remove('/notifications/' + encodeURIComponent(notificationId))
    .done(function () {
      UI.setFlash('Notification deleted.', 'success');
      window.location.href = 'notifications.html';
    })
    .fail(function (xhr) {
      UI.setButtonLoading($button, false);
      UI.toast(Api.errorMessage(xhr), 'error');
    });
}

function showNotFound() {
  $('#notification-content').html(
    '<div class="rounded-card bg-white p-8 text-center shadow-sm">' +
      '<h1 class="mb-2 text-[1.75rem] font-extrabold">We couldn\'t find that notification</h1>' +
      '<p class="mb-4 text-ink-soft">It may have been deleted, or the link is missing part of its address.</p>' +
      '<a href="notifications.html" class="btn btn-primary">See all notifications</a>' +
    '</div>'
  );
}

function loadNotification() {
  if (!notificationId) {
    showNotFound();
    return;
  }
  UI.showSkeleton($('#notification-content'), 1);
  Api.get('/notifications/' + encodeURIComponent(notificationId))
    .done(function (response) {
      renderNotification(response.data);
      // There's no "mark as read" in the backend, so it's remembered on this device
      Layout.markAsRead([response.data.id]);
      Layout.notificationsRequest.done(Layout.renderDrawerList);
    })
    .fail(function (xhr) {
      // A deleted id comes back as 404, or 500 when it isn't a valid id at all
      if (xhr.status === 404 || xhr.status === 500) {
        showNotFound();
        return;
      }
      UI.showError($('#notification-content'), Api.errorMessage(xhr), loadNotification);
    });
}

// ROLE GUARD: any logged-in user can see this page, logged-out people go to login
if (Guards.requireAuth()) {
  Layout.init({ page: '', area: 'resident' });
  loadNotification();
}
