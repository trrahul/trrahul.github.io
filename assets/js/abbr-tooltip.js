/**
 * Abbreviation Tooltip Handler
 * Moves title attribute to data-title to prevent browser default tooltip
 */

document.addEventListener('DOMContentLoaded', function () {
  // Find all abbr elements with title attribute
  const abbreviations = document.querySelectorAll('abbr[title]');

  abbreviations.forEach((abbr) => {
    // Move title to data-title
    const title = abbr.getAttribute('title');
    abbr.setAttribute('data-title', title);
    abbr.removeAttribute('title');
  });
});
