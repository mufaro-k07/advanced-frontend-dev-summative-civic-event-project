// One place for every call to the backend. Adds the token and deals with
// expired logins, forbidden pages and a server that isn't running.
// Every method returns the jQuery request, so pages can chain .done() and .fail().
const Api = {
  request: function (method, path, body, isFormData) {
    const token = Auth.getToken();
    const settings = {
      url: Config.API_BASE_URL + path,
      method: method,
      dataType: 'json',
      headers: {}
    };

    if (token) {
      settings.headers.Authorization = 'Bearer ' + token;
    }

    if (isFormData) {
      // Let the browser set the multipart boundary itself
      settings.data = body;
      settings.processData = false;
      settings.contentType = false;
    } else if (body) {
      settings.data = JSON.stringify(body);
      settings.contentType = 'application/json';
    }

    const request = $.ajax(settings);
    request.fail(function (xhr) {
      Api.handleAuthErrors(xhr, Boolean(token));
    });
    return request;
  },

  get: function (path) {
    return Api.request('GET', path);
  },

  post: function (path, body) {
    return Api.request('POST', path, body);
  },

  put: function (path, body) {
    return Api.request('PUT', path, body);
  },

  patch: function (path, body) {
    return Api.request('PATCH', path, body);
  },

  remove: function (path) {
    return Api.request('DELETE', path);
  },

  // For forms with a file (event image, announcement audio, promo video)
  upload: function (method, path, formData) {
    return Api.request(method, path, formData, true);
  },

  handleAuthErrors: function (xhr, sentToken) {
    // A wrong password on the login page is also a 401, so only log out
    // when we actually sent a token and the server rejected it
    if (xhr.status === 401 && sentToken) {
      Auth.logout('expired');
      return;
    }
    // ROLE GUARD: the backend said this account isn't allowed here, so show the 403 page
    if (xhr.status === 403) {
      window.location.replace(Config.pageUrl('pages/forbidden.html'));
    }
  },

  // Turns any failed request into a sentence we can show the user.
  // Validation errors come with field set to undefined, so we only use message.
  errorMessage: function (xhr) {
    if (xhr.status === 0) {
      return "We can't reach the server right now. Check that it's running and try again.";
    }
    if (xhr.responseJSON && xhr.responseJSON.message) {
      const json = xhr.responseJSON;
      if (json.errors && json.errors.length > 0 && json.errors[0].message) {
        return json.errors[0].message;
      }
      return json.message;
    }
    if (xhr.status >= 500) {
      return 'Something went wrong on our side. Please try again in a moment.';
    }
    return 'Something went wrong. Please try again.';
  }
};
