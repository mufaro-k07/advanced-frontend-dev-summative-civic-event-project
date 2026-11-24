// Runs in the <head> of the landing page, before anything is drawn.
// Logged-in people skip the landing page and go straight to their dashboard.

// ROLE GUARD: the role in the token decides which dashboard opens
if (Auth.isLoggedIn()) {
  window.location.replace(Auth.homePageFor(Auth.getRole()));
} else {
  // Clears out an old expired login, so the next page doesn't trip over it
  Auth.clear();
}
