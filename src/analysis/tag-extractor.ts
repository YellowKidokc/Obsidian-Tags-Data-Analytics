import { App, TFile, getAllTags, CachedMetadata } from 'obsidian';
import { TagOccurrence, TagStatistics } from '../types';

export class TagExtractor {
    constructor(private app: App) {}

    /**
     * Extract all tags from the vault with their occurrences
     */
    async extractAllTags(): Promise<Map<string, TagOccurrence[]>> {
        const tagMap = new Map<string, TagOccurrence[]>();
        const files = this.app.vault.getMarkdownFiles();

        for (const file of files) {
            const occurrences = await this.extractTagsFromFile(file);

            for (const occurrence of occurrences) {
                if (!tagMap.has(occurrence.tag)) {
                    tagMap.set(occurrence.tag, []);
                }
                tagMap.get(occurrence.tag)!.push(occurrence);
            }
        }

        return tagMap;
    }

    /**
     * Extract tags from a single file
     */
    async extractTagsFromFile(file: TFile): Promise<TagOccurrence[]> {
        const occurrences: TagOccurrence[] = [];
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        const cache = this.app.metadataCache.getFileCache(file);

        if (!cache) return occurrences;

        // Get all tags from cache (includes frontmatter and inline tags)
        const tags = getAllTags(cache) || [];

        // For each tag, find its occurrences in the file
        for (const tag of tags) {
            const tagOccurrences = this.findTagInContent(
                tag,
                lines,
                file,
                cache
            );
            occurrences.push(...tagOccurrences);
        }

        return occurrences;
    }

    /**
     * Find all occurrences of a tag in content
     */
    private findTagInContent(
        tag: string,
        lines: string[],
        file: TFile,
        cache: CachedMetadata
    ): TagOccurrence[] {
        const occurrences: TagOccurrence[] = [];
        const tagPattern = new RegExp(tag.replace('#', '#?'), 'gi');

        // Check frontmatter tags
        if (cache.frontmatter?.tags) {
            const fmTags = Array.isArray(cache.frontmatter.tags)
                ? cache.frontmatter.tags
                : [cache.frontmatter.tags];

            if (fmTags.includes(tag.replace('#', ''))) {
                occurrences.push({
                    tag: tag,
                    file: file.path,
                    lineNumber: 0,
                    context: 'Frontmatter tag',
                    sentence: `tags: ${fmTags.join(', ')}`,
                    timestamp: file.stat.mtime
                });
            }
        }

        // Find inline tags
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (tagPattern.test(line)) {
                const context = this.getContext(lines, i, 100);
                const sentence = this.getSentence(lines, i);

                occurrences.push({
                    tag: tag,
                    file: file.path,
                    lineNumber: i + 1,
                    context: context,
                    sentence: sentence,
                    timestamp: file.stat.mtime
                });
            }
        }

        return occurrences;
    }

    /**
     * Get surrounding context for a line
     */
    private getContext(lines: string[], lineIndex: number, chars: number): string {
        const start = Math.max(0, lineIndex - 2);
        const end = Math.min(lines.length, lineIndex + 3);
        const contextLines = lines.slice(start, end);
        let context = contextLines.join(' ');

        // Trim to character limit
        const targetLine = lines[lineIndex];
        const targetPos = context.indexOf(targetLine);

        if (context.length > chars * 2) {
            const startPos = Math.max(0, targetPos - chars);
            const endPos = Math.min(context.length, targetPos + targetLine.length + chars);
            context = context.slice(startPos, endPos);

            if (startPos > 0) context = '...' + context;
            if (endPos < context.length) context = context + '...';
        }

        return context.trim();
    }

    /**
     * Extract the complete sentence containing the line
     */
    private getSentence(lines: string[], lineIndex: number): string {
        let sentence = lines[lineIndex];

        // Look backwards for sentence start
        let i = lineIndex - 1;
        while (i >= 0 && !this.isSentenceEnd(lines[i])) {
            sentence = lines[i] + ' ' + sentence;
            i--;
        }

        // Look forwards for sentence end
        i = lineIndex + 1;
        while (i < lines.length && !this.isSentenceEnd(lines[i - 1])) {
            sentence = sentence + ' ' + lines[i];
            i++;
        }

        return sentence.trim();
    }

    /**
     * Check if line ends with sentence-ending punctuation
     */
    private isSentenceEnd(line: string): boolean {
        return /[.!?]$/.test(line.trim());
    }

    /**
     * Calculate statistics for tags
     */
    calculateStatistics(
        tagOccurrences: Map<string, TagOccurrence[]>,
        highThreshold: number,
        mediumThreshold: number
    ): Map<string, TagStatistics> {
        const stats = new Map<string, TagStatistics>();

        for (const [tag, occurrences] of tagOccurrences.entries()) {
            const uniqueFiles = new Set(occurrences.map(o => o.file));
            const sortedByTime = [...occurrences].sort((a, b) =>
                (a.timestamp || 0) - (b.timestamp || 0)
            );

            const totalOccurrences = occurrences.length;
            let tier: 'high' | 'medium' | 'low';

            if (totalOccurrences >= highThreshold) {
                tier = 'high';
            } else if (totalOccurrences >= mediumThreshold) {
                tier = 'medium';
            } else {
                tier = 'low';
            }

            stats.set(tag, {
                tag: tag,
                totalOccurrences: totalOccurrences,
                documentCount: uniqueFiles.size,
                firstAppearance: {
                    file: sortedByTime[0].file,
                    date: sortedByTime[0].timestamp,
                    lineNumber: sortedByTime[0].lineNumber
                },
                lastAppearance: {
                    file: sortedByTime[sortedByTime.length - 1].file,
                    date: sortedByTime[sortedByTime.length - 1].timestamp,
                    lineNumber: sortedByTime[sortedByTime.length - 1].lineNumber
                },
                frequencyTier: tier
            });
        }

        return stats;
    }

    /**
     * Calculate co-occurrences between tags
     */
    calculateCoOccurrences(
        tagOccurrences: Map<string, TagOccurrence[]>
    ): Map<string, Map<string, number>> {
        const coOccurrences = new Map<string, Map<string, number>>();
        const tags = Array.from(tagOccurrences.keys());

        // Group occurrences by file
        const fileTagMap = new Map<string, Set<string>>();

        for (const [tag, occurrences] of tagOccurrences.entries()) {
            for (const occurrence of occurrences) {
                if (!fileTagMap.has(occurrence.file)) {
                    fileTagMap.set(occurrence.file, new Set());
                }
                fileTagMap.get(occurrence.file)!.add(tag);
            }
        }

        // Calculate co-occurrences
        for (const fileTags of fileTagMap.values()) {
            const tagArray = Array.from(fileTags);

            for (let i = 0; i < tagArray.length; i++) {
                for (let j = i + 1; j < tagArray.length; j++) {
                    const tag1 = tagArray[i];
                    const tag2 = tagArray[j];

                    if (!coOccurrences.has(tag1)) {
                        coOccurrences.set(tag1, new Map());
                    }
                    if (!coOccurrences.has(tag2)) {
                        coOccurrences.set(tag2, new Map());
                    }

                    const count1 = coOccurrences.get(tag1)!.get(tag2) || 0;
                    const count2 = coOccurrences.get(tag2)!.get(tag1) || 0;

                    coOccurrences.get(tag1)!.set(tag2, count1 + 1);
                    coOccurrences.get(tag2)!.set(tag1, count2 + 1);
                }
            }
        }

        return coOccurrences;
    }

    /**
     * Get top N co-occurring tags for a given tag
     */
    getTopCoOccurring(
        tag: string,
        coOccurrences: Map<string, Map<string, number>>,
        n: number = 6
    ): Array<{ tag: string; count: number }> {
        const tagCoOccurrences = coOccurrences.get(tag);
        if (!tagCoOccurrences) return [];

        return Array.from(tagCoOccurrences.entries())
            .map(([t, count]) => ({ tag: t, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, n);
    }
}
