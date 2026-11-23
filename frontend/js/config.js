// Settings shared by every page. Change the URLs here if the backend moves.
const Config = {
  API_BASE_URL: 'http://localhost:4000/api',

  // Uploaded images, audio and video are served from here, not from /api
  FILES_BASE_URL: 'http://localhost:4000',

  // Pages sit at three levels (root, pages/, admin/), so links back to
  // login.html or pages/forbidden.html need the right number of "../"
  pageUrl: function (pathFromFrontendRoot) {
    const path = window.location.pathname;
    const inSubfolder = path.indexOf('/pages/') !== -1 || path.indexOf('/admin/') !== -1;
    const prefix = inSubfolder ? '../' : '';
    return prefix + pathFromFrontendRoot;
  }
};
