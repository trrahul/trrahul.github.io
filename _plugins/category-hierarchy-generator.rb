# frozen_string_literal: true

require 'json'
require 'pathname'

module Jekyll
  # Generator plugin to create hierarchical category structure
  # Analyzes post categories and builds a tree structure
  class CategoryHierarchyGenerator < Generator
    safe true
    priority :low

    def generate(site)
      # Build the category hierarchy from posts
  hierarchy = build_category_hierarchy(site)

  # Convert hierarchy to a Liquid-friendly structure with string keys
  hierarchy_data = JSON.parse(JSON.generate(hierarchy))

  # Add to site data for access in templates
  site.data['category_hierarchy'] = hierarchy_data

  # Create a JSON file for JavaScript consumption
  json_content = JSON.pretty_generate(hierarchy_data)
      site.pages << CategoryHierarchyPage.new(site, site.source, json_content)
      
  Jekyll.logger.info "Category Hierarchy:", "Generated tree with #{hierarchy_data['root_children'].size} root categories"
    end

    private

    def build_category_hierarchy(site)
      # Hash to store category nodes
      categories = {}
      
      # Hash to store all posts with full metadata for filtering/sorting
      all_posts = {}
      
      # Build comprehensive post index with all metadata needed for JS operations
      site.posts.docs.each do |post|
        next if post.data['hidden']

        clean_content = strip_html(post.content.to_s)
        word_count = clean_content.split(/\s+/).reject(&:empty?).size
        estimated_read_time = [(word_count / 200.0).ceil, 1].max
        post_categories = Array(post.data['categories'])
        post_tags = Array(post.data['tags'])
        
        # Create slugified category path
        category_path = post_categories.map { |c| slugify_category(c) }
        full_path = category_path.join('/')
        
        # Store post with ALL data needed for operations
        post_id = generate_post_id(post)
        all_posts[post_id] = {
          id: post_id,
          title: post.data['title'],
          url: post.url,
          permalink: build_permalink(site, post),
          slug: derive_slug(post),
          date: post.date.to_s,
          timestamp: post.date.to_i,
          last_modified_at: extract_last_modified(post),
          published: !post.data['draft'] && post.published?,
          
          # Categories
          categories: post_categories,
          category_slugs: category_path,
          category_path: full_path,
          
          # Tags for filtering
          tags: post_tags,
          tag_slugs: post_tags.map { |t| slugify_category(t) },
          
          # Metadata for sorting
          word_count: word_count,
          read_time: estimated_read_time,
          reading_time_minutes: estimated_read_time,
          
          # Search data
          description: post.data['description'] || '',
          excerpt: strip_html(post.data['excerpt'].to_s)[0..200],
          summary: build_summary(clean_content, post.data['description']),
          
          # Display flags
          pinned: post.data['pin'] == true
        }
        
        # Build category hierarchy
        next if category_path.empty?
        
        # Register each level of the hierarchy
        (0...category_path.length).each do |depth|
          path = category_path[0..depth]
          path_str = path.join('/')
          
          # Create category entry if it doesn't exist
          unless categories[path_str]
            categories[path_str] = {
              name: post_categories[depth],
              slug: path[depth],
              path: path_str,
              depth: depth,
              parent_path: depth > 0 ? path[0..depth-1].join('/') : nil,
              children: [],
              post_ids: [],           # Only posts directly in this category
              all_post_ids: [],       # Posts in this category and subcategories
              post_count: 0,
              total_post_count: 0
            }
          end
          
          # If this is the leaf category, add the post
          if depth == category_path.length - 1
            categories[path_str][:post_ids] << post_id
            categories[path_str][:post_count] += 1
          end
        end
      end
      
      # Build tree structure and calculate total post counts
      root_children = []
      
      categories.each do |path, data|
        if data[:parent_path]
          # Add to parent's children
          parent = categories[data[:parent_path]]
          parent[:children] << path if parent && !parent[:children].include?(path)
        else
          # Root level category
          root_children << path unless root_children.include?(path)
        end
      end
      
      # Calculate all_post_ids recursively (includes subcategories)
      calculate_total_posts = lambda do |path|
        category = categories[path]
        return [] unless category
        
        # Start with posts directly in this category
        all_ids = category[:post_ids].dup
        
        # Add posts from all children recursively
        category[:children].each do |child_path|
          all_ids.concat(calculate_total_posts.call(child_path))
        end
        
        category[:all_post_ids] = all_ids.uniq
        category[:total_post_count] = all_ids.size
        
        all_ids
      end
      
      # Calculate for all categories
      categories.keys.each { |path| calculate_total_posts.call(path) }

      # Sort children arrays for stability
      categories.each_value { |category| category[:children].sort! }
      root_children.sort!
      
      # Build tag index for filtering
      tag_index = {}
      all_posts.each do |post_id, post_data|
        post_data[:tag_slugs].each do |tag|
          tag_index[tag] ||= []
          tag_index[tag] << post_id
        end
      end
      
      # Build final structure optimized for JavaScript
      {
        categories: categories,
        root_children: root_children,
        posts: all_posts,
        tags: tag_index.transform_values { |ids| ids.uniq.sort },
        metadata: {
          generated_at: Time.now.iso8601,
          total_posts: all_posts.size,
          total_categories: categories.size,
          total_tags: tag_index.size,
          search_index_url: '/assets/js/data/search-index.json'
        }
      }
    end
    
    def strip_html(text)
      text.to_s
          .gsub(/<[^>]*>/, '')
          .gsub(/\{%[^%]*%\}/, '')
          .gsub(/\{:[^:]*:\}/, '')
    end
    def build_summary(clean_content, description)
      return description.strip if description && !description.strip.empty?

      words = clean_content.split(/\s+/).reject(&:empty?)
      snippet = words.first(40).join(' ')
      snippet += '…' if words.length > 40
      snippet
    end

    def derive_slug(post)
      slug = post.data['slug']
      slug = slug.strip if slug.is_a?(String)
      return slug unless slug.nil? || slug.empty?

      if post.respond_to?(:slug)
        fallback = post.slug
        return fallback if fallback && !fallback.empty?
      end

      basename = File.basename(post.path, File.extname(post.path))
      basename.sub(/^\d{4}-\d{2}-\d{2}-/, '')
    end

    def build_permalink(site, post)
      site_url = site.config['url'].to_s.strip
      return post.url.to_s if site_url.empty?

  site_url = site_url.chomp('/')
  baseurl = site.config['baseurl'].to_s.strip
  baseurl = baseurl.gsub(%r{^/+}, '').gsub(%r{/+$}, '')

      post_path = post.url.to_s.sub(%r{^/}, '')

      segments = []
      segments << baseurl unless baseurl.nil? || baseurl.empty?
      segments << post_path unless post_path.empty?

      path_suffix = segments.join('/')
      return site_url if path_suffix.empty?

      "#{site_url}/#{path_suffix}"
    end

    def generate_post_id(post)
      source = post.id.to_s.empty? ? post.path.to_s : post.id.to_s
      formatted = source.tr('/', '-').gsub(/[\s.]+/, '-').gsub(/[^a-zA-Z0-9_-]/, '').downcase
      "post-#{formatted}"
    end

    def extract_last_modified(post)
      value = post.data['last_modified_at'] || post.respond_to?(:last_modified_at) && post.last_modified_at
      value ? value.to_s : nil
    end

    def slugify_category(category)
      category.to_s
        .downcase
        .gsub(/\s+/, '-')
        .gsub(/[^\w\-]/, '')
    end
  end

  # Page class to hold the category hierarchy JSON data
  class CategoryHierarchyPage < Page
    def initialize(site, base, json_content)
      @site = site
      @base = base
      @dir = 'assets/js/data'
      @name = 'category-hierarchy.json'

      self.process(@name)
      self.content = json_content
      self.data = {
        'layout' => nil,
        'sitemap' => false
      }
    end
  end
end
