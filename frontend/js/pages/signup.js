// Sign up page

// ROLE GUARD: people who are already logged in skip straight to their dashboard
Guards.redirectIfLoggedIn();

const RULE_MET_ICON = '<svg aria-hidden="true" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.86a.75.75 0 0 0-1.22-.88l-3.23 4.48-1.62-1.62a.75.75 0 1 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.09l3.74-5.2Z" clip-rule="evenodd"/></svg>';
const RULE_UNMET_ICON = '<svg aria-hidden="true" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7"/></svg>';

// Each level gets a word as well as a colour, so the meter never relies on colour alone
const STRENGTH_LEVELS = {
  empty: { text: 'not started', barClass: '', textClass: 'text-ink-soft' },
  weak: { text: 'weak', barClass: 'bg-error', textClass: 'text-error' },
  almost: { text: 'almost there', barClass: 'bg-warning', textClass: 'text-warning' },
  strong: { text: 'strong', barClass: 'bg-success', textClass: 'text-success' }
};

function strengthLevelFor(password) {
  const met = Validate.countPasswordRulesMet(password);
  if (password === '') {
    return STRENGTH_LEVELS.empty;
  }
  if (met <= 2) {
    return STRENGTH_LEVELS.weak;
  }
  if (met < Validate.passwordRules.length) {
    return STRENGTH_LEVELS.almost;
  }
  return STRENGTH_LEVELS.strong;
}

// Ticks off each rule as the person types
function renderPasswordRules(password) {
  let html = '';
  for (let i = 0; i < Validate.passwordRules.length; i++) {
    const rule = Validate.passwordRules[i];
    const isMet = rule.test(password);
    html += '<li class="flex items-center gap-2 ' + (isMet ? 'text-success' : 'text-ink-soft') + '">' +
      (isMet ? RULE_MET_ICON : RULE_UNMET_ICON) +
      '<span>' + UI.escapeHtml(rule.label) + '<span class="sr-only">' + (isMet ? ', done' : ', not yet') + '</span></span>' +
    '</li>';
  }
  $('#password-rules').html(html);
}

function updateStrengthMeter() {
  const password = $('#password').val();
  const level = strengthLevelFor(password);
  const met = Validate.countPasswordRulesMet(password);
  const percent = (met / Validate.passwordRules.length) * 100;

  // The width is worked out as they type, so it has to be an inline style
  $('#strength-bar')
    .removeClass('bg-error bg-warning bg-success')
    .addClass(level.barClass)
    .css('width', percent + '%');

  $('#strength-label')
    .removeClass('text-ink-soft text-error text-warning text-success')
    .addClass(level.textClass)
    .text('Strength: ' + level.text);

  renderPasswordRules(password);
}

// Checks the whole form before we bother the server. Returns true if it's ready to send.
function validateSignupForm() {
  const $name = $('#full-name');
  const $email = $('#email');
  const $password = $('#password');
  const $confirm = $('#confirm-password');
  let isValid = true;

  UI.clearFieldError($name);
  UI.clearFieldError($email);
  UI.clearFieldError($password);
  UI.clearFieldError($confirm);

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

  if ($password.val() === '') {
    UI.setFieldError($password, 'Choose a password.');
    isValid = false;
  } else if (!Validate.isStrongPassword($password.val())) {
    UI.setFieldError($password, 'Your password needs all five things in the list below.');
    isValid = false;
  }

  if ($confirm.val() === '') {
    UI.setFieldError($confirm, 'Type your password again.');
    isValid = false;
  } else if ($confirm.val() !== $password.val()) {
    UI.setFieldError($confirm, "The two passwords don't match. Type it again carefully.");
    isValid = false;
  }

  // Move to the first problem so keyboard and screen reader users land on it
  if (!isValid) {
    $('#signup-form [aria-invalid="true"]').first().trigger('focus');
  }
  return isValid;
}

function showSignupError(xhr) {
  if (xhr.status === 409) {
    UI.setFieldError($('#email'), 'That email already has an account. Log in instead, or use a different email.');
    $('#email').trigger('focus');
    return;
  }
  UI.showFormError($('#form-error'), Api.errorMessage(xhr));
}

function handleSignupSubmit(event) {
  event.preventDefault();
  UI.hideFormError($('#form-error'));

  if (!validateSignupForm()) {
    return;
  }

  const $button = $('#signup-button');
  // Never send a role. The backend would accept one, so leaving it out keeps everyone a resident.
  const newUser = {
    full_name: $('#full-name').val().trim(),
    email: $('#email').val().trim(),
    password: $('#password').val()
  };

  UI.setButtonLoading($button, true, 'Creating your account...');

  Api.post('/auth/signup', newUser)
    .done(function () {
      logInNewUser(newUser.email, newUser.password);
    })
    .fail(function (xhr) {
      UI.setButtonLoading($button, false);
      showSignupError(xhr);
    });
}

// Signup doesn't return a token, so we log them in straight after to save them a step
function logInNewUser(email, password) {
  Api.post('/auth/login', { email: email, password: password })
    .done(function (response) {
      Auth.finishLogin(response.data.token, false).fail(function () {
        window.location.replace('login.html');
      });
    })
    .fail(function () {
      // The account exists, so the login page is the next best place
      window.location.replace('login.html');
    });
}

function clearErrorOnInput() {
  UI.clearFieldError($(this));
}

// true, because the button sits on the flame lily photo
A11y.mount($('#a11y-slot'), true);
UI.setupPasswordToggle($('#toggle-password'));
updateStrengthMeter();
$('#password').on('input', updateStrengthMeter);
$('#signup-form').on('submit', handleSignupSubmit);
$('#full-name, #email, #password, #confirm-password').on('input', clearErrorOnInput);
