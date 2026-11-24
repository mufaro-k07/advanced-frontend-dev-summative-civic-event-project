// Public landing page. Most of it is plain HTML; this just adds the bits that need JavaScript.

// The light version, because the button sits on the hero photo
A11y.mount($('#a11y-slot'), { onPhoto: true });

// "Try the settings" opens the same panel as the button at the top
$('#open-a11y').on('click', function (event) {
  // Stop the click reaching the page, which would close the panel again straight away
  event.stopPropagation();
  A11y.openPanel();
});

$('#footer-year').text(new Date().getFullYear());

// The jacaranda band only makes sense in October and November (getMonth counts January as 0)
const landingMonth = new Date().getMonth();
if (landingMonth === 9 || landingMonth === 10) {
  $('#jacaranda-band').removeClass('hidden').addClass('flex');
}
