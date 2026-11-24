// Announcements list: a compact player on every card

let announcements = [];

// ROLE GUARD: admins also see each card's status and its Edit, Publish and Delete buttons
function adminExtrasHtml(announcement) {
  if (!Auth.isAdmin()) {
    return '';
  }
  return '<div class="flex flex-col gap-2 sm:items-end">' +
      MediaAdmin.statusBadgeHtml(announcement) +
      MediaAdmin.actionsHtml('announcement', announcement) +
    '</div>';
}

function renderAnnouncements() {
  const $list = $('#announcement-list');
  if (announcements.length === 0) {
    UI.showEmpty($list, 'No announcements yet', 'When the city shares an update, you\'ll be able to listen to it here.');
    return;
  }

  let html = '<ul class="grid gap-4">';
  for (let i = 0; i < announcements.length; i++) {
    html += '<li>' + Player.compactHtml(announcements[i], adminExtrasHtml(announcements[i])) + '</li>';
  }
  html += '</ul>';
  $list.html(html);
  Player.wire($list);
}

function replaceAnnouncement(updated) {
  for (let i = 0; i < announcements.length; i++) {
    if (announcements[i].id === updated.id) {
      announcements[i] = updated;
    }
  }
  renderAnnouncements();
}

function removeAnnouncement(id) {
  announcements = announcements.filter(function (item) { return item.id !== id; });
  UI.toast('Announcement deleted.', 'success');
  renderAnnouncements();
  $('#main').trigger('focus');
}

function loadAnnouncements() {
  UI.showSkeleton($('#announcement-list'), 3);

  // The backend pages these 20 at a time, so ask for a bigger page
  Api.get('/announcements?page=1&limit=100')
    .done(function (response) {
      const all = response.data || [];
      // ROLE GUARD: the backend sends drafts too, so residents only get the published ones
      announcements = Auth.isAdmin() ? all : Cards.onlyPublished(all);
      renderAnnouncements();
    })
    .fail(function (xhr) {
      UI.showError($('#announcement-list'), Api.errorMessage(xhr), loadAnnouncements);
    });
}

// ROLE GUARD: any logged-in user can see this page, logged-out people go to login
if (Guards.requireAuth()) {
  Layout.init({ page: 'announcements', area: 'resident' });

  if (Auth.isAdmin()) {
    $('#admin-actions').html('<a href="../admin/announcement-form.html" class="btn btn-primary">Add an announcement</a>');
    MediaAdmin.wire($('#announcement-list'), 'announcement', replaceAnnouncement, removeAnnouncement);
  }
  loadAnnouncements();
}
