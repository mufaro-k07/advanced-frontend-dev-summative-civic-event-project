// Promo detail: the video with captions on from the start, plus a transcript panel

const promoDetail = {
  id: new URLSearchParams(window.location.search).get('id'),
  promo: null,
  captionsUrl: null
};

// Captions

// The backend stores captions as one block of plain text, but <track> needs WebVTT.
// We cut the text into short lines (one sentence, or about 12 words) so each fits on screen.
function splitIntoCaptionLines(text) {
  const sentences = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/);
  const lines = [];
  for (let i = 0; i < sentences.length; i++) {
    const words = sentences[i].split(' ');
    for (let start = 0; start < words.length; start += 12) {
      lines.push(words.slice(start, start + 12).join(' '));
    }
  }
  return lines.filter(function (line) { return line !== ''; });
}

// "00:01:04.500", the time format WebVTT wants
function vttTimestamp(seconds) {
  const pad = function (number, size) { return String(number).padStart(size, '0'); };
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.round((seconds - Math.floor(seconds)) * 1000);
  return pad(hours, 2) + ':' + pad(minutes, 2) + ':' + pad(secs, 2) + '.' + pad(Math.min(millis, 999), 3);
}

// Caption text can't contain "-->", and < and & have to be escaped, or the file breaks
function cleanCaptionText(line) {
  return line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/-->/g, '->');
}

// We don't know when each line is spoken, so the lines are spread evenly across the video
function buildVtt(text, duration) {
  const lines = splitIntoCaptionLines(text);
  const total = isFinite(duration) && duration > 0 ? duration : lines.length * 4;
  const slot = total / Math.max(lines.length, 1);

  let vtt = 'WEBVTT\n\n';
  for (let i = 0; i < lines.length; i++) {
    vtt += (i + 1) + '\n' +
      vttTimestamp(i * slot) + ' --> ' + vttTimestamp((i + 1) * slot) + '\n' +
      cleanCaptionText(lines[i]) + '\n\n';
  }
  return vtt;
}

// Turns the VTT into a temporary file the browser can load, and switches captions on
function addCaptions(video, captionText) {
  if (!captionText) {
    return;
  }
  const blob = new Blob([buildVtt(captionText, video.duration)], { type: 'text/vtt' });
  promoDetail.captionsUrl = URL.createObjectURL(blob);

  const track = document.createElement('track');
  track.kind = 'captions';
  track.label = 'English';
  track.srclang = 'en';
  track.src = promoDetail.captionsUrl;
  track.default = true;
  video.appendChild(track);
  // Captions are on by default, so people don't have to find the CC button
  track.track.mode = 'showing';
}

// Page

function promoPageHtml(promo) {
  return '<div id="promo-status" class="mb-3"></div>' +
    '<h1 class="text-[1.75rem] font-extrabold md:text-[2rem]">' + UI.escapeHtml(promo.title) + '</h1>' +
    '<p class="mt-1 mb-6 text-ink-soft">Shared on ' + UI.escapeHtml(UI.formatDate(promo.created_at)) + '</p>' +

    '<video id="promo-video" controls preload="metadata" playsinline class="w-full rounded-panel bg-ink" aria-describedby="promo-description">' +
      '<source src="' + UI.escapeHtml(promo.video_url) + '" type="video/mp4">' +
      // Only shows in browsers that can't play video at all
      'Your browser can\'t play this video. <a href="' + UI.escapeHtml(promo.video_url) + '" download>Download it instead</a>.' +
    '</video>' +
    '<div id="video-error" class="mt-3 hidden" role="alert">' +
      '<p class="flex items-start gap-2 text-error">' + UI.icons.error + '<span><strong>Error:</strong> Your browser can\'t play this video.</span></p>' +
      '<a href="' + UI.escapeHtml(promo.video_url) + '" download class="font-semibold text-lily-teal underline underline-offset-2">Download the video instead</a>' +
    '</div>' +

    '<div class="mt-4 flex flex-wrap gap-2">' +
      '<button type="button" id="transcript-toggle" class="btn btn-secondary" aria-expanded="false" aria-controls="transcript-panel">Read transcript</button>' +
    '</div>' +
    '<div id="transcript-panel" class="mt-4 hidden rounded-card bg-mist p-5">' +
      '<h2 class="mb-2 text-lg font-bold">Transcript</h2>' +
      '<p id="transcript-text" class="whitespace-pre-line"></p>' +
    '</div>' +

    '<h2 class="mt-8 mb-2 text-2xl font-bold">About this promo</h2>' +
    '<p id="promo-description" class="whitespace-pre-line"></p>' +
    '<div id="admin-panel"></div>';
}

function renderPromoStatus() {
  // ROLE GUARD: only admins see the Published/Draft badge
  $('#promo-status').html(Auth.isAdmin() ? MediaAdmin.statusBadgeHtml(promoDetail.promo) : '');
}

function renderPromoAdminPanel() {
  if (!Auth.isAdmin()) {
    return;
  }
  $('#admin-panel').html(Cards.adminPanelHtml('admin-heading', 'Manage this promo', MediaAdmin.actionsHtml('promo', promoDetail.promo)));
}

function renderPromo() {
  const promo = promoDetail.promo;
  document.title = promo.title + ' · Sunshine 263';
  $('#promo-content').html(promoPageHtml(promo));

  // .text() keeps anything typed by an admin from being read as HTML
  $('#transcript-text').text(promo.caption_text || 'A transcript hasn\'t been added for this promo yet.');
  $('#promo-description').text(promo.description || '');
  renderPromoStatus();
  renderPromoAdminPanel();

  const video = document.getElementById('promo-video');
  // The captions need the video's length to space the lines out, so wait for it
  if (video.readyState >= 1) {
    // A cached video may already know its length
    addCaptions(video, promo.caption_text);
  } else {
    $(video).one('loadedmetadata', function () {
      addCaptions(video, promo.caption_text);
    });
  }
  $(video).find('source').on('error', function () {
    $('#video-error').removeClass('hidden');
  });

  $('#transcript-toggle').on('click', function () {
    const isOpen = $(this).attr('aria-expanded') === 'true';
    $(this).attr('aria-expanded', isOpen ? 'false' : 'true').text(isOpen ? 'Read transcript' : 'Hide transcript');
    $('#transcript-panel').toggleClass('hidden', isOpen);
  });
}

function showNotFound() {
  $('#promo-content').html(
    '<div class="rounded-card bg-white p-8 text-center shadow-sm">' +
      '<h1 class="mb-2 text-[1.75rem] font-extrabold">We couldn\'t find that promo</h1>' +
      '<p class="mb-4 text-ink-soft">It may have been removed, or the link is missing part of its address.</p>' +
      '<a href="promos.html" class="btn btn-primary">See all promos</a>' +
    '</div>'
  );
}

function loadPromo() {
  if (!promoDetail.id) {
    showNotFound();
    return;
  }
  UI.showSkeleton($('#promo-content'), 1);

  Api.get('/promos/' + encodeURIComponent(promoDetail.id))
    .done(function (response) {
      // ROLE GUARD: residents can't open a draft by typing its link. Admins can.
      if (response.data.published === false && !Auth.isAdmin()) {
        showNotFound();
        return;
      }
      promoDetail.promo = response.data;
      renderPromo();
    })
    .fail(function (xhr) {
      // A broken id comes back as 404, or 500 when it isn't a valid id at all
      if (xhr.status === 404 || xhr.status === 500) {
        showNotFound();
        return;
      }
      UI.showError($('#promo-content'), Api.errorMessage(xhr), loadPromo);
    });
}

// ROLE GUARD: any logged-in user can see this page, logged-out people go to login
if (Guards.requireAuth()) {
  Layout.init({ page: 'promos', area: 'resident' });
  loadPromo();

  if (Auth.isAdmin()) {
    MediaAdmin.wire($('#promo-content'), 'promo',
      function (updated) {
        promoDetail.promo = updated;
        renderPromoStatus();
        renderPromoAdminPanel();
        $('#admin-heading').trigger('focus');
      },
      function () {
        UI.setFlash('Promo deleted.', 'success');
        window.location.href = 'promos.html';
      }
    );
  }
}
