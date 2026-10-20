// The Pro page script. The Hobby and Professional switch is two plain links
// (build-site.mjs), so it needs no script.
(function () {
  // Capture mode (?stage), for rendering the hero still.
  if (/[?&]stage\b/.test(location.search)) { document.body.classList.add('stage-only'); document.documentElement.setAttribute('data-theme', 'light'); document.querySelector('.site-header .pill').style.display = 'none'; }
})();
