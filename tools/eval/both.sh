#!/bin/sh
# Headline numbers for both local corpora: phishing caught and legitimate mail falsely flagged.
cd "$(dirname "$0")/../.." || exit 1
P=$(node tools/eval/eval.js --misses 0 corpus/nazario/phishing-2024 corpus/nazario/phishing-2025 | grep -E "^Caught")
H=$(node tools/eval/eval.js --label ham --misses 0 corpus/spamassassin/easy_ham corpus/spamassassin/easy_ham_2 corpus/spamassassin/hard_ham | grep -E "^False")
echo "Nazario 2024-25 phish: $P"
echo "SpamAssassin ham:      $H"
