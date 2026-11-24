// The Accessibility button and panel: text size, enhanced contrast and reduced motion.
// A tiny script in each page's <head> puts the saved settings on before the page draws,
// so this file only has to build the panel and save changes.
const A11y = {
  STORAGE_KEY: 'sunshine_a11y',

  DEFAULTS: { textSize: 'default', contrast: 'off', motion: 'device' },

  load: function () {
    try {
      const saved = JSON.parse(window.localStorage.getItem(A11y.STORAGE_KEY));
      return $.extend({}, A11y.DEFAULTS, saved);
    } catch (err) {
      return $.extend({}, A11y.DEFAULTS);
    }
  },

  // Save the setting so it's still on when they open the next page
  save: function (settings) {
    try {
      window.localStorage.setItem(A11y.STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      // Storage is blocked, so the setting only lasts until they leave this page
    }
  },

  // Same job as the <head> script, used when someone changes a setting on the page
  apply: function (settings) {
    const html = document.documentElement;

    if (settings.textSize === 'default') {
      html.removeAttribute('data-text-size');
    } else {
      html.setAttribute('data-text-size', settings.textSize);
    }

    if (settings.contrast === 'on') {
      html.setAttribute('data-contrast', 'high');
    } else {
      html.removeAttribute('data-contrast');
    }

    if (settings.motion === 'reduced') {
      html.setAttribute('data-motion', 'reduced');
    } else {
      html.removeAttribute('data-motion');
    }
  },

  // Other scripts (drawer, petals) ask this before animating anything
  prefersReducedMotion: function () {
    if (document.documentElement.getAttribute('data-motion') === 'reduced') {
      return true;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // One group of radio buttons that look like a row of buttons
  optionGroupHtml: function (name, legend, options, current) {
    const columns = options.length === 3 ? 'grid-cols-3' : 'grid-cols-2';
    let html = '<fieldset class="mb-5"><legend class="field-label">' + legend + '</legend>' +
      '<div class="grid gap-2 ' + columns + '">';
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const checked = option.value === current ? ' checked' : '';
      html +=
        '<label class="cursor-pointer">' +
          '<input type="radio" name="' + name + '" value="' + option.value + '" class="peer sr-only"' + checked + '>' +
          '<span class="flex min-h-11 items-center justify-center rounded-control border-2 border-lily-teal px-2 text-center text-sm font-semibold text-lily-teal ' +
            'peer-checked:bg-lily-teal peer-checked:text-white ' +
            'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lily-teal peer-focus-visible:outline-solid">' +
            option.label +
          '</span>' +
        '</label>';
    }
    html += '</div></fieldset>';
    return html;
  },

  panelHtml: function (settings) {
    return '<div id="a11y-panel" class="on-light absolute top-full right-0 z-40 mt-2 hidden w-[min(20rem,calc(100vw-2rem))] rounded-panel border border-line bg-white p-5 text-left text-ink shadow-sm">' +
      '<h2 class="mb-1 text-lg font-bold">Accessibility</h2>' +
      '<p class="mb-4 text-sm text-ink-soft">These stay on across every page, on this device.</p>' +
      A11y.optionGroupHtml('a11y-text-size', 'Text size', [
        { value: 'default', label: 'Default' },
        { value: 'large', label: 'Large' },
        { value: 'larger', label: 'Larger' }
      ], settings.textSize) +
      A11y.optionGroupHtml('a11y-contrast', 'Enhanced contrast', [
        { value: 'off', label: 'Off' },
        { value: 'on', label: 'On' }
      ], settings.contrast) +
      A11y.optionGroupHtml('a11y-motion', 'Reduced motion', [
        { value: 'device', label: 'Follow my device' },
        { value: 'reduced', label: 'On' }
      ], settings.motion) +
      '<button type="button" id="a11y-reset" class="min-h-11 text-sm font-semibold text-lily-teal underline underline-offset-2">Reset to default</button>' +
    '</div>';
  },

  // options.onPhoto: the landing, login and signup pages, where the button sits on a dark photo
  // options.iconOnly: the header on logged-in pages, where space is tight
  buttonHtml: function (options) {
    if (options.iconOnly) {
      return A11y.iconButtonHtml();
    }
    let colours = 'border-lily-teal bg-white text-lily-teal hover:bg-mist';
    if (options.onPhoto) {
      colours = 'border-white bg-transparent text-white hover:bg-white/15';
    }
    return '<button type="button" id="a11y-button" aria-expanded="false" aria-controls="a11y-panel" ' +
        'class="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-control border-2 px-3 text-sm font-semibold transition-colors duration-150 ' + colours + '">' +
        '<svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="4" r="2"/><path d="M20 8.5c0 .6-.4 1-1 1.1l-4.5.7v3.6l1.9 6.7a1 1 0 0 1-1.9.6L12.6 15h-1.2l-1.9 6.2a1 1 0 0 1-1.9-.6l1.9-6.7v-3.6L5 9.6a1 1 0 0 1 .3-2.1l5.2.6h3l5.2-.6c.6 0 1.3.4 1.3 1Z"/></svg>' +
        // The word hides on phones but screen readers still hear it, so no aria-label is needed
        '<span class="sr-only md:not-sr-only">Accessibility</span>' +
      '</button>';
  },

  // Just the icon, so it gets an aria-label for screen readers and a tooltip for everyone else.
  // The tooltip shows on hover and keyboard focus, and hides while the panel is open.
  iconButtonHtml: function () {
    return '<button type="button" id="a11y-button" aria-expanded="false" aria-controls="a11y-panel" aria-label="Accessibility settings" ' +
        'class="group relative inline-flex h-11 w-11 items-center justify-center rounded-control border-[1.5px] border-lily-teal bg-white text-lily-teal transition-colors duration-150 hover:bg-mist">' +
        '<svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="4" r="2"/><path d="M20 8.5c0 .6-.4 1-1 1.1l-4.5.7v3.6l1.9 6.7a1 1 0 0 1-1.9.6L12.6 15h-1.2l-1.9 6.2a1 1 0 0 1-1.9-.6l1.9-6.7v-3.6L5 9.6a1 1 0 0 1 .3-2.1l5.2.6h3l5.2-.6c.6 0 1.3.4 1.3 1Z"/></svg>' +
        '<span aria-hidden="true" class="pointer-events-none absolute top-full left-1/2 z-30 mt-2 hidden -translate-x-1/2 rounded-input bg-ink px-2 py-1 text-[0.8125rem] font-semibold whitespace-nowrap text-white group-hover:block group-focus-visible:block group-aria-expanded:invisible">Accessibility settings</span>' +
      '</button>';
  },

  openPanel: function () {
    $('#a11y-panel').removeClass('hidden');
    $('#a11y-button').attr('aria-expanded', 'true');
    $('#a11y-panel input:checked').first().trigger('focus');
  },

  closePanel: function (returnFocus) {
    $('#a11y-panel').addClass('hidden');
    $('#a11y-button').attr('aria-expanded', 'false');
    if (returnFocus) {
      $('#a11y-button').trigger('focus');
    }
  },

  readPanel: function () {
    return {
      textSize: $('input[name="a11y-text-size"]:checked').val(),
      contrast: $('input[name="a11y-contrast"]:checked').val(),
      motion: $('input[name="a11y-motion"]:checked').val()
    };
  },

  handleChange: function () {
    const settings = A11y.readPanel();
    A11y.apply(settings);
    A11y.save(settings);
  },

  handleReset: function () {
    const defaults = $.extend({}, A11y.DEFAULTS);
    $('input[name="a11y-text-size"][value="default"]').prop('checked', true);
    $('input[name="a11y-contrast"][value="off"]').prop('checked', true);
    $('input[name="a11y-motion"][value="device"]').prop('checked', true);
    A11y.apply(defaults);
    A11y.save(defaults);
    UI.toast('Accessibility settings are back to default.', 'info');
  },

  // Builds the button and panel inside $slot and wires them up
  // options is optional: { onPhoto: true } or { iconOnly: true }, see buttonHtml
  mount: function ($slot, options) {
    const settings = A11y.load();
    $slot.addClass('relative').html(A11y.buttonHtml(options || {}) + A11y.panelHtml(settings));

    $('#a11y-button').on('click', function () {
      if ($('#a11y-panel').hasClass('hidden')) {
        A11y.openPanel();
      } else {
        A11y.closePanel(false);
      }
    });

    $('#a11y-panel').on('change', 'input', A11y.handleChange);
    $('#a11y-reset').on('click', A11y.handleReset);

    // Esc closes the panel and puts focus back on the button
    $slot.on('keydown', function (event) {
      if (event.key === 'Escape' && !$('#a11y-panel').hasClass('hidden')) {
        A11y.closePanel(true);
      }
    });

    // Clicking anywhere else closes it too
    $(document).on('click', function (event) {
      if (!$slot[0].contains(event.target)) {
        A11y.closePanel(false);
      }
    });
  }
};
