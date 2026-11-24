// Admin: add an announcement, or edit its title and published state when the link has ?id=

const announcementForm = {
  id: new URLSearchParams(window.location.search).get('id'),
  wasPublished: true,
  previewUrl: null
};

function releasePreviewUrl() {
  if (announcementForm.previewUrl) {
    URL.revokeObjectURL(announcementForm.previewUrl);
    announcementForm.previewUrl = null;
  }
}

// Check the file the moment it's picked, and let the admin listen before uploading
function handleAudioChange() {
  const $input = $('#audio');
  const file = $input[0].files[0];
  UI.clearFieldError($input);
  releasePreviewUrl();
  $('#audio-preview').empty();

  if (!file) {
    return;
  }
  const problem = Validate.fileError(file, 'audio');
  if (problem) {
    UI.setFieldError($input, problem);
    $input.val('');
    return;
  }

  announcementForm.previewUrl = URL.createObjectURL(file);
  $('#audio-preview').html(
    '<p class="mb-1 text-sm text-ink-soft">Have a listen before you save:</p>' +
    '<audio controls src="' + announcementForm.previewUrl + '" class="w-full">Your browser can\'t play this preview.</audio>'
  );
}

function validateAnnouncementForm() {
  const $title = $('#title');
  const $audio = $('#audio');
  let isValid = true;
  UI.clearFieldError($title);

  if ($title.val().trim() === '') {
    UI.setFieldError($title, 'Give the announcement a title.');
    isValid = false;
  }
  // A recording is only needed for new announcements
  if (!announcementForm.id && !$audio[0].files[0]) {
    UI.setFieldError($audio, 'Choose an audio file to upload.');
    isValid = false;
  }

  if (!isValid) {
    $('#announcement-form [aria-invalid="true"]').first().trigger('focus');
  }
  return isValid;
}

function showProgress(percent) {
  $('#upload-progress').removeClass('hidden');
  $('#progress-bar').val(percent).attr('aria-valuetext', percent + ' percent uploaded');
}

function finishSaving(savedId, message) {
  UI.setFlash(message, 'success');
  window.location.href = '../pages/announcement.html?id=' + encodeURIComponent(savedId);
}

function saveFailed(xhr) {
  UI.setButtonLoading($('#save-button'), false);
  $('#upload-progress').addClass('hidden');
  UI.showFormError($('#form-error'), Api.errorMessage(xhr));
  $('#form-error')[0].scrollIntoView();
}

function createAnnouncement() {
  const formData = new FormData();
  formData.append('title', $('#title').val().trim());
  formData.append('published', $('#published').is(':checked') ? 'true' : 'false');
  formData.append('audio', $('#audio')[0].files[0]);

  Api.upload('POST', '/announcements', formData, showProgress)
    .done(function (response) {
      finishSaving(response.data.id, 'Announcement added.');
    })
    .fail(saveFailed);
}

// Editing saves the title first, then publishes or unpublishes if that box changed.
// We use the publish route for that, because it's the one that notifies residents.
function updateAnnouncement() {
  const id = announcementForm.id;
  const wantsPublished = $('#published').is(':checked');

  Api.put('/announcements/' + encodeURIComponent(id), { title: $('#title').val().trim() })
    .done(function () {
      if (wantsPublished === announcementForm.wasPublished) {
        finishSaving(id, 'Announcement updated.');
        return;
      }
      const action = wantsPublished ? 'publish' : 'unpublish';
      Api.patch('/announcements/' + encodeURIComponent(id) + '/' + action)
        .done(function () {
          finishSaving(id, wantsPublished ? 'Announcement updated and published.' : 'Announcement updated and moved to drafts.');
        })
        .fail(saveFailed);
    })
    .fail(saveFailed);
}

function handleSubmit(event) {
  event.preventDefault();
  UI.hideFormError($('#form-error'));
  if (!validateAnnouncementForm()) {
    return;
  }
  UI.setButtonLoading($('#save-button'), true, 'Saving...');
  if (announcementForm.id) {
    updateAnnouncement();
  } else {
    createAnnouncement();
  }
}

function loadForEditing() {
  document.title = 'Edit announcement · Sunshine 263';
  $('#form-heading').text('Edit announcement');
  $('#form-intro').text('Change the title or move it between published and drafts.');
  $('#audio-field').addClass('hidden');
  $('#audio-locked-note').removeClass('hidden');
  $('#cancel-link').attr('href', '../pages/announcement.html?id=' + encodeURIComponent(announcementForm.id));
  $('#announcement-form').addClass('hidden');
  UI.showSkeleton($('#form-loading'), 1);

  Api.get('/announcements/' + encodeURIComponent(announcementForm.id))
    .done(function (response) {
      $('#form-loading').empty();
      $('#title').val(response.data.title);
      announcementForm.wasPublished = response.data.published !== false;
      $('#published').prop('checked', announcementForm.wasPublished);
      $('#announcement-form').removeClass('hidden');
    })
    .fail(function (xhr) {
      UI.showError($('#form-loading'), Api.errorMessage(xhr), loadForEditing);
    });
}

// ROLE GUARD: only admins get past this point. The backend checks again anyway.
if (Guards.requireAdmin()) {
  Layout.init({ page: announcementForm.id ? '' : 'admin-announcement-form', area: 'admin' });
  if (announcementForm.id) {
    loadForEditing();
  }
  $('#audio').on('change', handleAudioChange);
  $('#announcement-form').on('submit', handleSubmit);
  $('#title').on('input', function () { UI.clearFieldError($(this)); });
}
