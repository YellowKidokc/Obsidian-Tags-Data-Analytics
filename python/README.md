# Python NLP Scripts for Concept Dashboard

These scripts provide NLP-powered analysis for tag/concept dashboards.

## Setup

1. Install Python 3.8 or higher

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Download spaCy language model (optional, for better definition extraction):
```bash
python -m spacy download en_core_web_sm
```

## Scripts

### cluster_contexts.py
Clusters tag occurrences into semantic groups using sentence embeddings.

**Input:** JSON with tag contexts
**Output:** JSON with semantic clusters, keywords, and representative snippets

### extract_definitions.py
Extracts definition sentences for a concept using pattern matching and NLP.

**Input:** JSON with tag sentences
**Output:** JSON with ranked definitions

## Fallback Behavior

If dependencies are not available, scripts fall back to simpler pattern-matching approaches that work without ML libraries.
