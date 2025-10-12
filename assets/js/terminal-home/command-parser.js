/**
 * Terminal Home - Command Parser
 * Parse and validate terminal commands
 */

export const CommandParser = {
  /**
   * Parse command string into parts
   * @param {string} command - Raw command string
   * @returns {Object} Parsed command with type and args
   */
  parse(command) {
    if (!command) return null;

    const trimmed = command.trim();
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    return {
      command: cmd,
      args,
      raw: trimmed,
      isValid: this.isValidCommand(cmd)
    };
  },

  /**
   * Check if command is valid
   */
  isValidCommand(cmd) {
    const validCommands = ['cd', 'ls', 'grep', 'clear', 'help', '?'];
    return validCommands.includes(cmd);
  },

  /**
   * Parse ls flags
   */
  parseLsFlags(args) {
    const flags = {
      sort: 'time',
      reverse: false,
      detailed: false,
      expandAll: false
    };

    args.forEach(arg => {
      if (arg.startsWith('-')) {
        const flagStr = arg.substring(1);
        
        // Sort by time (default)
        if (flagStr.includes('t')) {
          flags.sort = 'time';
        }
        
        // Reverse order
        if (flagStr.includes('r')) {
          flags.reverse = true;
        }
        
        // Sort by size
        if (flagStr.includes('S')) {
          flags.sort = 'size';
        }
        
        // Sort by name
        if (flagStr.includes('n')) {
          flags.sort = 'name';
        }
        
        // Show all details
        if (flagStr.includes('a')) {
          flags.detailed = true;
          flags.expandAll = true;
        }
        
        // Long listing
        if (flagStr.includes('l')) {
          flags.detailed = true;
        }
      }
    });

    return flags;
  },

  /**
   * Parse cd argument
   */
  parseCdPath(args) {
    if (!args || args.length === 0) return '';
    
    const path = args[0];
    
    // Handle special paths
    if (path === '..' || path === '../') return '..';
    if (path === '~' || path === './') return '';
    
    return path;
  }
};
