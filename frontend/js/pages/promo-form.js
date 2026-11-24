// Admin: add a promo, or edit one when the link has ?id=

const promoForm = {
  id: new URLSearchParams(window.location.search).get('id'),
  wasPublished: true,
  previewUrl: null
};

function releasePreviewUrl() {
  if (promoForm.previewUrl) {
    URL.revokeObjectURL(promoForm.previewUrl);
    promoForm.previewUrl = null;
  }
}

function showVideoPreview(src, caption) {
  $('#video-preview').html(
    '<p class="mb-1 text-sm text-ink-soft">' + UI.escapeHtml(caption) + '</p>' +
    '<video controls muted preload="metadata" src="' + UI.escapeHtml(src) + '" class="max-h-60 w-full rounded-card bg-ink">Your browser can\'t play this preview.</video>'
  );
}

// Check the file the moment it's picked, before anything is uploaded
function handleVideoChange() {
  const $input = $('#video');
  const file = $input[0].files[0];
  UI.clearFieldError($input);
  releasePreviewUrl();

  if (!file) {
    return;
  }
  const problem = Validate.fileError(file, 'video');
  if (problem) {
    UI.setFieldError($input, problem);
    $input.val('');
    $('#video-preview').empty();
    return;
  }

  promoForm.previewUrl = URL.createObjectURL(file);
  showVideoPreview(promoForm.previewUrl, 'Preview of ' + file.name + ':');
}

function validatePromoForm() {
  const fields = [
    { $input: $('#title'), message: 'Give the promo a title.' },
    { $input: $('#description'), message: 'Add a short description.' },
    { $input: $('#caption-text'), message: 'Add the caption text. It\'s needed for the captions and transcript.' }
  ];
  let isValid = true;

  for (let i = 0; i < fields.length; i++) {
    UI.clearFieldError(fields[i].$input);
    if (fields[i].$input.val().trim() === '') {
      UI.setFieldError(fields[i].$input, fields[i].message);
      isValid = false;
    }
  }

  // A video is only needed for new promos
  if (!promoForm.id && !$('#video')[0].files[0]) {
    UI.setFieldError($('#video'), 'Choose an MP4 video to upload.');
    isValid = false;
  }

  if (!isValid) {
    $('#promo-form [aria-invalid="true"]').first().trigger('focus');
  }
  return isValid;
}

function buildFormData() {
  const formData = new FormData();
  formData.append('title', $('#title').val().trim());
  formData.append('description', $('#description').val().trim());
  formData.append('caption_text', $('#caption-text').val().trim());
  const file = $('#video')[0].files[0];
  if (file) {
    formData.append('video', file);
  }
  return formData;
}

function showProgress(percent) {
  $('#upload-progress').removeClass('hidden');
  $('#progress-bar').val(percent).attr('aria-valuetext', percent + ' percent uploaded');
}

function finishSaving(savedId, message) {
  UI.setFlash(message, 'success');
  window.location.href = '../pages/promo.html?id=' + encodeURIComponent(savedId);
}

function saveFailed(xhr) {
  UI.setButtonLoading($('#save-button'), false);
  $('#upload-progress').addClass('hidden');
  UI.showFormError($('#form-error'), Api.errorMessage(xhr));
  $('#form-error')[0].scrollIntoView();
}

// New promos always go live, so if the box is unticked we unpublish straight after.
// For edits we only call publish/unpublish when the box changed.
function syncPublished(savedId, wantsPublished, wasPublished, message) {
  if (wantsPublished === wasPublished) {
    finishSaving(savedId, message);
    return;
  }
  const action = wantsPublished ? 'publish' : 'unpublish';
  Api.patch('/promos/' + encodeURIComponent(savedId) + '/' + action)
    .done(function () {
      finishSaving(savedId, wantsPublished ? message + ' It\'s published.' : message + ' It\'s saved as a draft.');
    })
    .fail(saveFailed);
}

function handleSubmit(event) {
  event.preventDefault();
  UI.hideFormError($('#form-error'));
  if (!validatePromoForm()) {
    return;
  }

  const isEdit = Boolean(promoForm.id);
  const wantsPublished = $('#published').is(':checked');
  const method = isEdit ? 'PUT' : 'POST';
  const path = isEdit ? '/promos/' + encodeURIComponent(promoForm.id) : '/promos';
  UI.setButtonLoading($('#save-button'), true, 'Saving...');

  Api.upload(method, path, buildFormData(), showProgress)
    .done(function (response) {
      const wasPublished = isEdit ? promoForm.wasPublished : true;
      syncPublished(response.data.id, wantsPublished, wasPublished, isEdit ? 'Promo updated.' : 'Promo added.');
    })
    .fail(saveFailed);
}

function loadForEditing() {
  document.title = 'Edit promo · Sunshine 263';
  $('#form-heading').text('Edit promo');
  $('#form-intro').text('Change the details, or choose a new video to replace the current one.');
  $('#video-hint').text('Optional. MP4 only, up to 8 MB. Leave empty to keep the current video.');
  $('#cancel-link').attr('href', '../pages/promo.html?id=' + encodeURIComponent(promoForm.id));
  $('#promo-form').addClass('hidden');
  UI.showSkeleton($('#form-loading'), 1);

  Api.get('/promos/' + encodeURIComponent(promoForm.id))
    .done(function (response) {
      const promo = response.data;
      $('#form-loading').empty();
      $('#title').val(promo.title);
      $('#description').val(promo.description || '');
      $('#caption-text').val(promo.caption_text || '');
      promoForm.wasPublished = promo.published !== false;
      $('#published').prop('checked', promoForm.wasPublished);
      showVideoPreview(promo.video_url, 'Current video:');
      $('#promo-form').removeClass('hidden');
    })
    .fail(function (xhr) {
      UI.showError($('#form-loading'), Api.errorMessage(xhr), loadForEditing);
    });
}

// ROLE GUARD: only admins get past this point. The backend checks again anyway.
if (Guards.requireAdmin()) {
  Layout.init({ page: promoForm.id ? '' : 'admin-promo-form', area: 'admin' });
  if (promoForm.id) {
    loadForEditing();
  }
  $('#video').on('change', handleVideoChange);
  $('#promo-form').on('submit', handleSubmit);
  $('#title, #description, #caption-text').on('input', function () { UI.clearFieldError($(this)); });
}
