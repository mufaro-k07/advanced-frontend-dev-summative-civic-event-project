// Admin dashboard (stats and chart come in Stage 4)

// ROLE GUARD: only admins get past this point. The backend checks again anyway.
if (Guards.requireAdmin()) {
  Layout.init({ page: 'admin-dashboard', area: 'admin' });

  const user = Auth.getUser();
  if (user) {
    $('#user-name').text(user.full_name.split(' ')[0]);
  }
}
