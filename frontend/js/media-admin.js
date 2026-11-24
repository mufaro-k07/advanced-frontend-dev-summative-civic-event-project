// Edit, Publish/Unpublish and Delete buttons for announcements and promos.
// Both work the same way, so they share this file. kind is 'announcement' or 'promo'.
const MediaAdmin = {
  KINDS: {
    announcement: { apiPath: '/announcements', formPage: 'admin/announcement-form.html', name: 'announcement' },
    promo: { apiPath: '/promos', formPage: 'admin/promo-form.html', name: 'promo' }
  },

  statusBadgeHtml: function (item) {
    return Cards.badgeHtml(item.published ? 'published' : 'draft');
  },

  // The title goes in hidden text on each button, so a screen reader hears "Edit Water update", not just "Edit"
  actionsHtml: function (kind, item) {
    const settings = MediaAdmin.KINDS[kind];
    const title = UI.escapeHtml(item.title);
    const editHref = Config.pageUrl(settings.formPage + '?id=' + encodeURIComponent(item.id));
    const publishAction = item.published ? 'unpublish' : 'publish';
    const publishLabel = item.published ? 'Unpublish' : 'Publish';

    return '<div class="flex flex-wrap gap-2">' +
        '<a href="' + editHref + '" class="btn btn-secondary">Edit<span class="sr-only"> ' + title + '</span></a>' +
        '<button type="button" class="js-media-publish btn btn-secondary" data-id="' + UI.escapeHtml(item.id) + '" data-action="' + publishAction + '">' +
          '<span class="js-button-label">' + publishLabel + '</span><span class="sr-only"> ' + title + '</span></button>' +
        '<button type="button" class="js-media-delete btn btn-danger" data-id="' + UI.escapeHtml(item.id) + '" data-title="' + title + '">' +
          '<span class="js-button-label">Delete</span><span class="sr-only"> ' + title + '</span></button>' +
      '</div>';
  },

  // Makes the buttons inside $container work.
  // onChanged(updatedItem) runs after publish/unpublish, onDeleted(id) after a delete.
  wire: function ($container, kind, onChanged, onDeleted) {
    const settings = MediaAdmin.KINDS[kind];

    $container.on('click', '.js-media-publish', function () {
      const $button = $(this);
      const id = $button.attr('data-id');
      const action = $button.attr('data-action');
      UI.setButtonLoading($button, true, action === 'publish' ? 'Publishing...' : 'Unpublishing...');

      Api.patch(settings.apiPath + '/' + encodeURIComponent(id) + '/' + action)
        .done(function (response) {
          UI.toast(action === 'publish'
            ? 'Published. Residents can see it now.'
            : 'Unpublished. Residents can\'t see it any more.', 'success');
          onChanged(response.data);
        })
        .fail(function (xhr) {
          UI.setButtonLoading($button, false);
          UI.toast(Api.errorMessage(xhr), 'error');
        });
    });

    $container.on('click', '.js-media-delete', function () {
      const $button = $(this);
      const id = $button.attr('data-id');
      UI.confirm({
        title: 'Delete this ' + settings.name + '?',
        message: '"' + $button.attr('data-title') + '" will be removed for everyone. This can\'t be undone.',
        confirmLabel: 'Delete ' + settings.name,
        cancelLabel: 'Keep it',
        destructive: true
      }, function () {
        UI.setButtonLoading($button, true, 'Deleting...');
        Api.remove(settings.apiPath + '/' + encodeURIComponent(id))
          .done(function () {
            onDeleted(id);
          })
          .fail(function (xhr) {
            UI.setButtonLoading($button, false);
            UI.toast(Api.errorMessage(xhr), 'error');
          });
      });
    });
  }
};
