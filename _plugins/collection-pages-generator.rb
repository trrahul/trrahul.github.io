# frozen_string_literal: true

module Jekyll
  # Generates a landing page at /collections/<slug>/ for every collection
  # defined in _data/collections.yml that has at least one member post
  # (a post whose `collection_id` front-matter equals the collection slug).
  #
  # Mirrors the data-driven approach of category-hierarchy-generator.rb:
  # add a collection to the YAML and tag a post with its slug, and the page
  # appears automatically. Collections with no members produce no page,
  # matching the home page's "only show non-empty collections" rule.
  class CollectionPagesGenerator < Generator
    safe true
    priority :low

    def generate(site)
      collections = site.data['collections']
      return unless collections.is_a?(Array)

      generated = 0

      collections.each do |c|
        slug = c['slug'].to_s.strip
        next if slug.empty?

        members = site.posts.docs.select { |post| post.data['collection_id'] == slug }
        if members.empty?
          Jekyll.logger.warn 'Collections:', "skipping '#{slug}' — no posts reference it"
          next
        end

        site.pages << CollectionPage.new(site, site.source, slug, c)
        generated += 1
      end

      Jekyll.logger.info 'Collections:', "generated #{generated} collection page(s)"
    end
  end

  # A single /collections/<slug>/index.html page rendered by the
  # `collection` layout. Presentation fields are passed through verbatim
  # from the YAML entry so the layout can render the header and styling.
  class CollectionPage < Page
    def initialize(site, base, slug, config)
      @site = site
      @base = base
      @dir  = File.join('collections', slug)
      @name = 'index.html'

      process(@name)

      self.content = ''
      self.data = {
        'layout'           => 'collection',
        'title'            => config['name'],
        'collection_slug'  => slug,
        'collection_name'  => config['name'],
        'collection_desc'  => config['desc'],
        'collection_w40k'  => config['w40k'] == true
      }
    end
  end
end
