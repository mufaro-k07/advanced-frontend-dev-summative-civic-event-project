// Resident dashboard (placeholder until Stage 2)

// ROLE GUARD: any logged-in user can see this page, logged-out people go to login
if (Guards.requireAuth()) {
  const user = Auth.getUser();
  if (user) {
    $('#user-name').text(user.full_name);
  }

  $('#logout-button').on('click', function () {
    Auth.logout('logged-out');
  });
}
