// Promos list: a grid of video cards

let promos = [];

// ROLE GUARD: admins also see each card's status and its Edit, Publish and Delete buttons
function promoAdminExtrasHtml(promo) {
  if (!Auth.isAdmin()) {
    return '';
  }
  return '<div class="mb-3">' + MediaAdmin.statusBadgeHtml(promo) + '</div>' + MediaAdmin.actionsHtml('promo', promo);
}

function renderPromos() {
  const $list = $('#promo-list');
  if (promos.length === 0) {
    UI.showEmpty($list, 'No promos yet', 'When the city shares a video, you\'ll find it here with captions.');
    return;
  }

  let html = '<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">';
  for (let i = 0; i < promos.length; i++) {
    html += '<li>' + Cards.promoCardHtml(promos[i], promoAdminExtrasHtml(promos[i])) + '</li>';
  }
  html += '</ul>';
  $list.html(html);
}

function replacePromo(updated) {
  for (let i = 0; i < promos.length; i++) {
    if (promos[i].id === updated.id) {
      promos[i] = updated;
    }
  }
  renderPromos();
}

function removePromo(id) {
  promos = promos.filter(function (item) { return item.id !== id; });
  UI.toast('Promo deleted.', 'success');
  renderPromos();
  $('#main').trigger('focus');
}

function loadPromos() {
  UI.showSkeleton($('#promo-list'), 3);

  // The backend pages these 20 at a time, so ask for a bigger page
  Api.get('/promos?page=1&limit=100')
    .done(function (response) {
      const all = response.data || [];
      // ROLE GUARD: the backend sends drafts too, so residents only get the published ones
      promos = Auth.isAdmin() ? all : Cards.onlyPublished(all);
      renderPromos();
    })
    .fail(function (xhr) {
      UI.showError($('#promo-list'), Api.errorMessage(xhr), loadPromos);
    });
}

// ROLE GUARD: any logged-in user can see this page, logged-out people go to login
if (Guards.requireAuth()) {
  Layout.init({ page: 'promos', area: 'resident' });

  if (Auth.isAdmin()) {
    $('#admin-actions').html('<a href="../admin/promo-form.html" class="btn btn-primary">Add a promo</a>');
    MediaAdmin.wire($('#promo-list'), 'promo', replacePromo, removePromo);
  }
  loadPromos();
}
