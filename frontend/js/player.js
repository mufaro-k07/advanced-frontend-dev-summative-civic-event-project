// Our own audio player for announcements. A hidden <audio> does the actual playing,
// and these buttons and the seek bar drive it, so it looks the same in every browser
// and works fully with a keyboard and screen reader.
const Player = {
  PLAY_ICON: '<svg aria-hidden="true" class="h-1/2 w-1/2" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.9-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z"/></svg>',
  PAUSE_ICON: '<svg aria-hidden="true" class="h-1/2 w-1/2" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',

  NO_TRANSCRIPT: "A transcript hasn't been added for this announcement yet.",

  // Time helpers

  // "1:04"
  clockTime: function (seconds) {
    if (!isFinite(seconds)) {
      return '-:--';
    }
    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60);
    const rest = whole % 60;
    return minutes + ':' + String(rest).padStart(2, '0');
  },

  // "1 minute 4 seconds". Screen readers say this instead of "1:04".
  spokenTime: function (seconds) {
    if (!isFinite(seconds)) {
      return 'unknown length';
    }
    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60);
    const rest = whole % 60;
    const parts = [];
    if (minutes > 0) {
      parts.push(minutes + (minutes === 1 ? ' minute' : ' minutes'));
    }
    if (rest > 0 || minutes === 0) {
      parts.push(rest + (rest === 1 ? ' second' : ' seconds'));
    }
    return parts.join(' ');
  },

  // Only one announcement plays at a time, so starting one pauses the rest
  pauseOthers: function (currentAudio) {
    $('audio').each(function () {
      if (this !== currentAudio) {
        this.pause();
      }
    });
  },

  detailUrl: function (announcement) {
    return Config.pageUrl('pages/announcement.html?id=' + encodeURIComponent(announcement.id));
  },

  // Markup

  // The big player for the detail page
  fullHtml: function (announcement) {
    const uid = 'player-' + announcement.id;
    return '<div class="js-player card-border rounded-panel border border-line bg-white p-5 md:p-6" data-label="announcement">' +
        '<audio preload="metadata" src="' + UI.escapeHtml(announcement.audio_url) + '"></audio>' +
        '<div class="flex items-center gap-4">' +
          '<button type="button" class="js-play flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-lily-teal text-white transition-colors duration-150 hover:bg-teal-deep" aria-label="Play announcement">' + Player.PLAY_ICON + '</button>' +
          '<div class="min-w-0 flex-1">' +
            '<input type="range" class="js-seek h-11 w-full cursor-pointer accent-lily-teal" min="0" max="0" step="0.1" value="0" aria-label="Seek" aria-valuetext="0 seconds of unknown length">' +
            '<p class="js-time text-sm text-ink-soft" aria-hidden="true">0:00 / -:--</p>' +
          '</div>' +
        '</div>' +
        '<div class="mt-4 flex flex-wrap gap-2">' +
          '<button type="button" class="js-back btn btn-secondary">' +
            '<svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9.2 4.3a.75.75 0 0 1 0 1.06L5.56 9h10.69a.75.75 0 0 1 0 1.5H5.56l3.64 3.64a.75.75 0 1 1-1.06 1.06l-4.92-4.92a.75.75 0 0 1 0-1.06l4.92-4.92a.75.75 0 0 1 1.06 0Z"/></svg>' +
            'Back 10 seconds</button>' +
          '<button type="button" class="js-forward btn btn-secondary">Forward 10 seconds' +
            '<svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.8 4.3a.75.75 0 0 0 0 1.06L14.44 9H3.75a.75.75 0 0 0 0 1.5h10.69l-3.64 3.64a.75.75 0 1 0 1.06 1.06l4.92-4.92a.75.75 0 0 0 0-1.06L11.86 4.3a.75.75 0 0 0-1.06 0Z"/></svg>' +
          '</button>' +
          '<button type="button" class="js-transcript-toggle btn btn-secondary" aria-expanded="false" aria-controls="' + uid + '-transcript">Read transcript</button>' +
          '<button type="button" class="js-share btn btn-secondary">Share</button>' +
        '</div>' +
        '<div id="' + uid + '-transcript" class="js-transcript-panel mt-4 hidden rounded-card bg-mist p-4">' +
          '<h2 class="mb-1 text-lg font-bold">Transcript</h2>' +
          Player.transcriptHtml(announcement) +
        '</div>' +
        Player.fallbackHtml(announcement) +
      '</div>';
  },

  // whitespace-pre-line keeps the line breaks from the admin form, and .escapeHtml keeps it plain text
  transcriptHtml: function (announcement) {
    if (!Player.hasTranscript(announcement)) {
      return '<p>' + Player.NO_TRANSCRIPT + '</p>';
    }
    return '<p class="whitespace-pre-line">' + UI.escapeHtml(announcement.transcript.trim()) + '</p>';
  },

  hasTranscript: function (announcement) {
    return Boolean(announcement.transcript && announcement.transcript.trim());
  },

  // The small player for each card on the list page.
  // extraHtml is anything else the card needs, like admin badges and buttons.
  compactHtml: function (announcement, extraHtml) {
    return '<article class="js-player card-border flex flex-col gap-4 rounded-card border border-line bg-white p-5 sm:flex-row sm:items-center" data-label="' + UI.escapeHtml(announcement.title) + '">' +
        '<audio preload="metadata" src="' + UI.escapeHtml(announcement.audio_url) + '"></audio>' +
        '<button type="button" class="js-play flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-lily-teal text-white transition-colors duration-150 hover:bg-teal-deep" aria-label="Play ' + UI.escapeHtml(announcement.title) + '">' + Player.PLAY_ICON + '</button>' +
        '<div class="min-w-0 flex-1">' +
          '<h3 class="text-lg font-bold"><a href="' + Player.detailUrl(announcement) + '" class="rounded-control hover:underline">' + UI.escapeHtml(announcement.title) + '</a></h3>' +
          '<p class="flex flex-wrap items-center gap-x-1 text-sm text-ink-soft"><span class="js-duration">Checking length...</span> · ' + UI.escapeHtml(UI.formatDate(announcement.created_at)) +
            // Only rows that really have a transcript get the label
            (Player.hasTranscript(announcement) ? ' <span class="ml-1 inline-flex rounded-full bg-mist px-2.5 py-0.5 text-[0.8125rem] font-semibold text-ink">Transcript</span>' : '') +
          '</p>' +
          // A thin progress line. The detail page has the real seek bar, so this one is just a picture.
          '<div aria-hidden="true" class="mt-2 h-1.5 overflow-hidden rounded-full bg-mist"><div class="js-progress h-1.5 w-0 rounded-full bg-lily-teal"></div></div>' +
          Player.fallbackHtml(announcement) +
        '</div>' +
        (extraHtml || '') +
      '</article>';
  },

  fallbackHtml: function (announcement) {
    return '<div class="js-fallback mt-3 hidden text-sm" role="alert">' +
        '<p class="flex items-start gap-2 text-error">' + UI.icons.error + '<span><strong>Error:</strong> Your browser can\'t play this audio.</span></p>' +
        '<a href="' + UI.escapeHtml(announcement.audio_url) + '" download class="font-semibold text-lily-teal underline underline-offset-2">Download the audio instead</a>' +
      '</div>';
  },

  // Wiring

  // Finds every player inside $root and makes its buttons work
  wire: function ($root) {
    $root.find('.js-player').each(function () {
      Player.wireOne($(this));
    });
  },

  wireOne: function ($player) {
    const audio = $player.find('audio')[0];
    const $play = $player.find('.js-play');
    const $seek = $player.find('.js-seek');
    const label = $player.attr('data-label');

    function showPlaying(isPlaying) {
      $play.html(isPlaying ? Player.PAUSE_ICON : Player.PLAY_ICON);
      $play.attr('aria-label', (isPlaying ? 'Pause ' : 'Play ') + label);
    }

    function showTime() {
      const current = audio.currentTime;
      const total = audio.duration;
      $player.find('.js-time').text(Player.clockTime(current) + ' / ' + Player.clockTime(total));
      $seek.val(current).attr('aria-valuetext', Player.spokenTime(current) + ' of ' + Player.spokenTime(total));
      if (isFinite(total) && total > 0) {
        // The width follows the audio, so it has to be an inline style
        $player.find('.js-progress').css('width', (current / total) * 100 + '%');
      }
    }

    function skip(seconds) {
      if (!isFinite(audio.duration)) {
        return;
      }
      audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration);
    }

    $play.on('click', function () {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    });

    // No length comes from the backend, so we read it off the audio once it loads
    $(audio).on('loadedmetadata', function () {
      $seek.attr('max', isFinite(audio.duration) ? audio.duration : 0);
      $player.find('.js-duration').text(isFinite(audio.duration) ? 'Length ' + Player.clockTime(audio.duration) : 'Length unknown');
      showTime();
    });

    $(audio).on('play', function () {
      Player.pauseOthers(audio);
      showPlaying(true);
    });
    $(audio).on('pause ended', function () {
      showPlaying(false);
    });
    $(audio).on('timeupdate', showTime);

    // The file is missing or in a format this browser can't play
    $(audio).on('error', function () {
      $player.find('.js-fallback').removeClass('hidden');
      $play.prop('disabled', true).addClass('opacity-60');
      $player.find('.js-duration').text('Can\'t play here');
    });

    // Dragging or clicking the bar jumps to that point
    $seek.on('input', function () {
      audio.currentTime = parseFloat($seek.val());
    });

    // Arrow keys jump 5 seconds at a time, which is easier to follow than tiny steps
    $seek.on('keydown', function (event) {
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault();
        skip(5);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault();
        skip(-5);
      }
    });

    $player.find('.js-back').on('click', function () { skip(-10); });
    $player.find('.js-forward').on('click', function () { skip(10); });

    $player.find('.js-transcript-toggle').on('click', function () {
      const isOpen = $(this).attr('aria-expanded') === 'true';
      $(this).attr('aria-expanded', isOpen ? 'false' : 'true').text(isOpen ? 'Read transcript' : 'Hide transcript');
      $player.find('.js-transcript-panel').toggleClass('hidden', isOpen);
    });

    $player.find('.js-share').on('click', function () {
      Player.copyLink(window.location.href);
    });
  },

  copyLink: function (url) {
    if (!navigator.clipboard) {
      UI.toast('Copying isn\'t available in this browser. The link is: ' + url, 'info');
      return;
    }
    navigator.clipboard.writeText(url)
      .then(function () {
        UI.toast('Link copied', 'success');
      })
      .catch(function () {
        UI.toast('We couldn\'t copy the link. You can copy it from the address bar instead.', 'error');
      });
  }
};
