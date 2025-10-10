# frozen_string_literal: true

module Jekyll
  # Generator plugin to create backlinks for all posts
  # Scans all posts for internal links and builds a backlinks map
  class BacklinksGenerator < Generator
    safe true
    priority :low

    def generate(site)
      # Initialize backlinks and outgoing links hashes
      backlinks = Hash.new { |hash, key| hash[key] = [] }
      outgoing_links = Hash.new { |hash, key| hash[key] = [] }
      
      # Get all posts and pages to scan
      all_documents = site.posts.docs + site.pages
      
      # Build a URL to document map for quick lookup
      url_to_doc = {}
      all_documents.each do |doc|
        url_to_doc[doc.url] = doc
        # Also map without trailing slash
        url_to_doc[doc.url.chomp('/')] = doc
      end
      
      # Scan each document for links
      all_documents.each do |doc|
        next unless doc.content
        
        # Find all markdown links [text](url) with context and HTML links
        content_lines = doc.content.lines
        line_number = 0
        
        markdown_links = []
        html_links = []
        
        content_lines.each_with_index do |line, idx|
          # Find markdown links with line context
          line.scan(/\[([^\]]+)\]\(([^\)]+)\)/) do |match|
            link_text = match[0]
            link_url = match[1]
            markdown_links << { 
              url: link_url, 
              line: idx, 
              context: get_heading_context(content_lines, idx)
            }
          end
          
          # Find HTML links
          line.scan(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/) do |match|
            link_url = match[0]
            link_text = match[1]
            html_links << { 
              url: link_url, 
              line: idx, 
              context: get_heading_context(content_lines, idx)
            }
          end
        end
        
        all_links = (markdown_links + html_links).uniq { |l| l[:url] }
        
        all_links.each do |link_info|
          link = link_info[:url]
          
          # Skip external links, anchors, and assets
          next if link.start_with?('http://', 'https://', '//', '#')
          next if link.include?('mailto:')
          next if link.match?(/\.(png|jpg|jpeg|gif|svg|pdf|zip)$/i)
          
          # Normalize the link
          normalized_link = normalize_link(link, site.baseurl)
          
          # Find the target document
          target_doc = url_to_doc[normalized_link] || url_to_doc[normalized_link.chomp('/')]
          
          if target_doc
            # Add this document as a backlink to the target with anchor to section
            anchor = link_info[:context] ? "##{slugify(link_info[:context])}" : ""
            
            backlink_info = {
              'url' => doc.url + anchor,
              'title' => doc.data['title'] || doc.basename,
              'excerpt' => get_excerpt(doc),
              'context' => link_info[:context]
            }
            
            backlinks[target_doc.url] << backlink_info unless backlinks[target_doc.url].any? { |b| b['url'] == backlink_info['url'] }
            
            # Also track outgoing links from this document
            outgoing_info = {
              'url' => target_doc.url,
              'title' => target_doc.data['title'] || target_doc.basename,
              'excerpt' => get_excerpt(target_doc),
              'context' => link_info[:context]
            }
            
            outgoing_links[doc.url] << outgoing_info unless outgoing_links[doc.url].any? { |o| o['url'] == outgoing_info['url'] }
          end
        end
      end
      
      # Add backlinks and outgoing links data to each document
      all_documents.each do |doc|
        doc.data['backlinks'] = backlinks[doc.url] || []
        doc.data['outgoing_links'] = outgoing_links[doc.url] || []
      end
      
      Jekyll.logger.info "Backlinks:", "Generated backlinks for #{backlinks.keys.size} pages"
    end
    
    private
    
    def get_heading_context(lines, current_line)
      # Look backwards from current line to find the nearest heading
      (current_line).downto(0) do |i|
        line = lines[i]
        # Match markdown headings (# to ######)
        if line =~ /^(\#{1,6})\s+(.+)$/
          return $2.strip
        end
      end
      nil
    end
    
    def slugify(text)
      return "" unless text
      text.downcase
          .gsub(/[^\w\s-]/, '')
          .gsub(/\s+/, '-')
          .gsub(/-+/, '-')
          .strip
    end
    
    def normalize_link(link, baseurl)
      # Remove baseurl if present
      link = link.sub(/^#{Regexp.escape(baseurl)}/, '') if baseurl && !baseurl.empty?
      
      # Remove anchor
      link = link.split('#').first
      
      # Ensure leading slash
      link = "/#{link}" unless link.start_with?('/')
      
      # Remove trailing slash for consistency
      link.chomp('/')
    end
    
    def get_excerpt(doc)
      if doc.data['excerpt']
        strip_html(doc.data['excerpt'].to_s).strip[0..150]
      elsif doc.data['description']
        strip_html(doc.data['description'].to_s).strip[0..150]
      else
        # Get first paragraph from content
        content = strip_html(doc.content.to_s)
        first_para = content.split("\n\n").first || content
        first_para.strip[0..150]
      end
    end
    
    def strip_html(text)
      text.gsub(/<[^>]*>/, '')
          .gsub(/\{%[^%]*%\}/, '')
          .gsub(/\{:[^:]*:\}/, '')
    end
  end
end
