I # Concept Dashboard Plugin for Obsidian

Generate rich, analytical dashboards for tags and concepts in your Obsidian vault. Transform your tags from simple markers into comprehensive knowledge hubs with automatic analysis, clustering, and insights.

## Features

### 🎯 Three-Tier Dashboard System

**High-Frequency Concepts** (≥20 mentions)
- Full 8-section dashboard
- Semantic clustering of different meanings
- Definition extraction from your notes
- Relationship mapping to other concepts
- Key passages and "greatest hits"
- Open questions and tensions
- Timeline analysis
- Further reading suggestions

**Medium-Frequency Concepts** (5-19 mentions)
- Moderate dashboard with 5 sections
- Context clustering
- Key passages
- Related concepts
- Open questions

**Low-Frequency Concepts** (1-4 mentions)
- Skeleton note
- Basic stats
- Key quotes
- Related concepts
- Placeholder for working definition

### 🤖 NLP-Powered Analysis

- **Semantic Clustering**: Uses sentence embeddings to group different uses/meanings of concepts
- **Definition Extraction**: Automatically finds sentences where concepts are defined
- **Co-occurrence Analysis**: Identifies which concepts appear together
- **Representative Snippets**: Selects the most informative quotes for each meaning
- **Question Generation**: Suggests open questions based on patterns in your notes

### 📊 Dashboard Structure

Each dashboard includes (depending on frequency tier):

1. **Snapshot** - Total occurrences, document count, first/last appearance, top co-occurring concepts
2. **Meanings in Corpus** - Different semantic clusters with context words and representative snippets
3. **Definitions** - From your sources, external references, and your working definitions
4. **Relations to Other Concepts** - Co-occurrence and semantic relationships
5. **Key Passages** - The most important quotes using this concept
6. **Open Questions** - Areas for further exploration
7. **Further Reading** - External resources
8. **Timeline** - When the concept appears over time

## Installation

### Plugin Installation

1. Copy this plugin folder to your vault's `.obsidian/plugins/` directory
2. Reload Obsidian
3. Enable "Concept Dashboard" in Settings → Community Plugins

### Python Setup (Optional but Recommended)

For advanced NLP features (semantic clustering, better definition extraction):

```bash
cd /path/to/vault/.obsidian/plugins/concept-dashboard
pip install -r python/requirements.txt
python -m spacy download en_core_web_sm
```

**The plugin works without Python**, but clustering and definition extraction will use simpler pattern-matching approaches.

## Usage

### Commands

Open the command palette (Cmd/Ctrl+P) and use:

- **Generate dashboard for tag** - Create/update dashboard for a specific tag
- **Generate all dashboards** - Create dashboards for all tags in your vault
- **Show tag statistics** - View distribution of tags by frequency
- **Refresh existing dashboards** - Update all existing dashboards

### Settings

Configure the plugin in Settings → Concept Dashboard:

**Thresholds**
- Set frequency thresholds (fixed numbers or percentiles)
- Default: ≥20 = high, 5-19 = medium, <5 = low

**Dashboard Generation**
- Dashboard folder location (default: `_Dashboards`)
- Auto-update options
- Update on vault change

**Analysis**
- Python path
- Context window size
- Clustering parameters

**External Integrations**
- Wikipedia definitions (coming soon)
- Semantic Scholar integration (coming soon)

## Example Dashboard

For a concept like `#information` with 102 occurrences:

```markdown
# Information

## 1. Snapshot
- Total occurrences: 102
- Documents: 7
- First appearance: [[Paper A]] (2024-01-15)
- Top co-occurring: quantum (68), observer (55), consciousness (40)

## 2. Meanings in my corpus

### 1. Information & Quantum
**Typical context words:** quantum, bits, entropy, measurement, state
**Summary:** Information as physical configurations and measurable states
**Representative snippets:**
- "Information in quantum systems..." — [[Paper A#L45]]

### 2. Information & Consciousness
**Typical context words:** observer, awareness, perception, mental
**Summary:** Information tied to what an observer can know or experience
...
```

## How It Works

1. **Tag Extraction**: Scans your vault for all tags (frontmatter + inline)
2. **Context Collection**: Gathers surrounding text for each tag occurrence
3. **Statistical Analysis**: Calculates frequencies, co-occurrences, timelines
4. **NLP Processing**:
   - Python scripts cluster contexts using sentence embeddings
   - Pattern matching + NLP extracts definitions
   - Generates insights and questions
5. **Dashboard Generation**: Creates formatted markdown notes with all insights

## Architecture

```
Plugin (TypeScript)
├── Tag Extraction (Obsidian API)
├── Statistics Calculation
├── Python Analysis (optional)
│   ├── Semantic Clustering (sentence-transformers)
│   ├── Definition Extraction (spaCy + patterns)
│   └── Keyword Extraction
└── Dashboard Generation (Pluggable View System)
    ├── High-Frequency View (≥20 occurrences)
    ├── Medium-Frequency View (5-19 occurrences)
    ├── Low-Frequency View (1-4 occurrences)
    └── Custom Views (extensible)
```

### 🎨 Pluggable View System

The plugin features a **production-grade pluggable view system** that allows you to:

- Create custom dashboard layouts
- Enable/disable view types
- Extend with your own views
- Control view selection and priorities

See **[PLUGGABLE_VIEWS.md](./PLUGGABLE_VIEWS.md)** for complete documentation on:
- Creating custom views
- View selection algorithm
- Configuration options
- Advanced features

## Use Cases

### Academic Research
- Track how concepts evolve across papers
- Identify different theoretical frameworks for same terms
- Find contradictions or tensions in usage
- Map relationships between ideas

### Knowledge Management
- Understand your knowledge structure
- Find gaps and opportunities for connection
- Identify over-used vs under-explored concepts
- Build working definitions of key ideas

### Writing Projects
- Ensure consistent usage of terms
- Identify different aspects of themes
- Find your best quotes on topics
- Generate questions for further development

## Customization

### Adjusting Thresholds

Your ideal thresholds depend on vault size:

- **Small vault** (< 50 notes): 10/3/1
- **Medium vault** (50-500 notes): 20/5/1 (default)
- **Large vault** (> 500 notes): 50/10/3

Use **Show tag statistics** to see your tag distribution and adjust accordingly.

### Dashboard Views

**NEW**: The plugin now uses a pluggable view system!

In Settings → Concept Dashboard → Dashboard Views:
- Enable/disable specific view types
- See which views are active
- Configure view priorities

For advanced customization:
- Create custom dashboard layouts
- Override existing views
- Add specialized views for your use cases

See [PLUGGABLE_VIEWS.md](./PLUGGABLE_VIEWS.md) for the complete guide.

### Analysis Parameters

- **Context window**: More context = better clustering but slower
- **Max clusters**: Increase for highly polysemous concepts
- **Min cluster size**: Decrease to split finer distinctions

## Roadmap

- [ ] Tag suggester UI for selecting tags
- [ ] Interactive graph view of concept relationships
- [ ] Timeline visualization
- [ ] Wikipedia integration for external definitions
- [ ] Semantic Scholar for related papers
- [ ] Export dashboards as PDF
- [ ] Concept maturity scoring
- [ ] Cross-vault comparison
- [ ] AI-powered summaries (optional OpenAI integration)

## Troubleshooting

**Python scripts failing?**
- Check Python path in settings
- Ensure dependencies installed: `pip install -r python/requirements.txt`
- Check console for error messages
- Plugin falls back to pattern matching if Python unavailable

**No dashboards generated?**
- Check dashboard folder exists
- Ensure tags exist in vault (use #tags or frontmatter)
- Check console for errors

**Clustering not working well?**
- Increase context window size
- Adjust min cluster size
- Try without Python (simpler grouping)

## Contributing

Contributions welcome! Areas for improvement:

- Better UI for tag selection
- More sophisticated clustering algorithms
- Additional external data sources
- Performance optimizations
- Localization

## License

MIT

## Credits

Built with:
- [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- [sentence-transformers](https://www.sbert.net/) for semantic analysis
- [spaCy](https://spacy.io/) for NLP
- [scikit-learn](https://scikit-learn.org/) for clustering
