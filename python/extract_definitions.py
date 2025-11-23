#!/usr/bin/env python3
"""
Extract definitions of concepts from sentences using NLP and pattern matching.
"""

import sys
import json
import re
from pathlib import Path

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    print("Warning: spaCy not available. Using pattern matching only.", file=sys.stderr)


def extract_author_from_citation(sentence):
    """Try to extract author name from citation patterns."""
    # Pattern: "According to Smith," or "Smith (2020) defines"
    patterns = [
        r'(?:according to|as)\s+([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)?)',
        r'([A-Z][a-z]+(?:\s+et al\.?)?)\s+\(\d{4}\)',
        r'\[\[([^\]]+)\]\]',  # Obsidian link
    ]

    for pattern in patterns:
        match = re.search(pattern, sentence)
        if match:
            return match.group(1)

    return None


def extract_definitions_pattern_matching(tag, sentences):
    """Extract definitions using regex patterns."""
    definitions = []
    clean_tag = tag.replace('#', '')

    # Definition patterns
    patterns = [
        (rf'\b{clean_tag}\b\s+is defined as\s+(.+?)(?:\.|$)', 0.9),
        (rf'\b{clean_tag}\b\s+refers to\s+(.+?)(?:\.|$)', 0.8),
        (rf'\b{clean_tag}\b\s+means\s+(.+?)(?:\.|$)', 0.8),
        (rf'\b{clean_tag}\b\s+is\s+(?:a|an|the)\s+(.+?)(?:\.|$)', 0.7),
        (rf'by\s+{clean_tag}\s+(?:I|we)\s+mean\s+(.+?)(?:\.|$)', 0.9),
        (rf'\b{clean_tag}\b\s+can be understood as\s+(.+?)(?:\.|$)', 0.8),
        (rf'the term\s+{clean_tag}\s+(?:describes|denotes)\s+(.+?)(?:\.|$)', 0.8),
        (rf'\b{clean_tag}\b:\s+(.+?)(?:\.|$)', 0.6),
    ]

    for sent_obj in sentences:
        sentence = sent_obj['text']
        for pattern, score in patterns:
            match = re.search(pattern, sentence, re.IGNORECASE)
            if match:
                author = extract_author_from_citation(sentence)
                definitions.append({
                    'text': sentence,
                    'file': sent_obj['file'],
                    'line': sent_obj.get('line'),
                    'author': author,
                    'score': score,
                    'definition_part': match.group(1).strip()
                })
                break  # Only match once per sentence

    return definitions


def extract_definitions_nlp(tag, sentences):
    """Extract definitions using spaCy NLP (more sophisticated)."""
    if not SPACY_AVAILABLE:
        return extract_definitions_pattern_matching(tag, sentences)

    try:
        # Try to load English model
        nlp = spacy.load('en_core_web_sm')
    except OSError:
        print("spaCy model not found. Using pattern matching.", file=sys.stderr)
        return extract_definitions_pattern_matching(tag, sentences)

    definitions = []
    clean_tag = tag.replace('#', '').lower()

    for sent_obj in sentences:
        sentence = sent_obj['text']
        doc = nlp(sentence)

        # Look for copula constructions (X is Y)
        for token in doc:
            if token.lemma_ == clean_tag or token.text.lower() == clean_tag:
                # Check if followed by "is/are/was/were"
                for child in token.children:
                    if child.dep_ == 'cop' or child.lemma_ in ['be', 'is', 'are', 'was', 'were']:
                        # This might be a definition
                        author = extract_author_from_citation(sentence)
                        definitions.append({
                            'text': sentence,
                            'file': sent_obj['file'],
                            'line': sent_obj.get('line'),
                            'author': author,
                            'score': 0.75
                        })
                        break
                break

    # Also run pattern matching
    pattern_defs = extract_definitions_pattern_matching(tag, sentences)

    # Merge and deduplicate
    seen_texts = set()
    all_defs = []
    for d in definitions + pattern_defs:
        if d['text'] not in seen_texts:
            seen_texts.add(d['text'])
            all_defs.append(d)

    return all_defs


def rank_definitions(definitions):
    """Rank definitions by quality."""
    # Sort by score, then by sentence length (longer often better for definitions)
    return sorted(definitions,
                 key=lambda d: (d.get('score', 0.5), len(d['text'])),
                 reverse=True)


def main():
    if len(sys.argv) != 3:
        print("Usage: extract_definitions.py <input_json> <output_json>", file=sys.stderr)
        sys.exit(1)

    input_file = Path(sys.argv[1])
    output_file = Path(sys.argv[2])

    # Read input
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    tag = data['tag']
    sentences = data['sentences']

    # Extract definitions
    try:
        definitions = extract_definitions_nlp(tag, sentences)
    except Exception as e:
        print(f"Error during NLP extraction: {e}", file=sys.stderr)
        definitions = extract_definitions_pattern_matching(tag, sentences)

    # Rank and limit
    definitions = rank_definitions(definitions)[:10]  # Top 10

    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(definitions, f, indent=2, ensure_ascii=False)

    print(f"Found {len(definitions)} definitions", file=sys.stderr)


if __name__ == '__main__':
    main()
