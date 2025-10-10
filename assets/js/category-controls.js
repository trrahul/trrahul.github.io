/**
 * Category Filter and Sort Controls
 */

document.addEventListener('DOMContentLoaded', () => {
  const categoryContent = document.getElementById('category-content');
  const filterRadios = document.querySelectorAll('input[name="categoryFilter"]');
  const sortSelect = document.getElementById('categorySort');

  if (!categoryContent || !filterRadios.length || !sortSelect) {
    return; // Not on categories page
  }

  let categoryCards = Array.from(categoryContent.querySelectorAll('.card.categories'));

  /**
   * Apply current filter and sort settings
   */
  function applyFilterAndSort() {
    const filterValue = document.querySelector('input[name="categoryFilter"]:checked').value;
    const sortValue = sortSelect.value;

    // Filter categories
    categoryCards.forEach(card => {
      const hasSub = card.dataset.hasSub === 'true';
      let shouldShow = true;

      if (filterValue === 'with-sub') {
        shouldShow = hasSub;
      } else if (filterValue === 'no-sub') {
        shouldShow = !hasSub;
      }

      card.style.display = shouldShow ? '' : 'none';
    });

    // Get visible cards
    const visibleCards = categoryCards.filter(card => card.style.display !== 'none');

    // Sort visible categories
    visibleCards.sort((a, b) => {
      const nameA = a.dataset.categoryName.toLowerCase();
      const nameB = b.dataset.categoryName.toLowerCase();
      const countA = parseInt(a.dataset.postCount) || 0;
      const countB = parseInt(b.dataset.postCount) || 0;

      switch (sortValue) {
        case 'name':
          return nameA.localeCompare(nameB);
        case 'name-desc':
          return nameB.localeCompare(nameA);
        case 'posts':
          return countB - countA; // Most posts first
        case 'posts-asc':
          return countA - countB; // Fewest posts first
        default:
          return 0;
      }
    });

    // Reorder DOM elements
    visibleCards.forEach(card => {
      categoryContent.appendChild(card);
    });

    // Update stats display
    updateStats(visibleCards.length, categoryCards.length);
  }

  /**
   * Update the stats display
   */
  function updateStats(visibleCount, totalCount) {
    let statsElement = document.getElementById('category-stats');
    
    if (!statsElement) {
      statsElement = document.createElement('div');
      statsElement.id = 'category-stats';
      statsElement.className = 'text-muted small mb-3 mt-2';
      const controls = document.querySelector('.category-controls');
      controls.insertAdjacentElement('afterend', statsElement);
    }

    // Animate the change
    statsElement.style.opacity = '0.5';
    
    setTimeout(() => {
      if (visibleCount === totalCount) {
        statsElement.innerHTML = `Showing all <strong>${totalCount}</strong> ${totalCount === 1 ? 'category' : 'categories'}`;
      } else {
        statsElement.innerHTML = `Showing <strong>${visibleCount}</strong> of <strong>${totalCount}</strong> ${totalCount === 1 ? 'category' : 'categories'}`;
      }
      statsElement.style.opacity = '1';
    }, 150);
  }

  // Event listeners
  filterRadios.forEach(radio => {
    radio.addEventListener('change', applyFilterAndSort);
  });

  sortSelect.addEventListener('change', applyFilterAndSort);

  // Initial application
  applyFilterAndSort();
});
