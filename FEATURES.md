# New Features Added

This document describes the new features that have been added to the Obsidian Tags Data Analytics plugin.

## 1. Coherence Factor Analysis

The **Coherence Factor** measures how well-defined and consistent a concept is across your notes.

### What it measures:

- **Consistency Score (30%)**: How uniformly the tag is used across different contexts
- **Semantic Stability (25%)**: Whether the concept's meaning has remained stable over time
- **Context Cohesion (25%)**: How well contexts cluster together
- **Definition Clarity (20%)**: How clearly the concept is defined based on semantic clusters

### How to use:

1. Generate a dashboard for any tag with 3+ occurrences
2. The coherence factor is automatically calculated
3. Access the dedicated Coherence Factor view to see detailed analysis
4. Review recommendations for improving concept coherence

### Score Interpretation:

- **80-100**: Excellent - Well-defined and consistent concept
- **60-79**: Good - Generally consistent with minor variations
- **40-59**: Fair - Moderate coherence with some ambiguity
- **0-39**: Needs Improvement - Multiple meanings or inconsistent usage

## 2. Breakthrough Factor Analysis

The **Breakthrough Factor** measures the innovation potential and conceptual significance of a tag.

### What it measures:

- **Novelty Score (20%)**: How novel/unique this concept is
- **Connection Density (20%)**: How well connected to other concepts
- **Emergence Pattern (20%)**: Pattern of emergence over time
- **Conceptual Leap (20%)**: Degree of conceptual innovation
- **Impact Potential (20%)**: Potential for future impact

### How to use:

1. Generate a dashboard for any tag with 3+ occurrences
2. The breakthrough factor is automatically calculated
3. Access the dedicated Breakthrough Factor view to see detailed analysis
4. Review key insights about innovation potential

### Innovation Profiles:

- **High Novelty × High Connection**: 🚀 Breakthrough Candidate
- **High Novelty × Low Connection**: 💎 Emerging Concept
- **Low Novelty × High Connection**: 🔗 Central Concept
- **Low Novelty × Low Connection**: 📖 Foundational Concept

## 3. PostgreSQL Integration

Store all your tag data in PostgreSQL for advanced analytics, systematic labeling, and classification.

### Features:

- **Automatic Data Sync**: Sync tag occurrences, statistics, and dashboard data to PostgreSQL
- **Data Sanitization**: Automatically removes emojis, markdown formatting, and problematic characters
- **UUID Generation**: Each tag occurrence gets a unique UUID
- **Labeling & Classification**: Add custom labels and classifications to tag occurrences
- **Advanced Queries**: Query and analyze your tag data with SQL

### Setup:

1. Install PostgreSQL on your system
2. Create a database: `createdb obsidian_tags`
3. Initialize the schema: `psql obsidian_tags < src/database/schema.sql`
4. Configure PostgreSQL settings in the plugin settings
5. Enable PostgreSQL integration
6. Enable auto-sync if desired

### Database Schema:

The PostgreSQL database includes the following tables:

- `tag_nodes`: Individual tag occurrences with sanitized content
- `tag_statistics`: Aggregate statistics for each tag
- `tag_cooccurrences`: Co-occurrence relationships between tags
- `semantic_clusters`: Semantic clusters for each tag
- `tag_definitions`: Definitions from various sources
- `user_labels`: Custom labels added to tag nodes
- `user_classifications`: Classifications with confidence scores

### Example Queries:

```sql
-- Get all high-coherence concepts
SELECT tag, avg_coherence_score, avg_breakthrough_score
FROM tag_statistics
WHERE avg_coherence_score > 70
ORDER BY avg_coherence_score DESC;

-- Find concepts with high breakthrough potential
SELECT tag, avg_breakthrough_score, total_occurrences
FROM tag_statistics
WHERE avg_breakthrough_score > 70
ORDER BY avg_breakthrough_score DESC;

-- Get all labels for a specific concept
SELECT tn.tag, tn.content, ul.label
FROM tag_nodes tn
JOIN user_labels ul ON tn.id = ul.node_id
WHERE tn.tag = '#your-tag';
```

## 4. Data Sanitization

All text stored in PostgreSQL is automatically sanitized to ensure clean, queryable data.

### What gets cleaned:

- Emojis and special characters
- Markdown formatting (bold, italic, links, etc.)
- HTML tags
- Control characters
- Excessive whitespace

### Sanitization functions available:

- `removeEmojis(text)`: Remove all emojis
- `removeMarkdownFormatting(text)`: Remove markdown syntax
- `removeHtmlTags(text)`: Remove HTML tags
- `normalizeWhitespace(text)`: Normalize whitespace
- `sanitizeText(text)`: Full sanitization pipeline

## 5. Dashboard Views

The plugin now includes multiple dashboard views that are automatically selected based on concept frequency:

- **High-Frequency View**: Full 8-section dashboard for concepts with ≥20 occurrences
- **Medium-Frequency View**: Moderate 5-section dashboard for 5-19 occurrences
- **Low-Frequency View**: Skeleton note for 1-4 occurrences
- **Coherence Factor View**: Detailed coherence analysis (3+ occurrences)
- **Breakthrough Factor View**: Innovation potential analysis (3+ occurrences)

## Configuration

All new features can be configured in the plugin settings:

### PostgreSQL Settings:

- Host, Port, Database, User, Password
- Enable/disable PostgreSQL integration
- Auto-sync after dashboard generation

### Analysis Settings:

- Minimum cluster size
- Maximum clusters
- Context window size

## Performance Notes

- PostgreSQL sync is asynchronous and won't block the UI
- Data sanitization is fast and happens in-memory
- Factor analysis runs in real-time during dashboard generation
- For large vaults (1000+ tags), consider disabling auto-sync

## Future Enhancements

Planned features for future releases:

- Word Ontology integration for semantic relationship mapping
- Graph visualization of concept relationships
- Export dashboards to multiple formats
- Batch operations for labeling and classification
- Machine learning-based concept clustering
- Integration with external knowledge bases

## Troubleshooting

### PostgreSQL Connection Issues:

- Ensure PostgreSQL is running: `systemctl status postgresql`
- Check credentials and database name
- Verify network connectivity if using remote database
- Check PostgreSQL logs for errors

### Build Issues:

- Run `npm install` to ensure all dependencies are installed
- Run `npm run build` to build the plugin
- Check console for error messages

### Performance Issues:

- Disable auto-sync for large vaults
- Reduce context window size
- Limit maximum clusters

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
