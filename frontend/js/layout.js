// The parts every logged-in page shares: header, notification bell and drawer,
// profile menu, footer and the admin sidebar. Pages just leave empty slots
// (#site-header, #site-footer, #admin-sidebar) and call Layout.init().
const Layout = {
  notifications: [],
  notificationsRequest: null,

  RESIDENT_LINKS: [
    { key: 'dashboard', label: 'Dashboard', href: 'pages/dashboard.html' },
    { key: 'events', label: 'Events', href: 'pages/events.html' },
    { key: 'my-registrations', label: 'My registrations', href: 'pages/my-registrations.html' },
    { key: 'announcements', label: 'Announcements', href: 'pages/announcements.html' },
    { key: 'promos', label: 'Promos', href: 'pages/promos.html' }
  ],

  ADMIN_MANAGE_LINKS: [
    { key: 'admin-dashboard', label: 'Overview', href: 'admin/dashboard.html' },
    { key: 'admin-event-form', label: 'New event', href: 'admin/event-form.html' },
    { key: 'admin-announcement-form', label: 'New announcement', href: 'admin/announcement-form.html' },
    { key: 'admin-promo-form', label: 'New promo', href: 'admin/promo-form.html' },
    { key: 'admin-users', label: 'Users', href: 'admin/users.html' },
    { key: 'admin-notifications', label: 'Notifications', href: 'admin/notifications.html' }
  ],

  // options.page is the key of the current page, so its link gets highlighted.
  // options.area is 'resident' (top header) or 'admin' (sidebar).
  init: function (options) {
    const area = options.area || 'resident';

    if (area === 'admin') {
      $('#admin-sidebar').replaceWith(Layout.adminSidebarHtml(options.page));
      $('#site-header').replaceWith(Layout.adminTopBarHtml());
    } else {
      $('#site-header').replaceWith(Layout.residentHeaderHtml(options.page));
    }
    $('#site-footer').replaceWith(Layout.footerHtml());
    $('body').append(Layout.drawerHtml());

    A11y.mount($('#a11y-slot'));
    Layout.setupMenuToggle('#menu-button', '#mobile-nav');
    Layout.setupProfileMenu();
    Layout.setupDrawer();
    Layout.loadNotifications();
    UI.showFlash();
  },

  // Small building blocks

  logoHtml: function (homeHref, isLight) {
    const wordmark = isLight ? 'logo-wordmark-light.svg' : 'logo-wordmark.svg';
    return '<a href="' + Config.pageUrl(homeHref) + '" aria-label="Sunshine 263 home" class="inline-flex shrink-0 items-center gap-2 rounded-control">' +
        '<img src="' + Config.pageUrl('assets/images/flame-lily.jpg') + '" alt="" aria-hidden="true" class="h-9 w-9 rounded-full object-cover ring-2 ring-sunshine">' +
        '<img src="' + Config.pageUrl('assets/icons/' + wordmark) + '" alt="" aria-hidden="true" class="h-6 w-auto">' +
      '</a>';
  },

  // aria-current tells screen readers which page they're on, the flame underline shows everyone else
  navLinksHtml: function (links, currentPage, linkClass) {
    let html = '';
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const current = link.key === currentPage ? ' aria-current="page"' : '';
      html += '<li><a href="' + Config.pageUrl(link.href) + '"' + current + ' class="' + linkClass + '">' + link.label + '</a></li>';
    }
    return html;
  },

  // ROLE GUARD: admins get an extra link to their area. Hiding it is only for tidiness,
  // the admin pages check the role themselves.
  residentLinksFor: function () {
    const links = Layout.RESIDENT_LINKS.slice();
    if (Auth.isAdmin()) {
      links.push({ key: 'admin', label: 'Admin', href: 'admin/dashboard.html' });
    }
    return links;
  },

  bellHtml: function () {
    return '<button type="button" id="bell-button" aria-haspopup="dialog" aria-label="Notifications" ' +
        'class="relative inline-flex h-11 w-11 items-center justify-center rounded-control text-lily-teal transition-colors duration-150 hover:bg-mist">' +
        '<svg aria-hidden="true" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>' +
        '<span id="bell-count" aria-hidden="true" class="absolute -top-0.5 -right-0.5 hidden min-w-5 rounded-full bg-flame px-1 text-center text-xs leading-5 font-bold text-white"></span>' +
      '</button>';
  },

  initialsFor: function (fullName) {
    const parts = (fullName || '').trim().split(/\s+/);
    let initials = parts[0] ? parts[0].charAt(0) : '?';
    if (parts.length > 1) {
      initials += parts[parts.length - 1].charAt(0);
    }
    return initials.toUpperCase();
  },

  profileMenuHtml: function (wrapperClass) {
    const user = Auth.getUser() || {};
    const firstName = (user.full_name || 'You').split(' ')[0];
    return '<div id="profile-wrapper" class="relative ' + wrapperClass + '">' +
        '<button type="button" id="profile-button" aria-expanded="false" aria-controls="profile-menu" ' +
          'class="inline-flex min-h-11 items-center gap-2 rounded-control px-2 font-semibold text-ink transition-colors duration-150 hover:bg-mist">' +
          '<span aria-hidden="true" class="flex h-8 w-8 items-center justify-center rounded-full bg-lily-teal text-sm text-white">' + UI.escapeHtml(Layout.initialsFor(user.full_name)) + '</span>' +
          '<span>' + UI.escapeHtml(firstName) + '<span class="sr-only">, account menu</span></span>' +
          '<svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>' +
        '</button>' +
        '<div id="profile-menu" class="absolute top-full right-0 z-40 mt-2 hidden w-64 rounded-card border border-mist bg-white p-2 shadow-sm">' +
          '<div class="border-b border-mist px-3 py-2">' +
            '<p class="font-semibold">' + UI.escapeHtml(user.full_name || '') + '</p>' +
            '<p class="text-[0.8125rem] break-all text-ink-soft">' + UI.escapeHtml(user.email || '') + '</p>' +
          '</div>' +
          '<ul class="pt-2">' +
            '<li><a href="' + Config.pageUrl('pages/profile.html') + '" class="flex min-h-11 items-center rounded-control px-3 hover:bg-mist">Your profile</a></li>' +
            '<li><button type="button" class="js-logout flex min-h-11 w-full items-center rounded-control px-3 text-left hover:bg-mist">Log out</button></li>' +
          '</ul>' +
        '</div>' +
      '</div>';
  },

  menuButtonHtml: function (hideFrom) {
    return '<button type="button" id="menu-button" aria-expanded="false" aria-controls="mobile-nav" ' +
        'class="inline-flex h-11 w-11 items-center justify-center rounded-control text-lily-teal hover:bg-mist ' + hideFrom + '">' +
        '<svg aria-hidden="true" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>' +
        '<span class="sr-only">Menu</span>' +
      '</button>';
  },

  // Resident header

  residentHeaderHtml: function (currentPage) {
    const links = Layout.residentLinksFor();
    const desktopLinkClass = 'inline-flex min-h-11 items-center border-b-[3px] border-transparent px-1 font-semibold text-ink transition-colors duration-150 hover:text-lily-teal aria-[current=page]:border-flame aria-[current=page]:text-lily-teal';
    const mobileLinkClass = 'flex min-h-11 items-center rounded-control border-l-4 border-transparent px-3 font-semibold text-ink hover:bg-mist aria-[current=page]:border-flame aria-[current=page]:bg-mist';

    return '<header class="border-b border-mist bg-white">' +
        '<div class="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-2 md:px-8">' +
          Layout.logoHtml('pages/dashboard.html', false) +
          '<nav aria-label="Main" class="ml-6 hidden lg:block"><ul class="flex gap-5">' + Layout.navLinksHtml(links, currentPage, desktopLinkClass) + '</ul></nav>' +
          '<div class="ml-auto flex items-center gap-1 sm:gap-2">' +
            '<div id="a11y-slot"></div>' +
            Layout.bellHtml() +
            Layout.profileMenuHtml('hidden lg:block') +
            Layout.menuButtonHtml('lg:hidden') +
          '</div>' +
        '</div>' +
        // On phones the links, profile and log out live in this menu instead
        '<nav id="mobile-nav" aria-label="Main" class="hidden border-t border-mist px-4 py-3 lg:hidden">' +
          '<ul class="grid gap-1">' + Layout.navLinksHtml(links, currentPage, mobileLinkClass) +
            '<li class="mt-2 border-t border-mist pt-2"><a href="' + Config.pageUrl('pages/profile.html') + '" class="' + mobileLinkClass + '">Your profile</a></li>' +
            '<li><button type="button" class="js-logout ' + mobileLinkClass + ' w-full text-left">Log out</button></li>' +
          '</ul>' +
        '</nav>' +
      '</header>';
  },

  // Admin sidebar and top bar

  adminSidebarHtml: function (currentPage) {
    const linkClass = 'flex min-h-11 items-center rounded-control border-l-4 border-transparent px-3 font-semibold text-ivory hover:bg-lily-teal aria-[current=page]:border-sunshine aria-[current=page]:bg-lily-teal';
    const browseLinks = [
      { key: 'events', label: 'Events', href: 'pages/events.html' },
      { key: 'announcements', label: 'Announcements', href: 'pages/announcements.html' },
      { key: 'promos', label: 'Promos', href: 'pages/promos.html' }
    ];

    return '<aside class="on-dark bg-teal-deep text-ivory md:sticky md:top-0 md:h-screen md:w-[248px] md:shrink-0 md:overflow-y-auto">' +
        '<div class="flex items-center justify-between gap-2 px-4 py-3 md:px-5 md:py-6">' +
          Layout.logoHtml('admin/dashboard.html', true) +
          '<span class="rounded-full bg-sunshine px-2 py-0.5 text-xs font-bold text-ink">Admin</span>' +
          '<button type="button" id="menu-button" aria-expanded="false" aria-controls="mobile-nav" class="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-control text-ivory hover:bg-lily-teal md:hidden">' +
            '<svg aria-hidden="true" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>' +
            '<span class="sr-only">Menu</span>' +
          '</button>' +
        '</div>' +
        // Always open from md up, a toggle below that
        '<nav id="mobile-nav" aria-label="Admin" class="hidden px-3 pb-6 md:block">' +
          '<p class="px-3 pb-2 text-[0.8125rem] font-semibold tracking-wide text-sunshine uppercase">Manage</p>' +
          '<ul class="grid gap-1">' + Layout.navLinksHtml(Layout.ADMIN_MANAGE_LINKS, currentPage, linkClass) + '</ul>' +
          '<p class="mt-6 px-3 pb-2 text-[0.8125rem] font-semibold tracking-wide text-sunshine uppercase">What residents see</p>' +
          '<ul class="grid gap-1">' + Layout.navLinksHtml(browseLinks, currentPage, linkClass) + '</ul>' +
        '</nav>' +
      '</aside>';
  },

  adminTopBarHtml: function () {
    return '<header class="border-b border-mist bg-white">' +
        '<div class="flex items-center justify-end gap-2 px-4 py-2 md:px-8">' +
          '<div id="a11y-slot"></div>' +
          Layout.bellHtml() +
          Layout.profileMenuHtml('') +
        '</div>' +
      '</header>';
  },

  // Footer

  footerHtml: function () {
    const year = new Date().getFullYear();
    return '<footer class="on-dark mt-16 bg-teal-deep text-ivory">' +
        '<div class="mx-auto grid max-w-[1200px] gap-6 px-4 py-10 md:grid-cols-2 md:px-8">' +
          '<div>' +
            Layout.logoHtml(Auth.isAdmin() ? 'admin/dashboard.html' : 'pages/dashboard.html', true) +
            '<p class="mt-4 font-heading text-2xl font-bold">Harare\'s community, in full <span class="font-accent font-normal italic text-sunshine">bloom</span>.</p>' +
          '</div>' +
          '<div class="text-sm md:text-right">' +
            '<p>263 is Zimbabwe\'s dialling code. Harare is the Sunshine City.</p>' +
            '<p class="mt-2">A student project. Not affiliated with the City of Harare.</p>' +
            '<p class="mt-2">&copy; ' + year + ' Sunshine 263</p>' +
          '</div>' +
        '</div>' +
      '</footer>';
  },

  // Menus

  // Phone menu: a simple show/hide button
  setupMenuToggle: function (buttonSelector, menuSelector) {
    $(buttonSelector).on('click', function () {
      const isOpen = $(this).attr('aria-expanded') === 'true';
      $(this).attr('aria-expanded', isOpen ? 'false' : 'true');
      $(menuSelector).toggleClass('hidden', isOpen);
    });
  },

  setupProfileMenu: function () {
    const $button = $('#profile-button');
    const $menu = $('#profile-menu');

    function closeMenu(returnFocus) {
      $menu.addClass('hidden');
      $button.attr('aria-expanded', 'false');
      if (returnFocus) {
        $button.trigger('focus');
      }
    }

    $button.on('click', function () {
      const isOpen = $button.attr('aria-expanded') === 'true';
      if (isOpen) {
        closeMenu(false);
      } else {
        $menu.removeClass('hidden');
        $button.attr('aria-expanded', 'true');
      }
    });

    $('#profile-wrapper').on('keydown', function (event) {
      if (event.key === 'Escape' && $button.attr('aria-expanded') === 'true') {
        closeMenu(true);
      }
    });

    $(document).on('click', function (event) {
      if ($('#profile-wrapper').length && !$('#profile-wrapper')[0].contains(event.target)) {
        closeMenu(false);
      }
    });

    $(document).on('click', '.js-logout', function () {
      Auth.logout('logged-out');
    });
  },

  // Notifications: read tracking
  // The backend has no "mark as read", so we remember read IDs on this device, per user

  readStorageKey: function () {
    const user = Auth.getUser();
    return 'sunshine_read_' + (user ? user.id : 'unknown');
  },

  getReadIds: function () {
    try {
      return JSON.parse(window.localStorage.getItem(Layout.readStorageKey())) || [];
    } catch (err) {
      return [];
    }
  },

  markAsRead: function (ids) {
    const readIds = Layout.getReadIds();
    for (let i = 0; i < ids.length; i++) {
      if (readIds.indexOf(ids[i]) === -1) {
        readIds.push(ids[i]);
      }
    }
    try {
      window.localStorage.setItem(Layout.readStorageKey(), JSON.stringify(readIds));
    } catch (err) {
      // Without storage everything just stays unread
    }
    Layout.updateBell();
    // Lets pages that show an unread count (dashboard, inbox) update themselves
    $(document).trigger('notifications:read');
  },

  isRead: function (id) {
    return Layout.getReadIds().indexOf(id) !== -1;
  },

  countUnread: function (notifications) {
    let count = 0;
    for (let i = 0; i < notifications.length; i++) {
      if (!Layout.isRead(notifications[i].id)) {
        count++;
      }
    }
    return count;
  },

  // Notifications: where each one points
  // The backend tags each notification with a type and puts the related id in metadata

  NOTIFICATION_TYPES: {
    event: { label: 'Event', idKey: 'event_id', page: 'pages/event.html', linkText: 'Go to the event' },
    announcement: { label: 'Announcement', idKey: 'announcement_id', page: 'pages/announcement.html', linkText: 'Listen to the announcement' },
    promo: { label: 'Promo', idKey: 'promo_id', page: 'pages/promo.html', linkText: 'Watch the promo' }
  },

  notificationTypeLabel: function (notification) {
    const type = Layout.NOTIFICATION_TYPES[notification.type];
    return type ? type.label : 'Update';
  },

  // Returns { href, text } for the item a notification is about, or null if there isn't one
  relatedLinkFor: function (notification) {
    const type = Layout.NOTIFICATION_TYPES[notification.type];
    const metadata = notification.metadata || {};
    if (!type || !metadata[type.idKey]) {
      return null;
    }
    return {
      href: Config.pageUrl(type.page + '?id=' + encodeURIComponent(metadata[type.idKey])),
      text: type.linkText
    };
  },

  // Notifications: bell and drawer

  loadNotifications: function () {
    UI.showSkeleton($('#drawer-list'), 3);
    Layout.notificationsRequest = Api.get('/notifications');
    Layout.notificationsRequest
      .done(function (response) {
        Layout.notifications = response.data || [];
        Layout.updateBell();
        Layout.renderDrawerList();
      })
      .fail(function (xhr) {
        UI.showError($('#drawer-list'), Api.errorMessage(xhr), Layout.loadNotifications);
      });
  },

  // The bell's label says the count, because the red number is hidden from screen readers
  updateBell: function () {
    const unread = Layout.countUnread(Layout.notifications);
    const $count = $('#bell-count');
    if (unread > 0) {
      $count.text(unread > 99 ? '99+' : unread).removeClass('hidden');
      $('#bell-button').attr('aria-label', 'Notifications, ' + unread + ' unread');
    } else {
      $count.addClass('hidden');
      $('#bell-button').attr('aria-label', 'Notifications, none unread');
    }
  },

  drawerHtml: function () {
    return '<div id="drawer-backdrop" class="fixed inset-0 z-40 hidden bg-ink/40" aria-hidden="true"></div>' +
      '<div id="notification-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" ' +
        'class="drawer fixed inset-y-0 right-0 z-50 hidden w-full max-w-sm flex-col bg-white shadow-sm">' +
        '<div class="flex items-center justify-between border-b border-mist px-5 py-4">' +
          '<h2 id="drawer-title" class="text-2xl font-bold">Notifications</h2>' +
          '<button type="button" id="drawer-close" class="inline-flex h-11 w-11 items-center justify-center rounded-control text-ink hover:bg-mist">' +
            '<svg aria-hidden="true" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
            '<span class="sr-only">Close notifications</span>' +
          '</button>' +
        '</div>' +
        '<div id="drawer-list" class="flex-1 overflow-y-auto px-5 py-4"></div>' +
        '<div class="flex flex-wrap items-center justify-between gap-2 border-t border-mist px-5 py-4">' +
          '<button type="button" id="drawer-mark-all" class="btn btn-secondary">Mark all as read</button>' +
          '<a href="' + Config.pageUrl('pages/notifications.html') + '" class="font-semibold text-lily-teal underline underline-offset-2">See all</a>' +
        '</div>' +
      '</div>';
  },

  renderDrawerList: function () {
    const $list = $('#drawer-list');
    const latest = Layout.notifications.slice(0, 8);

    if (latest.length === 0) {
      UI.showEmpty($list, 'All quiet for now', "When a new event or promo goes up, you'll see it here.");
      return;
    }

    let html = '<ul class="grid gap-2">';
    for (let i = 0; i < latest.length; i++) {
      html += Layout.drawerItemHtml(latest[i]);
    }
    html += '</ul>';
    $list.html(html);
  },

  // Unread items get a dot, bold text and the word "Unread" for screen readers
  drawerItemHtml: function (notification) {
    const unread = !Layout.isRead(notification.id);
    const href = Config.pageUrl('pages/notification.html?id=' + encodeURIComponent(notification.id));
    return '<li>' +
        '<a href="' + href + '" class="flex gap-3 rounded-card p-3 hover:bg-mist ' + (unread ? 'bg-ivory' : '') + '">' +
          '<span aria-hidden="true" class="mt-2 h-2.5 w-2.5 shrink-0 rounded-full ' + (unread ? 'bg-flame' : 'bg-transparent') + '"></span>' +
          '<span class="min-w-0">' +
            '<span class="block ' + (unread ? 'font-semibold' : '') + '">' + (unread ? '<span class="sr-only">Unread: </span>' : '') + UI.escapeHtml(notification.title) + '</span>' +
            '<span class="block text-sm text-ink-soft">' + UI.escapeHtml(notification.message) + '</span>' +
            '<span class="block text-[0.8125rem] text-ink-soft">' + UI.escapeHtml(UI.timeAgo(notification.created_at)) + '</span>' +
          '</span>' +
        '</a>' +
      '</li>';
  },

  openDrawer: function () {
    const $drawer = $('#notification-drawer');
    $('#drawer-backdrop').removeClass('hidden');
    $drawer.removeClass('hidden').addClass('flex');
    // Wait one frame so the slide-in transition has a starting point
    window.requestAnimationFrame(function () {
      $drawer.addClass('is-open');
    });
    $('body').addClass('overflow-hidden');
    UI.trapFocus($drawer);
    $('#drawer-close').trigger('focus');
  },

  closeDrawer: function () {
    const $drawer = $('#notification-drawer');
    $drawer.removeClass('is-open');
    UI.releaseFocus($drawer);
    $('body').removeClass('overflow-hidden');

    const delay = A11y.prefersReducedMotion() ? 0 : 200;
    setTimeout(function () {
      $drawer.addClass('hidden').removeClass('flex');
      $('#drawer-backdrop').addClass('hidden');
    }, delay);

    // Send focus back to the bell so keyboard users carry on where they were
    $('#bell-button').trigger('focus');
  },

  setupDrawer: function () {
    $('#bell-button').on('click', Layout.openDrawer);
    $('#drawer-close').on('click', Layout.closeDrawer);
    $('#drawer-backdrop').on('click', Layout.closeDrawer);

    $('#notification-drawer').on('keydown', function (event) {
      if (event.key === 'Escape') {
        Layout.closeDrawer();
      }
    });

    $('#drawer-mark-all').on('click', function () {
      const ids = [];
      for (let i = 0; i < Layout.notifications.length; i++) {
        ids.push(Layout.notifications[i].id);
      }
      Layout.markAsRead(ids);
      Layout.renderDrawerList();
      UI.toast('All notifications marked as read.', 'success');
    });
  }
};
