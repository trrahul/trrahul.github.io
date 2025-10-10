/**
 * Home Page Category Filter
 * Adds a simple category filter bar on top of the home page post list
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('Home filter script loaded');

  const postList = document.getElementById('post-list');
  console.log('Post list element:', postList);
  if (!postList) {
    console.log('No post-list found, not on home page');
    return;
  }
  
  console.log('On home page');

  // Collect all categories from posts
  const categories = new Map();
  const posts = postList.querySelectorAll('.card-wrapper');
  
  posts.forEach(post => {
    const postCategories = post.dataset.categories;
    if (!postCategories) return;
    
    postCategories.split(',').forEach(slug => {
      if (!slug) return;
      
      if (!categories.has(slug)) {
        // Convert slug back to readable name (capitalize first letter of each word)
        const name = slug.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        categories.set(slug, { name: name, count: 0 });
      }
      categories.get(slug).count++;
    });
  });

  if (categories.size === 0) {
    console.log('No categories found');
    return;
  }

  console.log('Categories found:', categories);

  // Create filter bar with dropdown
  const filterBar = document.createElement('div');
  filterBar.id = 'home-category-filter';
  filterBar.className = 'mb-3';
  filterBar.innerHTML = `
    <div class="d-flex align-items-center gap-2">
      <select class="form-select form-select-sm" id="home-category-select" style="max-width: 300px;">
        <option value="all">All Categories (${posts.length} posts)</option>
        ${Array.from(categories.entries())
          .sort((a, b) => a[1].name.localeCompare(b[1].name))
          .map(([slug, data]) => `
            <option value="${slug}">${data.name} (${data.count})</option>
          `).join('')}
      </select>
    </div>
  `;

  // Insert filter bar before post list
  postList.parentNode.insertBefore(filterBar, postList);

  // Add filter functionality
  const selectElement = document.getElementById('home-category-select');
  
  selectElement.addEventListener('change', (e) => {
    const category = e.target.value;
    
    // Filter posts
    posts.forEach(post => {
      const postCategories = (post.dataset.categories || '').split(',');
      
      if (category === 'all' || postCategories.includes(category)) {
        post.style.display = '';
      } else {
        post.style.display = 'none';
      }
    });
  });
});
