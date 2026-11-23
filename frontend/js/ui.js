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

  // Field errors. Each input has an empty <p id="[input id]-error"> under it,
  // already linked with aria-describedby, so screen readers read the error with the label.
  setFieldError: function ($input, message) {
    const $error = $('#' + $input.attr('id') + '-error');
    $input.attr('aria-invalid', 'true');
    $error.html(UI.icons.error + '<span>' + UI.escapeHtml(message) + '</span>').removeClass('hidden');
  },

  clearFieldError: function ($input) {
    const $error = $('#' + $input.attr('id') + '-error');
    $input.removeAttr('aria-invalid');
    $error.empty().addClass('hidden');
  },

  // The red box at the top of a form, for errors that aren't about one field
  showFormError: function ($box, message) {
    $box.html(
      '<p class="flex items-start gap-2">' + UI.icons.error +
        '<span><strong>Error:</strong> ' + UI.escapeHtml(message) + '</span></p>'
    ).removeClass('hidden');
  },

  hideFormError: function ($box) {
    $box.empty().addClass('hidden');
  },

  // Stops double clicks while a request is on its way, and says what's happening
  setButtonLoading: function ($button, isLoading, loadingText) {
    const $label = $button.find('.js-button-label');
    if (isLoading) {
      $button.data('original-label', $label.text());
      $label.text(loadingText);
      $button.prop('disabled', true).attr('aria-busy', 'true');
    } else {
      $label.text($button.data('original-label') || $label.text());
      $button.prop('disabled', false).removeAttr('aria-busy');
    }
  },

  // "Show password" toggle next to a password box. The label stays the same and
  // aria-pressed tells screen readers whether it's on, which is the usual pattern for toggles.
  setupPasswordToggle: function ($button) {
    const $input = $('#' + $button.attr('aria-controls'));
    $button.on('click', function () {
      const isHidden = $input.attr('type') === 'password';
      $input.attr('type', isHidden ? 'text' : 'password');
      $button.attr('aria-pressed', isHidden ? 'true' : 'false');
    });
  },

  FOCUSABLE: 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',

  // Keeps Tab and Shift+Tab inside an open dialog, so keyboard users can't get lost behind it
  trapFocus: function ($container) {
    $container.on('keydown.trap', function (event) {
      if (event.key !== 'Tab') {
        return;
      }
      const $items = $container.find(UI.FOCUSABLE).filter(':visible');
      if ($items.length === 0) {
        return;
      }
      const first = $items[0];
      const last = $items[$items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  },

  releaseFocus: function ($container) {
    $container.off('keydown.trap');
  },

  // "Sat 28 Nov 2026"
  formatDate: function (isoString) {
    return new Date(isoString).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  },

  // "08:00"
  formatTime: function (isoString) {
    return new Date(isoString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  },

  // "5 minutes ago", "3 days ago". Older than a week shows the date instead.
  timeAgo: function (isoString) {
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) {
      return 'Just now';
    }
    if (minutes < 60) {
      return minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
    }
    if (hours < 24) {
      return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    }
    if (days < 7) {
      return days + (days === 1 ? ' day ago' : ' days ago');
    }
    return UI.formatDate(isoString);
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
