"""
Skill Evaluation Dataset Preprocessing
Builds training pairs from SQuAD 2.0 or generates synthetic QA pairs.
Each sample: (question, candidate_answer, reference_answer, score 0-10)
"""

import json
import random
import numpy as np
from pathlib import Path
import argparse


def preprocess_squad(squad_json_path: str, out_dir: str):
    """Parse SQuAD 2.0 JSON and create training pairs."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    with open(squad_json_path) as f:
        data = json.load(f)

    samples = []
    for article in data['data']:
        for para in article['paragraphs']:
            for qa in para['qas']:
                if qa.get('is_impossible') or not qa.get('answers'):
                    continue
                question  = qa['question']
                reference = qa['answers'][0]['text']
                # Simulate candidate variation: 70% correct, 30% partial
                for _ in range(3):
                    frac = random.gauss(0.8, 0.2)
                    frac = max(0.0, min(1.0, frac))
                    words = reference.split()
                    keep = max(1, int(len(words) * frac))
                    candidate = ' '.join(random.sample(words, keep))
                    score = round(frac * 10, 1)
                    samples.append({
                        'question':  question,
                        'candidate': candidate,
                        'reference': reference,
                        'score':     score,
                    })

    random.shuffle(samples)
    n      = len(samples)
    n_train = int(n * 0.8)
    n_val   = int(n * 0.1)

    splits = {
        'train': samples[:n_train],
        'val':   samples[n_train:n_train+n_val],
        'test':  samples[n_train+n_val:],
    }
    for split, data_split in splits.items():
        p = out / f'{split}.json'
        with open(p, 'w') as f:
            json.dump(data_split, f, indent=2)
        print(f"[{split:5s}] {len(data_split)} pairs saved → {p}")

    print("✅ SQuAD preprocessing complete.")


def generate_synthetic_qa_pairs(out_dir: str, samples_per_split: dict = None):
    """
    Generate realistic synthetic QA pairs for skill evaluation training.
    Covers: Python, algorithms, system design, behavioral, SQL topics.
    """
    if samples_per_split is None:
        samples_per_split = {'train': 3000, 'val': 400, 'test': 400}

    # Topic-specific QA templates
    qa_templates = [
        {
            'question': 'What is a Python decorator and how does it work?',
            'reference': 'A decorator is a function that wraps another function to extend its behavior without '
                         'modifying it directly. It uses @syntax and leverages closures. Common uses include '
                         'logging, authorization, caching, and timing.',
            'keywords': ['function', 'wrap', 'extend', 'closure', 'syntax', 'logging'],
        },
        {
            'question': 'Explain the difference between TCP and UDP.',
            'reference': 'TCP is connection-oriented with guaranteed delivery, ordering, and error checking via '
                         'three-way handshake. UDP is connectionless, faster, with no delivery guarantee. '
                         'TCP is used for HTTP, FTP; UDP for DNS, video streaming.',
            'keywords': ['connection', 'reliable', 'handshake', 'connectionless', 'ordering', 'streaming'],
        },
        {
            'question': 'What is a binary search tree (BST) and its time complexity?',
            'reference': 'A BST is a tree where each node\'s left subtree has smaller values and right subtree '
                         'larger values. Search, insert, delete are O(log n) average. In worst case (skewed) O(n). '
                         'Balanced BSTs like AVL guarantee O(log n).',
            'keywords': ['tree', 'node', 'left', 'right', 'O(log n)', 'balanced', 'insert', 'delete'],
        },
        {
            'question': 'How does garbage collection work in Java?',
            'reference': 'Java uses automatic garbage collection to reclaim heap memory for unreachable objects. '
                         'The JVM uses generations: young, old, permanent. Algorithms include mark-and-sweep, '
                         'copying, and generational GC. Stop-the-world pauses can affect latency.',
            'keywords': ['heap', 'unreachable', 'JVM', 'mark-and-sweep', 'generational', 'young', 'old'],
        },
        {
            'question': 'What is a REST API and its core principles?',
            'reference': 'REST is an architectural style using HTTP methods (GET, POST, PUT, DELETE). '
                         'Core principles: statelessness, uniform interface, client-server, cacheability, '
                         'layered system. Resources identified by URIs, data returned as JSON/XML.',
            'keywords': ['stateless', 'HTTP', 'GET', 'POST', 'URI', 'resource', 'JSON', 'uniform'],
        },
        {
            'question': 'Explain SQL JOIN types with examples.',
            'reference': 'INNER JOIN returns matching rows from both tables. LEFT JOIN returns all left rows and '
                         'matching right. RIGHT JOIN is opposite. FULL OUTER JOIN returns all rows with NULLs '
                         'for non-matches. CROSS JOIN is cartesian product.',
            'keywords': ['INNER', 'LEFT', 'RIGHT', 'OUTER', 'NULL', 'matching', 'cartesian'],
        },
        {
            'question': 'What is machine learning overfitting and how do you prevent it?',
            'reference': 'Overfitting occurs when a model learns training noise instead of signal, performing well '
                         'on training but poorly on test data. Prevention: regularization (L1/L2), dropout, '
                         'cross-validation, more training data, early stopping, simpler models.',
            'keywords': ['training', 'test', 'regularization', 'dropout', 'noise', 'cross-validation', 'early stopping'],
        },
        {
            'question': 'Describe the CAP theorem in distributed systems.',
            'reference': 'CAP theorem states a distributed system can guarantee only 2 of 3: Consistency '
                         '(all nodes see same data), Availability (every request gets response), Partition Tolerance '
                         '(works despite network partitions). Most systems trade consistency for availability (CP vs AP).',
            'keywords': ['consistency', 'availability', 'partition', 'distributed', 'nodes', 'tolerance'],
        },
    ]

    rng = random.Random(42)
    out = Path(out_dir)

    def make_sample(template: dict) -> dict:
        """Generate a candidate answer with random partial knowledge."""
        ref_words = template['reference'].split()
        keywords  = template['keywords']

        # Decide knowledge level: high (0.7-1.0), medium (0.4-0.7), low (0.1-0.4)
        level = rng.choice(['high', 'medium', 'low'], weights=[0.4, 0.4, 0.2]) if hasattr(rng, 'choices') else \
                rng.choices(['high', 'medium', 'low'], weights=[0.4, 0.4, 0.2])[0]

        level_range = {'high': (0.7, 1.0), 'medium': (0.4, 0.7), 'low': (0.1, 0.4)}
        lo, hi = level_range[level]
        frac = rng.uniform(lo, hi)

        # Candidate answer: keep random fraction of reference + inject some keywords
        keep_n = max(3, int(len(ref_words) * frac))
        shuffled = rng.sample(ref_words, min(keep_n, len(ref_words)))

        # Add some correct keywords at high/medium level
        if level in ('high', 'medium'):
            n_kw = int(len(keywords) * frac)
            shuffled += rng.sample(keywords, min(n_kw, len(keywords)))

        candidate = ' '.join(shuffled)
        score = round(frac * 10, 1)

        return {
            'question':  template['question'],
            'candidate': candidate,
            'reference': template['reference'],
            'keywords':  keywords,
            'score':     score,
        }

    print(f"🔧 Generating synthetic skill QA dataset...")
    for split, n in samples_per_split.items():
        samples = [make_sample(rng.choice(qa_templates)) for _ in range(n)]
        p = out / f'{split}.json'
        out.mkdir(parents=True, exist_ok=True)
        with open(p, 'w') as f:
            json.dump(samples, f, indent=2)

        avg_score = sum(s['score'] for s in samples) / len(samples)
        print(f"  [{split:5s}] {n} pairs | avg score: {avg_score:.2f}/10 → {p}")

    print("✅ Synthetic skill dataset generated.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--squad', type=str, default=None, help='Path to SQuAD train-v2.0.json')
    parser.add_argument('--out',   type=str, default='data/skill_processed')
    args = parser.parse_args()

    if args.squad and Path(args.squad).exists():
        preprocess_squad(args.squad, args.out)
    else:
        print("⚠️  No SQuAD file — using synthetic mode")
        generate_synthetic_qa_pairs(args.out)
