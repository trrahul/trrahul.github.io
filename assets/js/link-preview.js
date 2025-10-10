/**
 * Link Preview - Wikipedia-style hover previews for internal links
 */

(function() {
  'use strict';

  // Cache for fetched previews
  const previewCache = new Map();
  
  // Preview tooltip element
  let tooltip = null;
  let currentLink = null;
  let hideTimeout = null;
  let showTimeout = null;

  // Initialize tooltip element
  function initTooltip() {
    if (tooltip) return;
    
    tooltip = document.createElement('div');
    tooltip.className = 'link-preview-tooltip';
    tooltip.innerHTML = `
      <div class="link-preview-content">
        <div class="link-preview-header">
          <svg class="link-preview-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
            <path d="M4.5 4a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7zM4 6.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"/>
          </svg>
          <div class="link-preview-title"></div>
        </div>
        <div class="link-preview-excerpt"></div>
      </div>
    `;
    document.body.appendChild(tooltip);

    // Hide tooltip when hovering over it
    tooltip.addEventListener('mouseenter', () => {
      clearTimeout(hideTimeout);
    });

    tooltip.addEventListener('mouseleave', () => {
      hideTooltip();
    });
  }

  // Extract preview data from HTML
  function extractPreviewData(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Get title
    const titleElement = doc.querySelector('h1[data-toc-skip]') || doc.querySelector('h1');
    const title = titleElement ? titleElement.textContent.trim() : 'Untitled';
    
    // Get description or first paragraph
    let excerpt = '';
    const metaDesc = doc.querySelector('meta[name="description"]');
    if (metaDesc) {
      excerpt = metaDesc.getAttribute('content');
    } else {
      const firstParagraph = doc.querySelector('.content p');
      if (firstParagraph) {
        excerpt = firstParagraph.textContent.trim().substring(0, 180);
      }
    }
    
    return { title, excerpt };
  }

  // Fetch preview for a URL
  async function fetchPreview(url) {
    if (previewCache.has(url)) {
      return previewCache.get(url);
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const html = await response.text();
      const data = extractPreviewData(html);
      
      previewCache.set(url, data);
      return data;
    } catch (error) {
      console.error('Preview fetch error:', error);
      return null;
    }
  }

  // Show tooltip
  function showTooltip(link, data) {
    if (!tooltip || !data) return;

    const titleEl = tooltip.querySelector('.link-preview-title');
    const excerptEl = tooltip.querySelector('.link-preview-excerpt');
    
    titleEl.textContent = data.title;
    excerptEl.textContent = data.excerpt;

    // Position tooltip
    const rect = link.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    tooltip.style.display = 'block';
    
    // Calculate position (below the link by default)
    let top = rect.bottom + scrollTop + 8;
    let left = rect.left + scrollLeft;
    
    // Adjust if tooltip would go off screen
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Check right edge
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 20;
    }
    
    // Check if should show above instead
    if (top + tooltipRect.height > window.innerHeight + scrollTop) {
      top = rect.top + scrollTop - tooltipRect.height - 8;
    }
    
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    
    // Add visible class for animation
    setTimeout(() => tooltip.classList.add('visible'), 10);
  }

  // Hide tooltip
  function hideTooltip() {
    if (!tooltip) return;
    
    tooltip.classList.remove('visible');
    setTimeout(() => {
      tooltip.style.display = 'none';
    }, 200);
  }

  // Handle link hover
  function handleLinkHover(event) {
    clearTimeout(hideTimeout);
    clearTimeout(showTimeout);
    
    const link = this || event.currentTarget;
    const href = link.getAttribute('href');
    
    currentLink = link;
    
    // Show preview after a short delay
    showTimeout = setTimeout(async () => {
      const data = await fetchPreview(href);
      if (currentLink === link && data) {
        showTooltip(link, data);
      }
    }, 300);
  }

  // Handle link leave
  function handleLinkLeave(event) {
    clearTimeout(showTimeout);
    
    hideTimeout = setTimeout(() => {
      hideTooltip();
      currentLink = null;
    }, 200);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    initTooltip();
    
    // Use event delegation on document
    document.addEventListener('mouseover', function(event) {
      const link = event.target.closest('a');
      if (!link) return;
      
      const href = link.getAttribute('href');
      
      // Only handle internal links starting with /posts/
      if (!href || !href.startsWith('/posts/')) return;
      
      // Don't show preview for links with no-preview class
      if (link.classList.contains('no-preview')) return;
      
      // Trigger hover handler
      handleLinkHover.call(link, event);
    });
    
    document.addEventListener('mouseout', function(event) {
      const link = event.target.closest('a');
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('/posts/')) return;
      
      handleLinkLeave.call(link, event);
    });
  }
})();
