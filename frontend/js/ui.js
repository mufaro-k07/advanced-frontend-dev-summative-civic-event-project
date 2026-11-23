// Small pieces of interface every page uses: toasts, and the loading, empty and error states for lists.
const UI = {
  // Anything typed by a user goes through this before it's put into HTML
  escapeHtml: function (text) {
    if (text === null || text === undefined) {
      return '';
    }
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  icons: {
    error: '<svg aria-hidden="true" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-11.5a.75.75 0 0 1 1.5 0v4a.75.75 0 0 1-1.5 0v-4ZM10 14.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/></svg>',
    success: '<svg aria-hidden="true" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.86a.75.75 0 0 0-1.22-.88l-3.23 4.48-1.62-1.62a.75.75 0 1 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.09l3.74-5.2Z" clip-rule="evenodd"/></svg>',
    info: '<svg aria-hidden="true" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9.25a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-1.5 0v-4.5Z" clip-rule="evenodd"/></svg>'
  },

  // Toasts sit at the top on phones and bottom-right on bigger screens.
  // type is 'success', 'error' or 'info'.
  toast: function (message, type) {
    const kind = type || 'info';
    let $area = $('#toast-area');
    if ($area.length === 0) {
      $area = $('<div id="toast-area" class="fixed inset-x-4 top-4 z-50 flex flex-col gap-2 md:inset-x-auto md:top-auto md:right-6 md:bottom-6 md:w-96"></div>');
      $('body').append($area);
    }

    const colours = {
      success: 'border-success text-success',
      error: 'border-error text-error',
      info: 'border-lily-teal text-lily-teal'
    };
    // Errors interrupt the screen reader straight away, everything else waits its turn
    const role = kind === 'error' ? 'alert' : 'status';
    const label = kind === 'error' ? '<strong>Error:</strong> ' : '';

    const $toast = $(
      '<div role="' + role + '" class="flex items-start gap-3 rounded-card border-l-4 bg-white p-4 shadow-sm ' + colours[kind] + '">' +
        UI.icons[kind] +
        '<p class="text-sm text-ink">' + label + UI.escapeHtml(message) + '</p>' +
      '</div>'
    );
    $area.append($toast);

    setTimeout(function () {
      $toast.remove();
    }, 5000);
  },

  // Grey placeholder cards while a list is loading
  showSkeleton: function ($container, count) {
    const howMany = count || 3;
    let html = '<div aria-busy="true" aria-label="Loading" class="grid gap-4">';
    for (let i = 0; i < howMany; i++) {
      html +=
        '<div class="animate-pulse rounded-card bg-white p-5 shadow-sm">' +
          '<div class="mb-3 h-4 w-1/3 rounded bg-mist"></div>' +
          '<div class="mb-2 h-3 w-full rounded bg-mist"></div>' +
          '<div class="h-3 w-2/3 rounded bg-mist"></div>' +
        '</div>';
    }
    html += '</div>';
    $container.html(html);
  },

  showEmpty: function ($container, title, nextStep) {
    $container.html(
      '<div class="rounded-card bg-white p-8 text-center shadow-sm">' +
        '<h3 class="mb-2 text-lg font-bold">' + UI.escapeHtml(title) + '</h3>' +
        '<p class="text-ink-soft">' + UI.escapeHtml(nextStep) + '</p>' +
      '</div>'
    );
  },

  // Shows what went wrong plus a Retry button that runs onRetry
  showError: function ($container, message, onRetry) {
    $container.html(
      '<div role="alert" class="rounded-card border border-error bg-white p-6 shadow-sm">' +
        '<p class="mb-4 flex items-start gap-2 text-error">' + UI.icons.error +
          '<span><strong>Error:</strong> ' + UI.escapeHtml(message) + '</span></p>' +
        '<button type="button" class="js-retry min-h-11 rounded-control border-2 border-lily-teal bg-white px-4 font-semibold text-lily-teal transition-colors duration-150 hover:bg-mist">Try again</button>' +
      '</div>'
    );
    $container.find('.js-retry').on('click', onRetry);
  }
};
