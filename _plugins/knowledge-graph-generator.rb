# frozen_string_literal: true

module Jekyll
  # Generator plugin to create knowledge graph data from posts
  # Generates a JSON file with nodes (posts) and edges (links between posts)
  class KnowledgeGraphGenerator < Generator
    safe true
    priority :lowest # Run after backlinks generator

    def generate(site)
      graph_data = build_graph_data(site)
      
      # Create graph data page
      graph_json = JSON.pretty_generate(graph_data)
      
      # Create a static file for the graph data
      site.pages << GraphDataPage.new(site, site.source, graph_json)
      
      Jekyll.logger.info "Knowledge Graph:", "Generated graph with #{graph_data[:nodes].size} nodes and #{graph_data[:links].size} links"
    end

    private

    def build_graph_data(site)
      nodes = []
      links = []
      
      # Only include posts (not all pages)
      posts = site.posts.docs
      
      # Create a URL to index map
      url_to_index = {}
      
      # Build nodes from posts
      posts.each_with_index do |post, index|
        url_to_index[post.url] = index
        
        # Calculate connection strength (total backlinks + outgoing links)
        backlink_count = post.data['backlinks']&.size || 0
        outgoing_count = post.data['outgoing_links']&.size || 0
        connection_count = backlink_count + outgoing_count
        
        # Get categories for coloring
        categories = post.data['categories'] || []
        primary_category = categories.last || 'uncategorized'
        
        nodes << {
          id: index,
          title: post.data['title'],
          url: post.url,
          category: primary_category,
          tags: post.data['tags'] || [],
          backlinks: backlink_count,
          outgoing: outgoing_count,
          connections: connection_count,
          excerpt: get_excerpt(post),
          date: post.date.to_s
        }
      end
      
      # Build links from outgoing_links data
      posts.each do |source_post|
        source_index = url_to_index[source_post.url]
        next unless source_index
        
        outgoing_links = source_post.data['outgoing_links'] || []
        
        outgoing_links.each do |link|
          target_index = url_to_index[link['url']]
          next unless target_index
          
          # Avoid duplicate links
          unless links.any? { |l| l[:source] == source_index && l[:target] == target_index }
            links << {
              source: source_index,
              target: target_index
            }
          end
        end
      end
      
      {
        nodes: nodes,
        links: links,
        metadata: {
          generated_at: Time.now.iso8601,
          total_posts: posts.size,
          total_connections: links.size
        }
      }
    end

    def get_excerpt(post)
      if post.data['description']
        post.data['description'].strip[0..100]
      elsif post.data['excerpt']
        strip_html(post.data['excerpt'].to_s).strip[0..100]
      else
        ""
      end
    end

    def strip_html(text)
      text.gsub(/<[^>]*>/, '')
          .gsub(/\{%[^%]*%\}/, '')
          .gsub(/\{:[^:]*:\}/, '')
    end
  end

  # Page class to hold the graph JSON data
  class GraphDataPage < Page
    def initialize(site, base, graph_json)
      @site = site
      @base = base
      @dir = 'assets/js/data'
      @name = 'graph.json'

      self.process(@name)
      self.content = graph_json
      self.data = {
        'layout' => nil,
        'sitemap' => false
      }
    end
  end
end
