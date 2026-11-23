// Keeps track of who is logged in.
// "Remember me" saves the login in localStorage so it survives closing the browser.
// Without it we use sessionStorage, which is wiped when the tab closes.
const Auth = {
  TOKEN_KEY: 'sunshine_token',
  USER_KEY: 'sunshine_user',

  save: function (token, user, rememberMe) {
    Auth.clear();
    const store = rememberMe ? window.localStorage : window.sessionStorage;
    try {
      store.setItem(Auth.TOKEN_KEY, token);
      store.setItem(Auth.USER_KEY, JSON.stringify(user));
    } catch (err) {
      // Private windows can block storage. The user will just have to log in again.
      console.warn('Could not save the login', err);
    }
  },

  getToken: function () {
    return Auth.readFromEitherStore(Auth.TOKEN_KEY);
  },

  getUser: function () {
    const saved = Auth.readFromEitherStore(Auth.USER_KEY);
    if (!saved) {
      return null;
    }
    try {
      return JSON.parse(saved);
    } catch (err) {
      return null;
    }
  },

  // Look in sessionStorage first, then localStorage
  readFromEitherStore: function (key) {
    try {
      return window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  },

  clear: function () {
    try {
      window.sessionStorage.removeItem(Auth.TOKEN_KEY);
      window.sessionStorage.removeItem(Auth.USER_KEY);
      window.localStorage.removeItem(Auth.TOKEN_KEY);
      window.localStorage.removeItem(Auth.USER_KEY);
    } catch (err) {
      // Nothing to clear if storage is blocked
    }
  },

  // The middle part of a JWT is base64 JSON holding { id, role, exp }
  readTokenPayload: function (token) {
    try {
      const middle = token.split('.')[1];
      const base64 = middle.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch (err) {
      return null;
    }
  },

  // Tokens die after an hour, so check the time before trusting one
  isTokenExpired: function (token) {
    const payload = Auth.readTokenPayload(token);
    if (!payload || !payload.exp) {
      return true;
    }
    const nowInSeconds = Date.now() / 1000;
    return payload.exp <= nowInSeconds;
  },

  isLoggedIn: function () {
    const token = Auth.getToken();
    return Boolean(token) && !Auth.isTokenExpired(token);
  },

  // Read the role from the token, not the saved user, so editing storage by hand doesn't help
  getRole: function () {
    const token = Auth.getToken();
    const payload = token ? Auth.readTokenPayload(token) : null;
    return payload ? payload.role : null;
  },

  isAdmin: function () {
    return Auth.getRole() === 'admin';
  },

  // reason ends up in the URL so the login page can say why they were sent back
  logout: function (reason) {
    Auth.clear();
    let url = Config.pageUrl('login.html');
    if (reason) {
      url += '?reason=' + encodeURIComponent(reason);
    }
    window.location.replace(url);
  }
};
