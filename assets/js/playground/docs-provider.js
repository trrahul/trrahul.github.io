/**
 * Documentation Links Provider
 * @module playground/docs-provider
 */

export const DocsProvider = {
  /**
   * Get Microsoft docs URL for diagnostic ID
   */
  getDocsUrl(diagnosticId) {
    if (!diagnosticId) return null;

    const id = diagnosticId.toUpperCase();

    // CS compiler errors/warnings
    if (id.startsWith('CS')) {
      const csNum = parseInt(id.substring(2));
      
      // Nullable warnings (CS8597-CS8899)
      if (csNum >= 8597 && csNum <= 8899) {
        return 'https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/nullable-warnings';
      }
      
      // General compiler errors and warnings
      return 'https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/';
    }

    // CA code analysis rules
    if (id.startsWith('CA')) {
      return `https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/${id.toLowerCase()}`;
    }

    // IDE code style rules
    if (id.startsWith('IDE')) {
      return `https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/${id.toLowerCase()}`;
    }

    return null;
  },
};
