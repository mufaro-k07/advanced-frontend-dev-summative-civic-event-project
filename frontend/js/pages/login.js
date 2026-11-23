// Login page

// ROLE GUARD: people who are already logged in skip straight to their dashboard
Guards.redirectIfLoggedIn();

// Messages for when another page sends someone back here (login.html?reason=...)
const LOGIN_NOTICES = {
  'expired': { type: 'info', text: 'Your session ended after an hour, which happens for your safety. Please log in again.' },
  'login-required': { type: 'info', text: 'Please log in to see that page.' },
  'logged-out': { type: 'success', text: "You've logged out. See you soon." },
  'disabled': { type: 'error', text: 'This account has been disabled, so you cannot log in. If you think this is a mistake, contact the city team.' }
};

function showLoginNotice() {
  const reason = new URLSearchParams(window.location.search).get('reason');
  const notice = LOGIN_NOTICES[reason];
  if (!notice) {
    return;
  }

  const styles = {
    info: 'border-lily-teal bg-mist text-ink',
    success: 'border-success bg-white text-success',
    error: 'border-error bg-white text-error'
  };
  const label = notice.type === 'error' ? '<strong>Error:</strong> ' : '';

  // Errors are announced straight away, the friendlier notes wait their turn
  $('#login-notice')
    .attr('role', notice.type === 'error' ? 'alert' : 'status')
    .addClass('rounded-control border-l-4 p-4 ' + styles[notice.type])
    .html('<p class="flex items-start gap-2">' + UI.icons[notice.type] + '<span>' + label + UI.escapeHtml(notice.text) + '</span></p>')
    .removeClass('hidden');
}

// Checks the form before we bother the server. Returns true if it's ready to send.
function validateLoginForm() {
  const $email = $('#email');
  const $password = $('#password');
  let isValid = true;

  UI.clearFieldError($email);
  UI.clearFieldError($password);

  if ($email.val().trim() === '') {
    UI.setFieldError($email, 'Enter your email address.');
    isValid = false;
  } else if (!Validate.isEmail($email.val().trim())) {
    UI.setFieldError($email, 'That email doesn\'t look right. Check for typos, like a missing @.');
    isValid = false;
  }

  if ($password.val() === '') {
    UI.setFieldError($password, 'Enter your password.');
    isValid = false;
  }

  // Move to the first problem so keyboard and screen reader users land on it
  if (!isValid) {
    $('#login-form [aria-invalid="true"]').first().trigger('focus');
  }
  return isValid;
}

function loginErrorMessage(xhr) {
  // The backend says "Invalid credentials" for both a wrong email and a wrong password
  if (xhr.status === 401) {
    return "That email and password don't match. Check them and try again.";
  }
  return Api.errorMessage(xhr);
}

function handleLoginSubmit(event) {
  event.preventDefault();
  UI.hideFormError($('#form-error'));

  if (!validateLoginForm()) {
    return;
  }

  const $button = $('#login-button');
  const rememberMe = $('#remember').is(':checked');
  const credentials = {
    email: $('#email').val().trim(),
    password: $('#password').val()
  };

  UI.setButtonLoading($button, true, 'Logging in...');

  Api.post('/auth/login', credentials)
    .done(function (response) {
      // finishLogin checks the account is still active, then moves to the dashboard
      Auth.finishLogin(response.data.token, rememberMe).fail(function (xhr) {
        Auth.clear();
        UI.setButtonLoading($button, false);
        UI.showFormError($('#form-error'), Api.errorMessage(xhr));
      });
    })
    .fail(function (xhr) {
      UI.setButtonLoading($button, false);
      UI.showFormError($('#form-error'), loginErrorMessage(xhr));
      $('#password').val('').trigger('focus');
    });
}

// Clear a field's error as soon as the person starts fixing it
function clearErrorOnInput() {
  UI.clearFieldError($(this));
}

showLoginNotice();
A11y.mount($('#a11y-slot'));
UI.setupPasswordToggle($('#toggle-password'));
$('#login-form').on('submit', handleLoginSubmit);
$('#email, #password').on('input', clearErrorOnInput);
