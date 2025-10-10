/**
 * Knowledge Graph - Statistics Manager
 * @module knowledge-graph/statistics-manager
 */

export const StatisticsManager = {
  update(data) {
    const nodes = data.nodes;
    const links = data.links;
    const totalNodes = nodes.length;
    const totalLinks = links.length;
    const avgConnections = totalNodes > 0 ? (totalLinks * 2 / totalNodes).toFixed(1) : 0;
    const isolated = nodes.filter(n => n.connections === 0).length;
    this.updateStatCard('stat-total-nodes', totalNodes);
    this.updateStatCard('stat-total-links', totalLinks);
    this.updateStatCard('stat-avg-connections', avgConnections);
    this.updateStatCard('stat-isolated', isolated);
    this.updateTopConnected(nodes);
  },
  updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  },
  updateTopConnected(nodes) {
    const topPosts = [...nodes]
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 5);
    
    const listContainer = document.getElementById('top-connected-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = topPosts.map(post => `
      <li class="top-connected-item">
        <a href="${post.url}" class="text-decoration-none">
          <span class="post-title">${post.title}</span>
          <span class="connection-badge">
            <i class="fas fa-project-diagram fa-xs"></i> ${post.connections}
          </span>
        </a>
      </li>
    `).join('');
  },
};
