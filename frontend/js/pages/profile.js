// Profile: change your own name and email

function renderAccountDetails(user) {
  $('#account-details').html(
    '<div><dt class="text-sm font-semibold text-ink-soft">Role</dt><dd>' + (user.role === 'admin' ? 'Admin' : 'Resident') + '</dd></div>' +
    '<div><dt class="text-sm font-semibold text-ink-soft">Member since</dt><dd>' + UI.escapeHtml(UI.formatDate(user.created_at)) + '</dd></div>'
  );
}

function validateProfileForm() {
  const $name = $('#full-name');
  const $email = $('#email');
  let isValid = true;
  UI.clearFieldError($name);
  UI.clearFieldError($email);

  if ($name.val().trim() === '') {
    UI.setFieldError($name, 'Enter your full name.');
    isValid = false;
  }
  if ($email.val().trim() === '') {
    UI.setFieldError($email, 'Enter your email address.');
    isValid = false;
  } else if (!Validate.isEmail($email.val().trim())) {
    UI.setFieldError($email, 'That email doesn\'t look right. Check for typos, like a missing @.');
    isValid = false;
  }

  if (!isValid) {
    $('#profile-form [aria-invalid="true"]').first().trigger('focus');
  }
  return isValid;
}

function handleProfileSubmit(event) {
  event.preventDefault();
  UI.hideFormError($('#form-error'));
  if (!validateProfileForm()) {
    return;
  }

  const $button = $('#save-button');
  // Only name and email. The backend refuses role or status changes from here.
  const changes = {
    full_name: $('#full-name').val().trim(),
    email: $('#email').val().trim()
  };
  UI.setButtonLoading($button, true, 'Saving...');

  Api.patch('/users/profile/me', changes)
    .done(function (response) {
      Auth.updateUser(response.data);
      // Reload so the header and menus pick up the new name too
      UI.setFlash('Your profile is saved.', 'success');
      window.location.reload();
    })
    .fail(function (xhr) {
      UI.setButtonLoading($button, false);
      if (xhr.status === 409) {
        UI.setFieldError($('#email'), 'Someone else already uses that email. Try a different one.');
        $('#email').trigger('focus');
        return;
      }
      UI.showFormError($('#form-error'), Api.errorMessage(xhr));
    });
}

function loadProfile() {
  UI.showSkeleton($('#profile-loading'), 1);
  Api.get('/users/profile/me')
    .done(function (response) {
      const user = response.data;
      $('#profile-loading').empty();
      $('#full-name').val(user.full_name);
      $('#email').val(user.email);
      renderAccountDetails(user);
      $('#profile-form').removeClass('hidden');
    })
    .fail(function (xhr) {
      UI.showError($('#profile-loading'), Api.errorMessage(xhr), loadProfile);
    });
}

// ROLE GUARD: any logged-in user can edit their own profile, logged-out people go to login
if (Guards.requireAuth()) {
  Layout.init({ page: 'profile', area: 'resident' });
  loadProfile();
  $('#profile-form').on('submit', handleProfileSubmit);
  $('#full-name, #email').on('input', function () { UI.clearFieldError($(this)); });
}
