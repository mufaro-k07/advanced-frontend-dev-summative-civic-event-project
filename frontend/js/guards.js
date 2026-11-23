// Page guards. Call one at the top of each page script, before anything loads.
// These only stop people wandering into the wrong page. The backend checks every request again.
const Guards = {
  // ROLE GUARD: any logged-in user (resident or admin) can pass
  requireAuth: function () {
    if (!Auth.getToken()) {
      Auth.logout('login-required');
      return false;
    }
    if (!Auth.isLoggedIn()) {
      Auth.logout('expired');
      return false;
    }
    return true;
  },

  // ROLE GUARD: only admins get past this point. Residents see the 403 page.
  requireAdmin: function () {
    if (!Guards.requireAuth()) {
      return false;
    }
    if (!Auth.isAdmin()) {
      window.location.replace(Config.pageUrl('pages/forbidden.html'));
      return false;
    }
    return true;
  },

  // ROLE GUARD: login and signup are for logged-out people, so send everyone else to their dashboard
  redirectIfLoggedIn: function () {
    if (!Auth.isLoggedIn()) {
      return false;
    }
    if (Auth.isAdmin()) {
      window.location.replace(Config.pageUrl('admin/dashboard.html'));
    } else {
      window.location.replace(Config.pageUrl('pages/dashboard.html'));
    }
    return true;
  }
};
