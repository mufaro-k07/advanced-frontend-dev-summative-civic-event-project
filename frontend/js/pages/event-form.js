// Admin: add a new event, or edit one when the link has ?id=

const eventForm = {
  id: new URLSearchParams(window.location.search).get('id'),
  previewUrl: null
};

// datetime-local boxes want "2026-12-06T08:00" in local time, the backend sends ISO in UTC
function toLocalInputValue(isoString) {
  const date = new Date(isoString);
  const pad = function (number) { return String(number).padStart(2, '0'); };
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

// Photo preview

function showImagePreview(src, caption) {
  $('#image-preview').html(
    '<figure class="flex flex-wrap items-end gap-4">' +
      '<img src="' + UI.escapeHtml(src) + '" alt="Preview of the event photo" class="h-32 w-48 rounded-card object-cover">' +
      '<figcaption class="text-sm text-ink-soft">' + UI.escapeHtml(caption) + '</figcaption>' +
    '</figure>'
  );
}

// Previews use a temporary browser URL, so free the old one before making a new one
function releasePreviewUrl() {
  if (eventForm.previewUrl) {
    URL.revokeObjectURL(eventForm.previewUrl);
    eventForm.previewUrl = null;
  }
}

function clearChosenImage() {
  $('#image').val('');
  releasePreviewUrl();
}

// Check the file the moment it's picked, before anything is uploaded
function handleImageChange() {
  const $input = $('#image');
  const file = $input[0].files[0];
  UI.clearFieldError($input);

  if (!file) {
    $('#image-preview').empty();
    return;
  }

  const problem = Validate.fileError(file, 'image');
  if (problem) {
    UI.setFieldError($input, problem);
    clearChosenImage();
    $('#image-preview').empty();
    return;
  }

  releasePreviewUrl();
  eventForm.previewUrl = URL.createObjectURL(file);
  showImagePreview(eventForm.previewUrl, file.name + ' is ready to upload.');
}

// Checking the form

// The links box, one link per line, without the empty lines
function linkLines() {
  const lines = $('#links').val().split('\n');
  const links = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '') {
      links.push(lines[i].trim());
    }
  }
  return links;
}

// Returns what's wrong with the links, or '' if they're fine. The backend checks again.
function linksError() {
  const links = linkLines();
  if (links.length > EventLinks.MAX) {
    return 'Add ' + EventLinks.MAX + ' links at most. You have ' + links.length + '.';
  }
  for (let i = 0; i < links.length; i++) {
    if (!EventLinks.platformFor(links[i])) {
      return '"' + links[i] + '" isn\'t a YouTube, Instagram or TikTok link. Check it starts with https://';
    }
  }
  return '';
}

function validateEventForm() {
  const $title = $('#title');
  const $location = $('#location');
  const $start = $('#starts-at');
  const $end = $('#ends-at');
  let isValid = true;

  UI.clearFieldError($title);
  UI.clearFieldError($location);
  UI.clearFieldError($start);
  UI.clearFieldError($end);
  UI.clearFieldError($('#links'));

  if ($title.val().trim() === '') {
    UI.setFieldError($title, 'Give the event a name.');
    isValid = false;
  }
  if ($location.val().trim() === '') {
    UI.setFieldError($location, 'Say where it\'s happening.');
    isValid = false;
  }
  if ($start.val() === '') {
    UI.setFieldError($start, 'Choose a start date and time.');
    isValid = false;
  }
  if ($end.val() === '') {
    UI.setFieldError($end, 'Choose an end date and time.');
    isValid = false;
  } else if ($start.val() !== '' && new Date($end.val()) <= new Date($start.val())) {
    UI.setFieldError($end, 'The end has to be after the start.');
    isValid = false;
  }
  const problemWithLinks = linksError();
  if (problemWithLinks) {
    UI.setFieldError($('#links'), problemWithLinks);
    isValid = false;
  }

  if (!isValid) {
    $('#event-form [aria-invalid="true"]').first().trigger('focus');
  }
  return isValid;
}

// Saving

function buildFormData() {
  const formData = new FormData();
  formData.append('title', $('#title').val().trim());
  formData.append('location', $('#location').val().trim());
  formData.append('description', $('#description').val().trim());
  // Turn the local time into a full ISO date so the backend stores the right moment
  formData.append('starts_at', new Date($('#starts-at').val()).toISOString());
  formData.append('ends_at', new Date($('#ends-at').val()).toISOString());
  // Always sent, so emptying the box on an edit removes the old links
  formData.append('links', linkLines().join('\n'));

  const file = $('#image')[0].files[0];
  if (file) {
    formData.append('image', file);
  }
  return formData;
}

function handleSubmit(event) {
  event.preventDefault();
  UI.hideFormError($('#form-error'));
  if (!validateEventForm()) {
    return;
  }

  const isEdit = Boolean(eventForm.id);
  const method = isEdit ? 'PUT' : 'POST';
  const path = isEdit ? '/events/' + encodeURIComponent(eventForm.id) : '/events';
  const $button = $('#save-button');
  UI.setButtonLoading($button, true, 'Saving...');

  Api.upload(method, path, buildFormData())
    .done(function (response) {
      UI.setFlash(isEdit ? 'Event updated.' : 'Event added. Residents have been notified.', 'success');
      window.location.href = '../pages/event.html?id=' + encodeURIComponent(response.data.id);
    })
    .fail(function (xhr) {
      UI.setButtonLoading($button, false);
      UI.showFormError($('#form-error'), Api.errorMessage(xhr));
      $('#form-error')[0].scrollIntoView();
    });
}

// Edit mode

function fillForm(event) {
  $('#title').val(event.title);
  $('#location').val(event.location || '');
  $('#description').val(event.description || '');
  $('#starts-at').val(toLocalInputValue(event.starts_at));
  if (event.ends_at) {
    $('#ends-at').val(toLocalInputValue(event.ends_at));
  }
  if (event.metadata && event.metadata.image_url) {
    showImagePreview(event.metadata.image_url, 'Current photo. Choose a new file to replace it.');
  }
  if (event.metadata && event.metadata.links) {
    $('#links').val(event.metadata.links.join('\n'));
  }
}

function loadEventForEditing() {
  document.title = 'Edit event · Sunshine 263';
  $('#form-heading').text('Edit event');
  $('#form-intro').text('Changes show up for residents straight away.');
  $('#cancel-link').attr('href', '../pages/event.html?id=' + encodeURIComponent(eventForm.id));
  $('#event-form').addClass('hidden');
  UI.showSkeleton($('#form-loading'), 1);

  Api.get('/events/' + encodeURIComponent(eventForm.id))
    .done(function (response) {
      $('#form-loading').empty();
      fillForm(response.data);
      $('#event-form').removeClass('hidden');
    })
    .fail(function (xhr) {
      UI.showError($('#form-loading'), Api.errorMessage(xhr), loadEventForEditing);
    });
}

function clearErrorOnInput() {
  UI.clearFieldError($(this));
}

// ROLE GUARD: only admins get past this point. The backend checks again anyway.
if (Guards.requireAdmin()) {
  Layout.init({ page: eventForm.id ? '' : 'admin-event-form', area: 'admin' });
  if (eventForm.id) {
    loadEventForEditing();
  }
  $('#image').on('change', handleImageChange);
  $('#event-form').on('submit', handleSubmit);
  $('#title, #location, #starts-at, #ends-at, #links').on('input change', clearErrorOnInput);
}
