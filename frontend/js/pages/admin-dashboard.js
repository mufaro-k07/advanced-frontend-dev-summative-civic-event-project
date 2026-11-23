// Admin dashboard (placeholder until Stage 4)

// ROLE GUARD: only admins get past this point. The backend checks again anyway.
if (Guards.requireAdmin()) {
  const user = Auth.getUser();
  if (user) {
    $('#user-name').text(user.full_name);
  }

  $('#logout-button').on('click', function () {
    Auth.logout('logged-out');
  });
}
