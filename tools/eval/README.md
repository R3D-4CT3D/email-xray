# Corpus evaluation

Runs the real analyzer over large sets of real emails and reports how much phishing it catches and how much legitimate mail it flags. Use it before and after every change to checks or scoring.

```bash
npm run eval                                   # headline numbers for both corpora
node tools/eval/eval.js --misses 30 corpus/nazario/phishing-2025              # phishing: findings and misses
node tools/eval/eval.js --label ham --misses 30 corpus/spamassassin/easy_ham  # legitimate: false positives
```

"Caught" and "false positive" both mean a verdict of Suspicious or worse (score 30 and up).

## Getting the corpora

They live in `corpus/`, which git ignores. **Never commit them.** They contain real people's mail. Publish only aggregate numbers.

```bash
mkdir -p corpus/nazario corpus/spamassassin
for y in 2024 2025; do curl -o corpus/nazario/phishing-$y https://monkey.org/~jose/phishing/phishing-$y; done
cd corpus/spamassassin
for f in 20030228_easy_ham 20030228_easy_ham_2 20030228_hard_ham; do
  curl -O https://spamassassin.apache.org/old/publiccorpus/$f.tar.bz2 && tar xjf $f.tar.bz2 && rm $f.tar.bz2
done
```

| Corpus | What it is | Limits |
|---|---|---|
| [Nazario phishing corpus](https://monkey.org/~jose/phishing/), 2024 and 2025 | 883 real phishing emails with full headers, hand-classified. CC-BY-4.0, by Jose Nazario | One inbox, so it leans toward mailbox credential phishing |
| [SpamAssassin public corpus](https://spamassassin.apache.org/old/publiccorpus/), easy_ham, easy_ham_2, hard_ham | 4,150 legitimate emails with headers | From 2002: no DMARC, mostly http links and mailing lists, and server clocks that drift. Treat its false positive rate as a rough guide |

Legitimate mail with modern headers (banks, stores, newsletters from 2024 on) is still the gap. Your own inbox, exported as `.eml` with your address replaced, is the best source.
