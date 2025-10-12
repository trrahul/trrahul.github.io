/**
 * Terminal Home - Sort Manager
 * Handles sorting concerns for directory and flat views
 */

export class SortManager {
  constructor(stateStore) {
    this.state = stateStore;
  }

  sortPosts() {
    const { type, reverse } = this.state.sorting;
    this.sortFlatList(type, reverse);
    this.sortCategoryDirectories(type, reverse);
  }

  sortFlatList(type, reverse) {
    const flatList = this.state.getElement('flatList');
    if (!flatList) return;

    const posts = Array.from(flatList.querySelectorAll('.directory-file'));
    const sorted = this.sortArray(posts, type, reverse);
    sorted.forEach(post => flatList.appendChild(post));
  }

  sortCategoryDirectories(type, reverse) {
    const categoryDirs = this.state.getElement('categoryDirs');
    if (!categoryDirs || categoryDirs.length === 0) return;

    categoryDirs.forEach(dir => {
      const contents = dir.querySelector('.directory-contents');
      if (!contents) return;

      const posts = Array.from(contents.querySelectorAll('.directory-file'));
      const sorted = this.sortArray(posts, type, reverse);
      sorted.forEach(post => contents.appendChild(post));
    });
  }

  sortArray(posts, type, reverse) {
    return [...posts].sort((a, b) => {
      let comparison = 0;

      switch (type) {
        case 'time':
          comparison = parseInt(b.dataset.date, 10) - parseInt(a.dataset.date, 10);
          break;
        case 'size':
          comparison = parseInt(b.dataset.size, 10) - parseInt(a.dataset.size, 10);
          break;
        case 'name':
          {
            const nameA = a.querySelector('.file-name')?.textContent || '';
            const nameB = b.querySelector('.file-name')?.textContent || '';
            comparison = nameA.localeCompare(nameB);
          }
          break;
        default:
          comparison = 0;
      }

      return reverse ? -comparison : comparison;
    });
  }

  setSortType(type, reverse = false) {
    this.state.setSorting(type, reverse);
    this.sortPosts();
    this.updateSortIndicators();
  }

  updateSortIndicators() {
    const { type, reverse } = this.state.sorting;
    document.querySelectorAll('.control-btn[data-sort]').forEach(btn => {
      const btnSort = btn.dataset.sort;
      const isActive = btnSort === type;

      if (isActive) {
        btn.classList.add('active');
        btn.dataset.dir = reverse ? 'asc' : 'desc';
        const arrow = btn.querySelector('.sort-direction');
        if (arrow) {
          arrow.className = reverse ? 'fas fa-arrow-up sort-direction' : 'fas fa-arrow-down sort-direction';
          arrow.style.opacity = '1';
        }
      } else {
        btn.classList.remove('active');
        btn.dataset.dir = 'desc';
        const arrow = btn.querySelector('.sort-direction');
        if (arrow) {
          arrow.className = 'fas fa-arrow-down sort-direction';
          arrow.style.opacity = '0.3';
        }
      }
    });
  }

  updateSortButtonsState(enable) {
    document.querySelectorAll('.control-btn[data-sort]').forEach(btn => {
      if (enable) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      } else {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
    });
  }
}
