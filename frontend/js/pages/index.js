// The front door. Logged-in people go to their dashboard, everyone else to login.
// No jQuery here because this page only redirects.

// ROLE GUARD: the role in the token decides which dashboard opens
if (Auth.isLoggedIn()) {
  window.location.replace(Auth.homePageFor(Auth.getRole()));
} else {
  Auth.clear();
  window.location.replace('login.html');
}
