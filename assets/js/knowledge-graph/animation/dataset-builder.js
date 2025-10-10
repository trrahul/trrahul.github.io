import { State } from '../state.js';

/**
 * Responsible for preparing node/link datasets for animation.
 */
export class DatasetBuilder {
  /**
   * @param {import('./animation-logger.js').AnimationLogger} logger
   */
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Computes the active filtered datasets based on current state selections.
   * @returns {{nodes:Array, links:Array}}
   */
  getFilteredDataset() {
    const activeData = (State.currentData && Array.isArray(State.currentData.nodes) && State.currentData.nodes.length > 0)
      ? State.currentData
      : State.rawData;

    const categoryFilterActive = State.activeCategories && State.activeCategories.size > 0;

    const filteredNodes = Array.isArray(activeData?.nodes)
      ? activeData.nodes.filter(node => !categoryFilterActive || State.activeCategories.has(node.category))
      : [];

    const visibleNodeIds = new Set(filteredNodes.map(node => node.id));

    const filteredLinks = Array.isArray(activeData?.links)
      ? activeData.links.filter(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
        })
      : [];

    return { nodes: filteredNodes, links: filteredLinks };
  }

  /**
   * Groups a collection of nodes into category clusters sorted by category and title.
   * @param {Array} nodes
   * @returns {Array<{category:string,nodes:Array}>}
   */
  groupNodesByCluster(nodes) {
    const clusterMap = new Map();

    nodes.forEach(node => {
      const category = node.category || 'uncategorized';
      if (!clusterMap.has(category)) {
        clusterMap.set(category, []);
      }
      clusterMap.get(category).push(node);
    });

    return Array.from(clusterMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, categoryNodes]) => ({
        category,
        nodes: categoryNodes.sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }

  /**
   * Builds animation frames by progressively revealing clustered nodes.
   * @param {Array<{category:string,nodes:Array}>} clusters
   * @param {Array} allLinks
   * @param {Map<string|number, number>} nodeClusterIndex
   * @returns {Array}
   */
  buildAnimationFrames(clusters, allLinks, nodeClusterIndex) {
    const frames = [];
    const nodeIdToNode = new Map();
    clusters.forEach(cluster => {
      cluster.nodes.forEach(node => nodeIdToNode.set(node.id, node));
    });

    const currentNodes = [];
    const visibleNodeIds = new Set();

    clusters.forEach((cluster, clusterIndex) => {
      cluster.nodes.forEach((node, nodeIndex) => {
        nodeClusterIndex.set(node.id, clusterIndex);
        currentNodes.push(node);
        visibleNodeIds.add(node.id);

        const frameNodeCopies = currentNodes.map(n => nodeIdToNode.get(n.id));
        const frameLinks = allLinks.filter(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
        });

        frames.push({
          nodes: frameNodeCopies,
          links: frameLinks,
          clusterIndex,
          clusterName: cluster.category,
          nodeIndex,
          focusNodeId: node.id,
        });
      });
    });

    return frames;
  }
}
