// 403 page: where people land when they open a page their role can't use

// ROLE GUARD: logged-out people go to login instead, since they might have access once they log in
if (Guards.requireAuth()) {
  Layout.init({ page: '', area: 'resident' });
  $('#home-link').attr('href', Auth.homePageFor(Auth.getRole()));
}
