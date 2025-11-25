/**
 * Data sanitization utilities for cleaning text before PostgreSQL storage
 */

/**
 * Remove emojis from text
 */
export function removeEmojis(text: string): string {
    // Remove emojis using regex
    return text.replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Symbols & Pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport & Map
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
        .replace(/[\u{2600}-\u{26FF}]/gu, '') // Miscellaneous Symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // Variation Selectors
        .replace(/[\u{200D}]/gu, ''); // Zero Width Joiner
}

/**
 * Remove markdown formatting
 */
export function removeMarkdownFormatting(text: string): string {
    return text
        // Remove headers
        .replace(/^#+\s+/gm, '')
        // Remove bold/italic
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        // Remove links but keep text
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        // Remove wiki links but keep text
        .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')
        // Remove inline code
        .replace(/`([^`]+)`/g, '$1')
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Remove blockquotes
        .replace(/^>\s+/gm, '')
        // Remove horizontal rules
        .replace(/^(---|\*\*\*|___)$/gm, '')
        // Remove list markers
        .replace(/^[\s]*[-*+]\s+/gm, '')
        .replace(/^[\s]*\d+\.\s+/gm, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Remove HTML tags
 */
export function removeHtmlTags(text: string): string {
    return text.replace(/<[^>]*>/g, '');
}

/**
 * Normalize whitespace
 */
export function normalizeWhitespace(text: string): string {
    return text
        .replace(/[\r\n]+/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
}

/**
 * Remove special characters that might cause issues in PostgreSQL
 */
export function removeProblematicCharacters(text: string): string {
    return text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
        .replace(/\uFFFD/g, ''); // Remove replacement character
}

/**
 * Full sanitization pipeline
 */
export function sanitizeText(text: string): string {
    let sanitized = text;
    sanitized = removeEmojis(sanitized);
    sanitized = removeHtmlTags(sanitized);
    sanitized = removeMarkdownFormatting(sanitized);
    sanitized = removeProblematicCharacters(sanitized);
    sanitized = normalizeWhitespace(sanitized);
    return sanitized;
}

/**
 * Sanitize for use as a database identifier
 */
export function sanitizeIdentifier(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '');
}
