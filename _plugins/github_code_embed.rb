# frozen_string_literal: true

require 'net/http'
require 'uri'
require 'json'

module Jekyll
  # GitHub Code Embed Tag
  #
  # Fetches code from GitHub and displays it with your site's syntax highlighting
  #
  # Usage:
  #   {% github_code https://github.com/user/repo/blob/main/path/to/file.cs 10-50 %}
  #   {% github_code https://github.com/user/repo/blob/main/path/to/file.cs 10-50 csharp %}
  #
  class GitHubCodeEmbed < Liquid::Tag
    def initialize(tag_name, markup, tokens)
      super
      @markup = markup.strip
      parse_params
    end

    def parse_params
      parts = @markup.split(/\s+/)
      @url = parts[0]
      @line_range = parts[1] if parts[1]
      @language = parts[2] || detect_language_from_url(@url)

      raise ArgumentError, "Invalid GitHub URL" unless valid_github_url?(@url)
    end

    def valid_github_url?(url)
      url =~ /github\.com\/[\w-]+\/[\w.-]+\/blob\//
    end

    def detect_language_from_url(url)
      ext = File.extname(url).downcase
      case ext
      when '.cs' then 'csharp'
      when '.rb' then 'ruby'
      when '.js' then 'javascript'
      when '.ts' then 'typescript'
      when '.py' then 'python'
      when '.java' then 'java'
      when '.go' then 'go'
      when '.rs' then 'rust'
      when '.cpp', '.cc', '.cxx' then 'cpp'
      when '.c' then 'c'
      when '.h', '.hpp' then 'cpp'
      when '.sh' then 'bash'
      when '.yml', '.yaml' then 'yaml'
      when '.json' then 'json'
      when '.xml' then 'xml'
      when '.html' then 'html'
      when '.css' then 'css'
      when '.scss' then 'scss'
      when '.md' then 'markdown'
      else 'text'
      end
    end

    def convert_to_raw_url(github_url)
      # Convert: https://github.com/user/repo/blob/branch/path/to/file
      # To: https://raw.githubusercontent.com/user/repo/branch/path/to/file
      raw_url = github_url
                  .sub('github.com', 'raw.githubusercontent.com')
                  .sub('/blob/', '/')
  Jekyll.logger.info 'GitHubCodeEmbed:', "Converted #{github_url} to #{raw_url}"
      raw_url
    end

    def fetch_code(url)
  Jekyll.logger.info 'GitHubCodeEmbed:', "Fetching code for #{url}"
      raw_url = convert_to_raw_url(url)
      uri = URI.parse(raw_url)

  Jekyll.logger.info 'GitHubCodeEmbed:', "Requesting #{uri}"
      response = Net::HTTP.get_response(uri)

      Jekyll.logger.info 'GitHubCodeEmbed:', "Response #{response.code} for #{uri}"
      if response.code == '200'
        Jekyll.logger.info 'GitHubCodeEmbed:', "Fetched #{code_preview(response.body)}"
        response.body.force_encoding('UTF-8')
      else
        raise "Failed to fetch code from GitHub: #{response.code}"
      end
    rescue StandardError => e
      Jekyll.logger.error "GitHub Code Embed:", e.message
      "# Error fetching code from GitHub\n# #{e.message}"
    end

    def extract_lines(code, line_range)
      return code unless line_range

      match = line_range.match(/(\d+)-(\d+)/)
      return code unless match

      start_line = match[1].to_i
      end_line = match[2].to_i
  Jekyll.logger.info 'GitHubCodeEmbed:', "Extracting lines #{start_line}-#{end_line}"

      lines = code.split("\n")
      lines[start_line - 1..end_line - 1].join("\n")
    end

    def render(context)
      require 'rouge'

      Jekyll.logger.info 'GitHubCodeEmbed:', "Rendering embed for #{@url} (#{@line_range || 'all lines'})"
      code = fetch_code(@url)
      code = extract_lines(code, @line_range)

      # Get the file name from URL
      filename = File.basename(@url)

      # Create the GitHub link
      line_fragment = @line_range ? "#L#{@line_range.gsub('-', '-L')}" : ""
      github_link = "#{@url}#{line_fragment}"

      # Determine the starting line number for the code block
      start_line_number = if @line_range
                            match = @line_range.match(/(\d+)-(\d+)/)
                            match ? match[1].to_i : 1
                          else
                            1
                          end

      # Use Rouge directly to get proper line numbering
      formatter = Rouge::Formatters::HTMLTable.new(
        Rouge::Formatters::HTML.new,
        start_line: start_line_number
      )
      lexer = Rouge::Lexer.find(@language) || Rouge::Lexers::PlainText.new
      highlighted_code = formatter.format(lexer.lex(code))

      # Build the output with the custom highlighted code
      output = <<~HTML
<div class="github-code-embed">
  <div class="github-code-header">
    <span class="github-code-filename">#{filename}</span>
    <a href="#{github_link}" target="_blank" rel="noopener" class="github-code-link">
      <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
      </svg>
      View on GitHub
    </a>
  </div>
  <div class="github-code-content is-collapsed">
    <figure class="highlight"><pre><code class="language-#{@language}" data-lang="#{@language}">#{highlighted_code}</code></pre></figure>
    <button class="github-code-expand" onclick="this.closest('.github-code-content').classList.toggle('is-collapsed'); this.closest('.github-code-content').classList.toggle('is-expanded');">
      Show more
      <svg viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 11L3 6h10l-5 5z"/>
      </svg>
    </button>
  </div>
</div>
      HTML

      output
    end

    private

    def code_preview(code)
      snippet = code.split("\n", 3).first(2).join(' | ')
      "snippet: #{snippet[0, 60]}..."
    end
  end
end

Liquid::Template.register_tag('github_code', Jekyll::GitHubCodeEmbed)
