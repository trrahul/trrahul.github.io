/**
 * Connected Notes popup for mobile devices
 */

document.addEventListener('DOMContentLoaded', function() {
  const $trigger = document.getElementById('backlinks-solo-trigger');
  const $popup = document.getElementById('backlinks-popup');
  const $btnClose = document.getElementById('backlinks-popup-close');

  if (!$trigger || !$popup || !$btnClose) {
    return; // No backlinks on this page
  }

  const SCROLL_LOCK = 'overflow-hidden';
  const CLOSING = 'closing';

  function showPopup() {
    lockScroll(true);
    $popup.showModal();
  }

  function hidePopup() {
    $popup.toggleAttribute(CLOSING);

    $popup.addEventListener(
      'animationend',
      () => {
        $popup.toggleAttribute(CLOSING);
        $popup.close();
      },
      { once: true }
    );

    lockScroll(false);
  }

  function lockScroll(enable) {
    document.documentElement.classList.toggle(SCROLL_LOCK, enable);
    document.body.classList.toggle(SCROLL_LOCK, enable);
  }

  function clickBackdrop(event) {
    if ($popup.hasAttribute(CLOSING)) {
      return;
    }

    const rect = event.target.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      hidePopup();
    }
  }

  // Initialize
  $trigger.onclick = () => showPopup();
  $popup.onclick = (e) => clickBackdrop(e);
  $btnClose.onclick = () => hidePopup();
  $popup.oncancel = (e) => {
    e.preventDefault();
    hidePopup();
  };
});

