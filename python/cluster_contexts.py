#!/usr/bin/env python3
"""
Cluster tag contexts into semantic groups using NLP.
Uses sentence embeddings and clustering to find different meanings/usages.
"""

import sys
import json
from pathlib import Path

try:
    from sentence_transformers import SentenceTransformer
    from sklearn.cluster import DBSCAN
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    DEPENDENCIES_AVAILABLE = True
except ImportError:
    DEPENDENCIES_AVAILABLE = False
    print("Warning: NLP dependencies not available. Install with: pip install sentence-transformers scikit-learn", file=sys.stderr)


def extract_keywords(texts, top_n=10):
    """Extract most common meaningful words from texts."""
    from collections import Counter
    import re

    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
        'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these',
        'those', 'it', 'its', 'as', 'also', 'into', 'through', 'during',
        'before', 'after', 'above', 'below', 'between', 'under', 'again',
        'further', 'then', 'once'
    }

    words = []
    for text in texts:
        # Extract words, remove punctuation
        text_words = re.findall(r'\b[a-z]+\b', text.lower())
        words.extend([w for w in text_words if len(w) > 3 and w not in stop_words])

    counter = Counter(words)
    return [word for word, _ in counter.most_common(top_n)]


def generate_cluster_summary(tag, texts, keywords):
    """Generate a human-readable summary of a cluster."""
    if len(texts) == 1:
        return f"Single usage of {tag}"

    # Simple heuristic: use top keywords
    if keywords:
        keyword_str = ', '.join(keywords[:3])
        return f"{tag} in the context of {keyword_str}"
    else:
        return f"Usage of {tag}"


def cluster_contexts_advanced(data):
    """Cluster contexts using sentence embeddings."""
    if not DEPENDENCIES_AVAILABLE:
        return fallback_clustering(data)

    tag = data['tag']
    contexts = data['contexts']
    max_clusters = data.get('maxClusters', 5)
    min_cluster_size = data.get('minClusterSize', 3)

    if len(contexts) < min_cluster_size:
        return fallback_clustering(data)

    # Load model (using a smaller, faster model)
    print("Loading sentence transformer model...", file=sys.stderr)
    model = SentenceTransformer('all-MiniLM-L6-v2')

    # Get embeddings
    sentences = [ctx['sentence'] for ctx in contexts]
    embeddings = model.encode(sentences)

    # Cluster using DBSCAN (density-based, auto-determines number of clusters)
    # eps: maximum distance between samples in the same cluster
    # min_samples: minimum cluster size
    clustering = DBSCAN(eps=0.3, min_samples=min(min_cluster_size, len(contexts) // 3))
    labels = clustering.fit_predict(embeddings)

    # Group by cluster
    clusters_dict = {}
    for idx, label in enumerate(labels):
        if label == -1:  # Noise points
            label = 999  # Put in separate cluster
        if label not in clusters_dict:
            clusters_dict[label] = []
        clusters_dict[label].append(idx)

    # Limit number of clusters
    if len(clusters_dict) > max_clusters:
        # Merge smallest clusters
        sorted_clusters = sorted(clusters_dict.items(), key=lambda x: len(x[1]), reverse=True)
        clusters_dict = dict(sorted_clusters[:max_clusters])

    # Build result
    results = []
    for cluster_id, indices in clusters_dict.items():
        cluster_texts = [contexts[i]['sentence'] for i in indices]
        keywords = extract_keywords(cluster_texts, top_n=8)

        # Find most representative snippet (closest to centroid)
        cluster_embeddings = embeddings[indices]
        centroid = np.mean(cluster_embeddings, axis=0)
        similarities = cosine_similarity([centroid], cluster_embeddings)[0]
        top_indices = np.argsort(similarities)[-3:][::-1]  # Top 3 most representative

        representative_snippets = [
            {
                'text': contexts[indices[i]]['sentence'],
                'file': contexts[indices[i]]['file'],
                'line': contexts[indices[i]]['line'],
                'score': float(similarities[i])
            }
            for i in top_indices
        ]

        # Generate label
        if len(keywords) >= 2:
            label = f"{tag} & {', '.join(keywords[:2])}"
        else:
            label = f"{tag} (cluster {cluster_id + 1})"

        results.append({
            'label': label,
            'keywords': keywords,
            'summary': generate_cluster_summary(tag, cluster_texts, keywords),
            'indices': indices,
            'representative_snippets': representative_snippets,
            'size': len(indices)
        })

    return results


def fallback_clustering(data):
    """Simple fallback when advanced clustering unavailable."""
    tag = data['tag']
    contexts = data['contexts']

    keywords = extract_keywords([ctx['sentence'] for ctx in contexts], top_n=10)

    # Select top 3 sentences by length (longer = more informative heuristic)
    sorted_contexts = sorted(enumerate(contexts),
                            key=lambda x: len(x[1]['sentence']),
                            reverse=True)

    representative_snippets = [
        {
            'text': ctx['sentence'],
            'file': ctx['file'],
            'line': ctx['line'],
            'score': 1.0 - (i * 0.1)
        }
        for i, (idx, ctx) in enumerate(sorted_contexts[:3])
    ]

    return [{
        'label': f"All uses of {tag}",
        'keywords': keywords,
        'summary': f"General usage of {tag} across {len(contexts)} occurrences",
        'indices': list(range(len(contexts))),
        'representative_snippets': representative_snippets,
        'size': len(contexts)
    }]


def main():
    if len(sys.argv) != 3:
        print("Usage: cluster_contexts.py <input_json> <output_json>", file=sys.stderr)
        sys.exit(1)

    input_file = Path(sys.argv[1])
    output_file = Path(sys.argv[2])

    # Read input
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Cluster
    try:
        clusters = cluster_contexts_advanced(data)
    except Exception as e:
        print(f"Error during clustering: {e}", file=sys.stderr)
        clusters = fallback_clustering(data)

    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(clusters, f, indent=2, ensure_ascii=False)

    print(f"Created {len(clusters)} clusters", file=sys.stderr)


if __name__ == '__main__':
    main()
