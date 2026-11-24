// Admin: every service request, with a status filter. The table itself comes from service-requests.js.

function requestCountText(count, status) {
  const noun = count === 1 ? 'request' : 'requests';
  if (!status) {
    return count + ' ' + noun;
  }
  return count + ' ' + noun + ' marked ' + ServiceRequestTable.findStatus(status).label;
}

// The filter goes to the backend as ?status=, so only matching requests come back
function loadRequests() {
  const status = $('#status-filter').val();
  const $list = $('#request-list');
  const path = status ? '/service-requests?status=' + encodeURIComponent(status) : '/service-requests';
  $('#results-summary').text('');
  UI.showSkeleton($list, 3);

  Api.get(path)
    .done(function (response) {
      const requests = response.data || [];
      $('#results-summary').text(requestCountText(requests.length, status));
      if (requests.length === 0) {
        const nextStep = status ? 'Try a different status.' : 'When a resident reports a problem, it shows up here.';
        UI.showEmpty($list, 'No requests here', nextStep);
        return;
      }
      $list.html(ServiceRequestTable.tableHtml(requests));
    })
    .fail(function (xhr) {
      UI.showError($list, Api.errorMessage(xhr), loadRequests);
    });
}

// ROLE GUARD: only admins get past this point. The backend checks again anyway.
if (Guards.requireAdmin()) {
  Layout.init({ page: 'admin-service-requests', area: 'admin' });
  ServiceRequestTable.setupStatusDropdowns($('#request-list'));
  $('#status-filter').on('change', loadRequests);
  loadRequests();
}
