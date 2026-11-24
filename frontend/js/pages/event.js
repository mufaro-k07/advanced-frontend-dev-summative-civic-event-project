// Event detail: the full event, register or cancel, and feedback

const eventDetail = {
  id: new URLSearchParams(window.location.search).get('id'),
  event: null,
  registrationStatus: null, // 'registered', 'cancelled' or null
  myFeedback: null,
  editingFeedback: false
};

const STAR_PATH = 'M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5Z';

// Page layout

function eventPageHtml(event) {
  const mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(event.location || 'Harare');

  return '<div class="grid gap-8 lg:grid-cols-[2fr_1fr]">' +
      '<article>' +
        '<div class="mb-6 overflow-hidden rounded-panel">' + Cards.eventImageHtml(event, 'h-56 md:h-80') + '</div>' +
        '<div id="event-badges" class="mb-3 flex flex-wrap gap-2"></div>' +
        '<h1 class="text-[1.75rem] font-extrabold md:text-[2rem]">' + UI.escapeHtml(event.title) + '</h1>' +
        '<h2 class="mt-6 mb-2 text-2xl font-bold">About this event</h2>' +
        // whitespace-pre-line keeps the admin's line breaks without us inserting any HTML
        '<p id="event-description" class="whitespace-pre-line"></p>' +
      '</article>' +

      '<aside aria-labelledby="details-heading" class="lg:sticky lg:top-6 lg:self-start">' +
        '<div class="card-border rounded-panel border border-line bg-white p-6">' +
          '<h2 id="details-heading" class="mb-4 text-2xl font-bold">Details</h2>' +
          '<dl class="grid gap-4">' +
            '<div><dt class="text-sm font-semibold text-ink-soft">When</dt><dd>' + UI.escapeHtml(Cards.eventWhenText(event)) + '</dd></div>' +
            '<div><dt class="text-sm font-semibold text-ink-soft">Where</dt><dd>' + UI.escapeHtml(event.location || 'Location to be confirmed') + '</dd></div>' +
          '</dl>' +
          '<a href="' + mapUrl + '" target="_blank" rel="noopener" class="mt-2 inline-flex min-h-11 items-center gap-1 font-semibold text-lily-teal underline underline-offset-2">' +
            'Open in Google Maps<span class="sr-only"> (opens in a new tab)</span>' +
            '<svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.29a1 1 0 1 0 1.42 1.42L15 6.41V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z"/><path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 0 0 0-2H5Z"/></svg>' +
          '</a>' +
          '<div id="registration-box" class="mt-6 border-t border-line pt-6"></div>' +
        '</div>' +
      '</aside>' +
    '</div>' +

    '<section id="feedback" aria-labelledby="feedback-heading" class="mt-12 max-w-2xl">' +
      '<h2 id="feedback-heading" tabindex="-1" class="mb-2 text-2xl font-bold">How was it?</h2>' +
      '<div id="feedback-box"></div>' +
    '</section>' +

    // Only filled in for admins
    '<div id="admin-panel"></div>';
}

function renderBadges() {
  let html = '';
  if (Cards.hasEnded(eventDetail.event)) {
    html += Cards.badgeHtml('ended');
  }
  if (eventDetail.registrationStatus) {
    html += Cards.badgeHtml(eventDetail.registrationStatus);
  }
  $('#event-badges').html(html);
}

// Register and cancel

// The box shows one of four things: ended, registered, cancelled, or the Register button
function renderRegistrationBox() {
  const status = eventDetail.registrationStatus;
  const $box = $('#registration-box');
  let html = '<p id="registration-status" tabindex="-1" aria-live="polite" class="mb-4">';

  if (Cards.hasEnded(eventDetail.event)) {
    html += status === 'registered' ? 'This event has ended. Thanks for going!' : 'This event has ended.';
    html += '</p>';
  } else if (status === 'registered') {
    html += "<strong>You're going!</strong> We'll see you there.</p>" +
      '<button type="button" id="cancel-button" class="btn btn-secondary w-full"><span class="js-button-label">Cancel registration</span></button>';
  } else if (status === 'cancelled') {
    // The backend won't let anyone register again after cancelling (gap 9)
    html += '<strong>Registration cancelled.</strong> You can\'t sign up again after cancelling, so contact the city team if your plans change.</p>' +
      '<button type="button" class="btn btn-secondary w-full" disabled>Registration cancelled</button>';
  } else {
    html += 'Spots are free. Register so the organisers know you\'re coming.</p>' +
      '<button type="button" id="register-button" class="btn btn-accent btn-pill w-full justify-between">' +
        '<span class="js-button-label">Register for event</span>' +
        '<span class="btn-arrow" aria-hidden="true"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.64l-4.1-3.96a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.1-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd"/></svg></span>' +
      '</button>';
  }

  $box.html(html);
  $('#register-button').on('click', registerForEvent);
  $('#cancel-button').on('click', confirmCancel);
  renderBadges();
}

// After the box redraws, the old button is gone, so move focus to the new status message
function afterRegistrationChange() {
  renderRegistrationBox();
  $('#registration-status').trigger('focus');
}

function registerForEvent() {
  const $button = $('#register-button');
  UI.setButtonLoading($button, true, 'Registering...');

  Api.post('/event-registrations/register', { event_id: eventDetail.id })
    .done(function () {
      eventDetail.registrationStatus = 'registered';
      UI.toast("You're registered. See you there!", 'success');
      afterRegistrationChange();
    })
    .fail(function (xhr) {
      UI.setButtonLoading($button, false);
      if (xhr.status === 409) {
        // They already have a row for this event, either active or cancelled, so check which
        UI.toast('You already have a registration for this event.', 'info');
        refreshRegistrationStatus();
        return;
      }
      UI.toast(Api.errorMessage(xhr), 'error');
    });
}

function confirmCancel() {
  UI.confirm({
    title: 'Cancel your registration?',
    message: "You won't be able to register for this event again after cancelling.",
    confirmLabel: 'Yes, cancel it',
    cancelLabel: 'Keep my spot',
    destructive: true
  }, cancelRegistration);
}

function cancelRegistration() {
  const $button = $('#cancel-button');
  UI.setButtonLoading($button, true, 'Cancelling...');

  Api.post('/event-registrations/cancel', { event_id: eventDetail.id })
    .done(function () {
      eventDetail.registrationStatus = 'cancelled';
      UI.toast('Your registration is cancelled.', 'success');
      afterRegistrationChange();
    })
    .fail(function (xhr) {
      UI.setButtonLoading($button, false);
      UI.toast(Api.errorMessage(xhr), 'error');
    });
}

function findMyRegistration(registrations) {
  for (let i = 0; i < registrations.length; i++) {
    if (registrations[i].event_id === eventDetail.id) {
      return registrations[i].status;
    }
  }
  return null;
}

function refreshRegistrationStatus() {
  Api.get('/event-registrations/my-registrations').done(function (response) {
    eventDetail.registrationStatus = findMyRegistration(response.data || []);
    afterRegistrationChange();
  });
}

// Feedback

function starsHtml(rating) {
  let html = '<span class="inline-flex gap-0.5 text-sunshine" aria-hidden="true">';
  for (let i = 1; i <= 5; i++) {
    const fill = i <= rating ? 'currentColor' : 'none';
    html += '<svg class="h-5 w-5" viewBox="0 0 20 20" fill="' + fill + '" stroke="#8A5300" stroke-width="1"><path d="' + STAR_PATH + '"/></svg>';
  }
  html += '</span><span class="sr-only">' + rating + ' out of 5 stars</span>';
  return html;
}

function feedbackSummaryHtml(feedback) {
  return '<div class="card-border rounded-card border border-line bg-white p-5">' +
      '<p class="mb-1 text-sm font-semibold text-ink-soft">Your feedback</p>' +
      '<p class="mb-2 flex items-center gap-2">' + starsHtml(feedback.rating) + '<span>' + feedback.rating + ' out of 5</span></p>' +
      (feedback.comment ? '<p class="whitespace-pre-line">' + UI.escapeHtml(feedback.comment) + '</p>' : '<p class="text-ink-soft">No comment added.</p>') +
      '<button type="button" id="edit-feedback" class="btn btn-secondary mt-4">Edit feedback</button>' +
    '</div>';
}

// Five radio buttons that look like a row of star buttons. The words are for screen readers.
function ratingOptionsHtml(selected) {
  const words = ['poor', 'not great', 'okay', 'good', 'excellent'];
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const checked = i === selected ? ' checked' : '';
    html += '<label class="cursor-pointer">' +
        '<input type="radio" name="rating" value="' + i + '" class="peer sr-only"' + checked + '>' +
        '<span class="flex min-h-11 min-w-14 items-center justify-center gap-1 rounded-control border-2 border-lily-teal px-3 font-semibold text-lily-teal ' +
          'peer-checked:bg-lily-teal peer-checked:text-white ' +
          'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:outline-lily-teal">' +
          '<svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="' + STAR_PATH + '"/></svg>' +
          i + '<span class="sr-only"> ' + (i === 1 ? 'star' : 'stars') + ', ' + words[i - 1] + '</span>' +
        '</span>' +
      '</label>';
  }
  return html;
}

function feedbackFormHtml(existing) {
  const rating = existing ? existing.rating : 0;
  const comment = existing && existing.comment ? existing.comment : '';
  const buttonLabel = existing ? 'Save changes' : 'Send feedback';

  return '<p class="mb-4 text-ink-soft">Went along? Tell the organisers how it went. Only the city team sees your feedback.</p>' +
    '<form id="feedback-form" class="card-border rounded-panel border border-line bg-white p-6" novalidate>' +
      '<fieldset class="mb-5" aria-describedby="rating-hint rating-error">' +
        '<legend class="field-label">Your rating</legend>' +
        '<p id="rating-hint" class="field-hint mb-2">1 is poor, 5 is excellent.</p>' +
        '<div class="flex flex-wrap gap-2">' + ratingOptionsHtml(rating) + '</div>' +
        '<p id="rating-error" class="field-error hidden" aria-live="polite"></p>' +
      '</fieldset>' +
      '<div class="mb-5">' +
        '<label for="comment" class="field-label">Comment <span class="font-normal text-ink-soft">(optional)</span></label>' +
        '<textarea id="comment" rows="4" maxlength="500" aria-describedby="comment-hint" class="field-input py-2">' + UI.escapeHtml(comment) + '</textarea>' +
        '<p id="comment-hint" class="field-hint">Up to 500 characters. <span id="comment-count">' + comment.length + '</span> used.</p>' +
      '</div>' +
      '<div class="flex flex-wrap gap-3">' +
        '<button type="submit" id="feedback-submit" class="btn btn-primary"><span class="js-button-label">' + buttonLabel + '</span></button>' +
        (existing ? '<button type="button" id="feedback-cancel-edit" class="btn btn-secondary">Cancel</button>' : '') +
      '</div>' +
    '</form>';
}

function renderFeedback() {
  const $box = $('#feedback-box');
  if (eventDetail.myFeedback && !eventDetail.editingFeedback) {
    $box.html(feedbackSummaryHtml(eventDetail.myFeedback));
    $('#edit-feedback').on('click', function () {
      eventDetail.editingFeedback = true;
      renderFeedback();
      $('#feedback-form input[name="rating"]:checked').trigger('focus');
    });
    return;
  }

  $box.html(feedbackFormHtml(eventDetail.editingFeedback ? eventDetail.myFeedback : null));
  $('#feedback-form').on('submit', submitFeedback);
  $('#comment').on('input', function () {
    $('#comment-count').text($(this).val().length);
  });
  $('#feedback-form input[name="rating"]').on('change', function () {
    $('#rating-error').empty().addClass('hidden');
  });
  $('#feedback-cancel-edit').on('click', function () {
    eventDetail.editingFeedback = false;
    renderFeedback();
    $('#edit-feedback').trigger('focus');
  });
}

function showRatingError(message) {
  $('#rating-error').html(UI.icons.error + '<span>' + UI.escapeHtml(message) + '</span>').removeClass('hidden');
}

function submitFeedback(event) {
  event.preventDefault();
  const rating = parseInt($('#feedback-form input[name="rating"]:checked').val(), 10);
  if (!rating) {
    showRatingError('Choose a rating from 1 to 5.');
    $('#feedback-form input[name="rating"]').first().trigger('focus');
    return;
  }

  const body = { event_id: eventDetail.id, rating: rating, comment: $('#comment').val().trim() };
  const isEdit = Boolean(eventDetail.myFeedback);
  const request = isEdit
    ? Api.put('/event-feedback/' + eventDetail.myFeedback.id, body)
    : Api.post('/event-feedback', body);

  const $button = $('#feedback-submit');
  UI.setButtonLoading($button, true, 'Sending...');

  request
    .done(function (response) {
      eventDetail.myFeedback = response.data;
      eventDetail.editingFeedback = false;
      UI.toast(isEdit ? 'Your feedback is updated.' : 'Thanks for your feedback!', 'success');
      renderFeedback();
      $('#feedback-heading').trigger('focus');
    })
    .fail(function (xhr) {
      UI.setButtonLoading($button, false);
      if (xhr.status === 409) {
        // Only one review per event is allowed, so fetch the one they already left and show it
        UI.toast("You've already left feedback for this event. You can edit it instead.", 'info');
        loadMyFeedback();
        return;
      }
      UI.toast(Api.errorMessage(xhr), 'error');
    });
}

function findMyFeedback(feedbackList) {
  for (let i = 0; i < feedbackList.length; i++) {
    if (feedbackList[i].event_id === eventDetail.id) {
      return feedbackList[i];
    }
  }
  return null;
}

function loadMyFeedback() {
  Api.get('/event-feedback/my-feedback').done(function (response) {
    eventDetail.myFeedback = findMyFeedback(response.data || []);
    eventDetail.editingFeedback = false;
    renderFeedback();
  });
}

// Admin panel: edit, delete, attendees and feedback

function adminPanelInnerHtml() {
  const editHref = '../admin/event-form.html?id=' + encodeURIComponent(eventDetail.id);
  return '<div class="flex flex-wrap gap-3">' +
      '<a href="' + editHref + '" class="btn btn-primary">Edit event</a>' +
      '<button type="button" id="delete-event" class="btn btn-danger"><span class="js-button-label">Delete event</span></button>' +
    '</div>' +
    '<div class="mt-8 grid gap-8 lg:grid-cols-2">' +
      '<div>' +
        '<h3 class="mb-3 text-lg font-bold">Who\'s coming <span id="attendee-count" class="font-body text-base font-normal text-ink-soft"></span></h3>' +
        '<div id="attendees"></div>' +
      '</div>' +
      '<div>' +
        '<h3 class="mb-3 text-lg font-bold">Feedback <span id="feedback-count" class="font-body text-base font-normal text-ink-soft"></span></h3>' +
        '<div id="event-feedback-list"></div>' +
      '</div>' +
    '</div>';
}

function renderAttendees(attendees) {
  $('#attendee-count').text('(' + attendees.length + ')');
  if (attendees.length === 0) {
    $('#attendees').html('<p class="text-ink-soft">No one has registered yet.</p>');
    return;
  }
  let html = '<ul class="divide-y divide-line rounded-card border border-line">';
  for (let i = 0; i < attendees.length; i++) {
    html += '<li class="px-4 py-3">' +
        '<p class="font-semibold">' + UI.escapeHtml(attendees[i].full_name) + '</p>' +
        '<p class="text-sm break-all text-ink-soft">' + UI.escapeHtml(attendees[i].email) + '</p>' +
      '</li>';
  }
  $('#attendees').html(html + '</ul>');
}

function averageRating(feedbackList) {
  let total = 0;
  for (let i = 0; i < feedbackList.length; i++) {
    total += feedbackList[i].rating;
  }
  return (total / feedbackList.length).toFixed(1);
}

function renderEventFeedback(feedbackList) {
  $('#feedback-count').text('(' + feedbackList.length + ')');
  if (feedbackList.length === 0) {
    $('#event-feedback-list').html('<p class="text-ink-soft">No feedback yet.</p>');
    return;
  }
  let html = '<p class="mb-3 font-semibold">Average ' + averageRating(feedbackList) + ' out of 5</p>' +
    '<ul class="divide-y divide-line rounded-card border border-line">';
  for (let i = 0; i < feedbackList.length; i++) {
    const item = feedbackList[i];
    html += '<li class="px-4 py-3">' +
        '<p class="flex flex-wrap items-center gap-2">' + starsHtml(item.rating) +
          '<span class="font-semibold">' + UI.escapeHtml(item.full_name) + '</span></p>' +
        (item.comment ? '<p class="mt-1 whitespace-pre-line">' + UI.escapeHtml(item.comment) + '</p>' : '') +
        '<p class="mt-1 text-[0.8125rem] text-ink-soft">' + UI.escapeHtml(UI.timeAgo(item.created_at)) + '</p>' +
      '</li>';
  }
  $('#event-feedback-list').html(html + '</ul>');
}

function loadAdminLists() {
  UI.showSkeleton($('#attendees'), 2);
  UI.showSkeleton($('#event-feedback-list'), 2);

  Api.get('/event-registrations/event/' + encodeURIComponent(eventDetail.id) + '/attendees')
    .done(function (response) { renderAttendees(response.data || []); })
    .fail(function (xhr) { UI.showError($('#attendees'), Api.errorMessage(xhr), loadAdminLists); });

  Api.get('/event-feedback/event/' + encodeURIComponent(eventDetail.id))
    .done(function (response) { renderEventFeedback(response.data || []); })
    .fail(function (xhr) { UI.showError($('#event-feedback-list'), Api.errorMessage(xhr), loadAdminLists); });
}

function deleteEvent() {
  const $button = $('#delete-event');
  UI.setButtonLoading($button, true, 'Deleting...');

  Api.remove('/events/' + encodeURIComponent(eventDetail.id))
    .done(function () {
      UI.setFlash('"' + eventDetail.event.title + '" was deleted.', 'success');
      window.location.href = 'events.html';
    })
    .fail(function (xhr) {
      UI.setButtonLoading($button, false);
      // The database won't delete an event that still has registrations, and sends back a 500
      if (xhr.status === 500) {
        UI.toast('People have registered for this event, so it can\'t be deleted. Edit it instead if details have changed.', 'error');
        return;
      }
      UI.toast(Api.errorMessage(xhr), 'error');
    });
}

// ROLE GUARD: the admin panel is only drawn for admins. Every action in it is checked by the backend too.
function showAdminPanel() {
  if (!Auth.isAdmin()) {
    return;
  }
  $('#admin-panel').html(Cards.adminPanelHtml('admin-heading', 'Manage this event', adminPanelInnerHtml()));
  $('#delete-event').on('click', function () {
    UI.confirm({
      title: 'Delete this event?',
      message: '"' + eventDetail.event.title + '" will be removed for everyone. This can\'t be undone.',
      confirmLabel: 'Delete event',
      cancelLabel: 'Keep it',
      destructive: true
    }, deleteEvent);
  });
  loadAdminLists();
}

// Loading

function showNotFound() {
  $('#event-content').html(
    '<div class="rounded-card border border-line bg-white p-8 text-center">' +
      '<h1 class="mb-2 text-[1.75rem] font-extrabold">We couldn\'t find that event</h1>' +
      '<p class="mb-4 text-ink-soft">It may have been removed, or the link is missing part of its address.</p>' +
      '<a href="events.html" class="btn btn-primary">See all events</a>' +
    '</div>'
  );
}

function loadEvent() {
  if (!eventDetail.id) {
    showNotFound();
    return;
  }
  UI.showSkeleton($('#event-content'), 2);

  $.when(
    Api.get('/events/' + encodeURIComponent(eventDetail.id)),
    Api.get('/event-registrations/my-registrations'),
    Api.get('/event-feedback/my-feedback')
  )
    .done(function (eventResult, registrationsResult, feedbackResult) {
      const event = eventResult[0].data;
      // ROLE GUARD: residents can't open unpublished events by typing the link. Admins can.
      if (event.published === false && !Auth.isAdmin()) {
        showNotFound();
        return;
      }

      eventDetail.event = event;
      eventDetail.registrationStatus = findMyRegistration(registrationsResult[0].data || []);
      eventDetail.myFeedback = findMyFeedback(feedbackResult[0].data || []);

      document.title = event.title + ' · Sunshine 263';
      $('#event-content').html(eventPageHtml(event));
      $('#event-description').text(event.description || 'No description has been added yet.');
      renderRegistrationBox();
      renderFeedback();
      showAdminPanel();

      // "Leave feedback" links end in #feedback, but that section only exists now, so jump to it by hand
      if (window.location.hash === '#feedback') {
        $('#feedback-heading').trigger('focus')[0].scrollIntoView();
      }
    })
    .fail(function (xhr) {
      // A broken or deleted id comes back as 404, or as 500 when it isn't a valid id at all
      if (xhr.status === 404 || xhr.status === 500) {
        showNotFound();
        return;
      }
      UI.showError($('#event-content'), Api.errorMessage(xhr), loadEvent);
    });
}

// ROLE GUARD: any logged-in user can see this page, logged-out people go to login
if (Guards.requireAuth()) {
  Layout.init({ page: 'events', area: 'resident' });
  loadEvent();
}
