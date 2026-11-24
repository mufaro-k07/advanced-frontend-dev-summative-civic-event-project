// City services: report a problem, then follow it from submitted to resolved

// The backend only sends the type names, so the little hints under each one live here
const TYPE_HINTS = {
  'Road Repair': 'Potholes, damaged roads',
  'Sanitation': 'Rubbish, blocked drains',
  'Street Light Issue': 'Lights out or flickering',
  'Water Supply Issue': 'No water, burst pipes',
  'Public Event Support': 'Help for a community event',
  'General Complaint': 'Anything else'
};

const REQUEST_STEPS = [
  { status: 'submitted', label: 'Submitted' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'resolved', label: 'Resolved' }
];

// Type picker

function typeOptionHtml(typeName, index) {
  const hint = TYPE_HINTS[typeName] || '';
  // The whole card is the label, so clicking anywhere on it picks the type
  return '<label class="flex min-h-11 cursor-pointer items-center gap-3.5 rounded-card border-2 border-line bg-white px-4 py-4 transition-colors duration-150 hover:border-lily-teal has-[:checked]:border-lily-teal has-[:checked]:bg-mist">' +
      '<input type="radio" name="service_type" id="service-type-' + index + '" value="' + UI.escapeHtml(typeName) + '" class="h-5 w-5 shrink-0 accent-lily-teal">' +
      '<span>' +
        '<span class="block font-bold">' + UI.escapeHtml(typeName) + '</span>' +
        (hint ? '<span class="block text-[0.8125rem] text-ink-soft">' + UI.escapeHtml(hint) + '</span>' : '') +
      '</span>' +
    '</label>';
}

function loadTypes() {
  const $options = $('#type-options');
  UI.showSkeleton($options, 2);

  Api.get('/service-requests/types')
    .done(function (response) {
      const types = response.data || [];
      let html = '<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">';
      for (let i = 0; i < types.length; i++) {
        html += typeOptionHtml(types[i], i);
      }
      html += '</div>';
      $options.html(html);
    })
    .fail(function (xhr) {
      UI.showError($options, Api.errorMessage(xhr), loadTypes);
    });
}

// The radio group has no single input, so its error is set by hand here
function setTypeError(message) {
  $('input[name="service_type"]').attr('aria-invalid', 'true');
  $('#service-type-error').html(UI.icons.error + '<span>' + UI.escapeHtml(message) + '</span>').removeClass('hidden');
}

function clearTypeError() {
  $('input[name="service_type"]').removeAttr('aria-invalid');
  $('#service-type-error').empty().addClass('hidden');
}

// Sending a request

function validateServiceForm() {
  const $title = $('#title');
  const $location = $('#location');
  let isValid = true;
  clearTypeError();
  UI.clearFieldError($title);
  UI.clearFieldError($location);

  if ($('input[name="service_type"]:checked').length === 0) {
    setTypeError('Pick the kind of problem it is.');
    isValid = false;
  }
  if ($title.val().trim() === '') {
    UI.setFieldError($title, 'Give your request a short title.');
    isValid = false;
  }
  if ($location.val().trim() === '') {
    UI.setFieldError($location, 'Tell us where it is, like a street and suburb.');
    isValid = false;
  }

  if (!isValid) {
    $('#service-form [aria-invalid="true"]').first().trigger('focus');
  }
  return isValid;
}

function handleServiceSubmit(event) {
  event.preventDefault();
  UI.hideFormError($('#form-error'));
  if (!validateServiceForm()) {
    return;
  }

  const $button = $('#send-button');
  const request = {
    service_type: $('input[name="service_type"]:checked').val(),
    title: $('#title').val().trim(),
    location: $('#location').val().trim(),
    description: $('#description').val().trim()
  };
  UI.setButtonLoading($button, true, 'Sending...');

  Api.post('/service-requests', request)
    .done(function () {
      UI.setButtonLoading($button, false);
      $('#service-form')[0].reset();
      UI.toast("Request sent. We'll let you know when the status changes.", 'success');
      loadMyRequests();
    })
    .fail(function (xhr) {
      UI.setButtonLoading($button, false);
      UI.showFormError($('#form-error'), Api.errorMessage(xhr));
    });
}

// "Your requests" tracker

function shortDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function stepIndexFor(status) {
  for (let i = 0; i < REQUEST_STEPS.length; i++) {
    if (REQUEST_STEPS[i].status === status) {
      return i;
    }
  }
  return 0;
}

// Three bars that fill up as the request moves along. Screen readers get the status
// as one plain sentence instead, because the bars only make sense when you see them.
function progressHtml(status) {
  const current = stepIndexFor(status);
  const isResolved = status === 'resolved';
  let steps = '';
  for (let i = 0; i < REQUEST_STEPS.length; i++) {
    const reached = i <= current;
    let barColour = 'bg-line';
    if (reached) {
      barColour = isResolved ? 'bg-success' : 'bg-lily-teal';
    }
    steps +=
      '<li class="flex flex-col gap-1.5">' +
        '<span class="h-2 rounded-full ' + barColour + '"></span>' +
        '<span class="text-[0.8125rem] ' + (reached ? 'text-ink' : 'text-ink-soft') + (i === current ? ' font-bold' : '') + '">' + REQUEST_STEPS[i].label + '</span>' +
      '</li>';
  }
  return '<div class="flex-[1_1_360px] max-w-full">' +
      '<p class="sr-only">Status: ' + REQUEST_STEPS[current].label + '</p>' +
      '<ol aria-hidden="true" class="grid grid-cols-3 gap-1.5">' + steps + '</ol>' +
    '</div>';
}

function requestItemHtml(request) {
  return '<li id="request-' + UI.escapeHtml(request.id) + '" tabindex="-1" class="card-border flex flex-wrap items-center gap-5 rounded-card border border-line bg-white px-5 py-5 md:px-6">' +
      '<div class="min-w-0 flex-[1_1_300px] max-w-full">' +
        '<p class="text-[0.8125rem] font-bold text-ink-soft">' + UI.escapeHtml(request.service_type) + ' · Sent ' + UI.escapeHtml(shortDate(request.created_at)) + '</p>' +
        '<h3 class="mt-1 text-xl font-bold text-ink">' + UI.escapeHtml(request.title) + '</h3>' +
        '<p class="mt-0.5 text-sm text-ink-soft">' + UI.escapeHtml(request.location) + '</p>' +
      '</div>' +
      progressHtml(request.status) +
    '</li>';
}

// A notification about a request links here with ?id=, so we point at that request
function highlightLinkedRequest() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    return;
  }
  const item = document.getElementById('request-' + id);
  if (item) {
    $(item).addClass('ring-2 ring-lily-teal ring-offset-2');
    item.focus();
  }
}

function loadMyRequests() {
  const $list = $('#my-requests');
  UI.showSkeleton($list, 3);

  Api.get('/service-requests/my')
    .done(function (response) {
      const requests = response.data || [];
      if (requests.length === 0) {
        UI.showEmpty($list, 'No requests yet', 'When you send one with the form above, you can follow it here.');
        return;
      }
      let html = '<ul class="flex flex-col gap-3">';
      for (let i = 0; i < requests.length; i++) {
        html += requestItemHtml(requests[i]);
      }
      html += '</ul>';
      $list.html(html);
      highlightLinkedRequest();
    })
    .fail(function (xhr) {
      UI.showError($list, Api.errorMessage(xhr), loadMyRequests);
    });
}

// ROLE GUARD: any logged-in user can send a request. The backend checks the token again.
if (Guards.requireAuth()) {
  Layout.init({ page: 'services', area: 'resident' });
  $('#service-form').on('submit', handleServiceSubmit);
  // Picking a type clears its error straight away
  $('#type-options').on('change', 'input[name="service_type"]', clearTypeError);
  loadTypes();
  loadMyRequests();
}
