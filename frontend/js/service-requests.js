// The service requests table with a status dropdown on every row.
// The admin dashboard and the full service requests page both use this, so it lives in one place.
const ServiceRequestTable = {
  // Each status has its own colour, and the word is always there too
  STATUSES: [
    { value: 'submitted', label: 'Submitted', toneClass: 'border-warning bg-sunshine/15 text-warning' },
    { value: 'in_progress', label: 'In progress', toneClass: 'border-lily-teal bg-mist text-lily-teal' },
    { value: 'resolved', label: 'Resolved', toneClass: 'border-success bg-success/10 text-success' }
  ],

  findStatus: function (value) {
    for (let i = 0; i < ServiceRequestTable.STATUSES.length; i++) {
      if (ServiceRequestTable.STATUSES[i].value === value) {
        return ServiceRequestTable.STATUSES[i];
      }
    }
    return ServiceRequestTable.STATUSES[0];
  },

  allToneClasses: function () {
    const classes = [];
    for (let i = 0; i < ServiceRequestTable.STATUSES.length; i++) {
      classes.push(ServiceRequestTable.STATUSES[i].toneClass);
    }
    return classes.join(' ');
  },

  selectHtml: function (request) {
    const status = ServiceRequestTable.findStatus(request.status);
    const selectId = 'status-' + UI.escapeHtml(request.id);
    let options = '';
    for (let i = 0; i < ServiceRequestTable.STATUSES.length; i++) {
      const option = ServiceRequestTable.STATUSES[i];
      const selected = option.value === status.value ? ' selected' : '';
      options += '<option value="' + option.value + '"' + selected + '>' + option.label + '</option>';
    }
    return '<label for="' + selectId + '" class="sr-only">Status for ' + UI.escapeHtml(request.title) + '</label>' +
      '<select id="' + selectId + '" data-id="' + UI.escapeHtml(request.id) + '" data-current="' + status.value + '" ' +
        'class="js-status-select h-11 cursor-pointer rounded-control border-2 px-3 text-[0.8125rem] font-bold disabled:cursor-wait disabled:opacity-60 ' + status.toneClass + '">' +
        options +
      '</select>';
  },

  rowHtml: function (request) {
    const sent = new Date(request.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return '<tr class="border-t border-line align-top">' +
        '<td class="px-2 py-3 font-semibold">' + UI.escapeHtml(request.title) +
          '<span class="block text-[0.8125rem] font-normal text-ink-soft">' + UI.escapeHtml(request.location) + '</span></td>' +
        '<td class="px-2 py-3">' + UI.escapeHtml(request.service_type) + '</td>' +
        '<td class="px-2 py-3">' + UI.escapeHtml(request.full_name) +
          '<span class="block text-[0.8125rem] break-all text-ink-soft">' + UI.escapeHtml(request.email) + '</span></td>' +
        '<td class="px-2 py-3 whitespace-nowrap text-ink-soft">' + UI.escapeHtml(sent) + '</td>' +
        '<td class="px-2 py-3">' + ServiceRequestTable.selectHtml(request) + '</td>' +
      '</tr>';
  },

  // The region can be scrolled sideways with the keyboard on small screens, so it gets a label and tabindex
  tableHtml: function (requests) {
    let rows = '';
    for (let i = 0; i < requests.length; i++) {
      rows += ServiceRequestTable.rowHtml(requests[i]);
    }
    return '<div role="region" aria-label="Service requests table" tabindex="0" class="overflow-x-auto">' +
        '<table class="w-full min-w-[640px] border-collapse text-[0.9375rem]">' +
          '<caption class="sr-only">Service requests, newest first</caption>' +
          '<thead><tr class="text-left text-[0.8125rem] text-ink-soft">' +
            '<th scope="col" class="px-2 py-2.5">Request</th>' +
            '<th scope="col" class="px-2 py-2.5">Type</th>' +
            '<th scope="col" class="px-2 py-2.5">Resident</th>' +
            '<th scope="col" class="px-2 py-2.5">Sent</th>' +
            '<th scope="col" class="px-2 py-2.5">Status</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>';
  },

  setTone: function ($select, value) {
    $select.removeClass(ServiceRequestTable.allToneClasses()).addClass(ServiceRequestTable.findStatus(value).toneClass);
  },

  // Changing a dropdown saves straight away. If the save fails, the dropdown goes back to what it was.
  // onChanged(id, newStatus) lets the page update anything else, like the open requests count.
  setupStatusDropdowns: function ($container, onChanged) {
    $container.on('change', '.js-status-select', function () {
      const $select = $(this);
      const id = $select.data('id');
      const previous = $select.data('current');
      const next = $select.val();
      const label = ServiceRequestTable.findStatus(next).label;

      ServiceRequestTable.setTone($select, next);
      $select.prop('disabled', true);

      // ROLE GUARD: only admins can change a status. The backend refuses anyone else with a 403.
      Api.patch('/service-requests/' + encodeURIComponent(id) + '/status', { status: next })
        .done(function () {
          $select.data('current', next);
          UI.toast('Status changed to ' + label + '. The resident gets a notification.', 'success');
          if (onChanged) {
            onChanged(id, next);
          }
        })
        .fail(function (xhr) {
          $select.val(previous);
          ServiceRequestTable.setTone($select, previous);
          UI.toast("The status didn't change. " + Api.errorMessage(xhr), 'error');
        })
        .always(function () {
          $select.prop('disabled', false).trigger('focus');
        });
    });
  }
};
