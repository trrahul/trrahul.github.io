# frozen_string_literal: true

require 'json'
require 'time'
require 'kramdown'

module Jekyll
  # Generates a structured search index leveraging markdown hierarchy/intents.
  class SearchIndexGenerator < Generator
    safe true
    priority :low

    MAX_SEGMENT_TEXT = 400

    def generate(site)
      posts = site.posts.docs

      total_segments = 0

      search_posts = posts.map do |post|
        entry = build_post_entry(site, post)
        total_segments += entry[:segments].size if entry
        entry
      end.compact

      payload = {
        version: 1,
        generated_at: Time.now.iso8601,
        entry_count: search_posts.size,
        segment_count: total_segments,
        posts: search_posts
      }

      json = JSON.generate(payload)
      site.pages << SearchIndexPage.new(site, site.source, json)

      Jekyll.logger.info "Search Index:",
                         "Generated #{search_posts.size} posts (#{total_segments} segments)"
    end

    private

    def build_post_entry(site, post)
      segments = extract_segments(site, post)
      return nil if segments.empty?

      {
        id: post.id,
        title: post.data['title'],
        url: post.url,
        date: post.date&.iso8601,
        categories: Array(post.data['categories']).dup,
        tags: Array(post.data['tags']).dup,
        summary: extract_summary(post),
        segments: segments
      }
    end

    def extract_summary(post)
      summary = post.data['description'] || post.data['summary']
      summary = strip_markup(post.data['excerpt'].to_s) if summary.nil? && post.data['excerpt']
      summary = strip_markup(post.content.to_s).split('.')[0..1].join('. ') if summary.nil?
      summary = summary&.strip
      summary && summary.length > 220 ? summary[0...220].rstrip + '…' : summary
    end

    def extract_segments(site, post)
      heading_stack = []
      segments = []

      doc = Kramdown::Document.new(post.content, input: 'GFM', hard_wrap: false)

      traverse(doc.root, heading_stack, segments)

      segments.each_with_index { |segment, index| segment[:order] = index }

      segments
    rescue StandardError => e
      Jekyll.logger.warn 'Search Index:', "Failed to parse #{post.path}: #{e.message}"
      []
    end

    def traverse(node, heading_stack, segments)
      return unless node&.children

      node.children.each do |child|
        case child.type
        when :header
          handle_header(child, heading_stack, segments)
        when :paragraph
          append_segment('paragraph', heading_stack, segments, extract_text(child))
        when :codeblock
          lang = child.options[:lang]
          append_segment('code', heading_stack, segments, child.value, lang)
        when :blockquote
          append_segment('blockquote', heading_stack, segments, extract_text(child))
        when :ul, :ol
          child.children.each do |item|
            handle_list_item(item, heading_stack, segments)
          end
        when :table
          append_segment('table', heading_stack, segments, extract_text(child))
        else
          traverse(child, heading_stack, segments) if child.children.any?
        end
      end
    end

    def handle_header(element, heading_stack, segments)
      level = element.options[:level]
      title = normalize_whitespace(extract_text(element))
      return if title.empty?

      while heading_stack.any? && heading_stack.last[:level] >= level
        heading_stack.pop
      end

      slug = Utils.slugify(title, mode: :default)
      heading_stack << { level: level, title: title, slug: slug }

      append_segment('heading', heading_stack, segments, title)
    end

    def handle_list_item(element, heading_stack, segments)
      text = normalize_whitespace(extract_text(element))
      append_segment('list_item', heading_stack, segments, text)
    end

    def append_segment(type, heading_stack, segments, text, language = nil)
  text = type == 'code' ? text.to_s.strip : normalize_whitespace(text)
      return if text.empty?

      truncated = truncate_text(type, text)

      segments << {
        type: type,
        text: truncated,
        heading: heading_stack.map { |h| h[:title] },
        heading_slug: heading_stack.last&.dig(:slug),
        depth: heading_stack.size,
        language: language
      }
    end

    def extract_text(element)
      case element.type
      when :text
        element.value
      when :codeblock, :codespan
        element.value
      when :entity
        Kramdown::Utils::Entities.entity(element.value)
      else
        element.children.map { |child| extract_text(child) }.join(' ')
      end
    end

    def truncate_text(type, text)
      return text.strip if type == 'code'

      text.length > MAX_SEGMENT_TEXT ? text[0...MAX_SEGMENT_TEXT].rstrip + '…' : text.strip
    end

    def normalize_whitespace(text)
      text.to_s.gsub(/\s+/, ' ').strip
    end

    def strip_markup(text)
      text.to_s.gsub(/<[^>]*>/, ' ').gsub(/\s+/, ' ').strip
    end
  end

  # Page representing the generated search index JSON file.
  class SearchIndexPage < Page
    def initialize(site, base, content)
      @site = site
      @base = base
      @dir = 'assets/js/data'
      @name = 'search-index.json'

      process(@name)
      self.content = content
      self.data = {
        'layout' => nil,
        'sitemap' => false,
        # The JSON embeds post text verbatim (code segments can contain `{{`,
        # `{%`, etc.). Skip Liquid so those aren't parsed/mangled or warned on.
        'render_with_liquid' => false
      }
    end
  end
end
