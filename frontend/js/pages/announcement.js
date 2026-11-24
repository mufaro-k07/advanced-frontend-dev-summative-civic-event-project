// Announcement detail: the full audio player with its transcript panel

const announcementDetail = {
  id: new URLSearchParams(window.location.search).get('id'),
  item: null
};

function renderStatus() {
  // ROLE GUARD: only admins see the Published/Draft badge, residents only ever see published ones
  $('#announcement-status').html(Auth.isAdmin() ? MediaAdmin.statusBadgeHtml(announcementDetail.item) : '');
}

// The admin panel is drawn on its own, so publishing doesn't restart the audio
function renderAdminPanel() {
  if (!Auth.isAdmin()) {
    return;
  }
  $('#admin-panel').html(Cards.adminPanelHtml(
    'admin-heading',
    'Manage this announcement',
    '<p class="mb-4 text-sm text-ink-soft">Only the title and published state can change. To use a different recording, delete this one and add a new announcement.</p>' +
    MediaAdmin.actionsHtml('announcement', announcementDetail.item)
  ));
}

function renderAnnouncement() {
  const item = announcementDetail.item;
  document.title = item.title + ' · Sunshine 263';

  $('#announcement-content').html(
    '<div id="announcement-status" class="mb-3"></div>' +
    '<h1 class="text-[1.75rem] font-extrabold md:text-[2rem]">' + UI.escapeHtml(item.title) + '</h1>' +
    '<p class="mt-1 mb-6 text-ink-soft">Shared on ' + UI.escapeHtml(UI.formatDate(item.created_at)) + '</p>' +
    Player.fullHtml(item) +
    '<div id="admin-panel"></div>'
  );
  Player.wire($('#announcement-content'));
  renderStatus();
  renderAdminPanel();
}

function showNotFound() {
  $('#announcement-content').html(
    '<div class="rounded-card bg-white p-8 text-center shadow-sm">' +
      '<h1 class="mb-2 text-[1.75rem] font-extrabold">We couldn\'t find that announcement</h1>' +
      '<p class="mb-4 text-ink-soft">It may have been removed, or the link is missing part of its address.</p>' +
      '<a href="announcements.html" class="btn btn-primary">See all announcements</a>' +
    '</div>'
  );
}

function loadAnnouncement() {
  if (!announcementDetail.id) {
    showNotFound();
    return;
  }
  UI.showSkeleton($('#announcement-content'), 1);

  Api.get('/announcements/' + encodeURIComponent(announcementDetail.id))
    .done(function (response) {
      // ROLE GUARD: residents can't open a draft by typing its link. Admins can.
      if (response.data.published === false && !Auth.isAdmin()) {
        showNotFound();
        return;
      }
      announcementDetail.item = response.data;
      renderAnnouncement();
    })
    .fail(function (xhr) {
      // A broken id comes back as 404, or 500 when it isn't a valid id at all
      if (xhr.status === 404 || xhr.status === 500) {
        showNotFound();
        return;
      }
      UI.showError($('#announcement-content'), Api.errorMessage(xhr), loadAnnouncement);
    });
}

// ROLE GUARD: any logged-in user can see this page, logged-out people go to login
if (Guards.requireAuth()) {
  Layout.init({ page: 'announcements', area: 'resident' });
  loadAnnouncement();

  if (Auth.isAdmin()) {
    MediaAdmin.wire($('#announcement-content'), 'announcement',
      function (updated) {
        announcementDetail.item = updated;
        renderStatus();
        renderAdminPanel();
        $('#admin-heading').trigger('focus');
      },
      function () {
        UI.setFlash('Announcement deleted.', 'success');
        window.location.href = 'announcements.html';
      }
    );
  }
}
