#!/usr/bin/env bash
# Usage: compress-batch.sh <start_line_1indexed> <count>
# Compresses that slice of tools/.video-jobs.tsv (src<TAB>out per line).
set -u
cd "$(dirname "$0")/.."
START="${1:-1}"
COUNT="${2:-40}"
TOTAL=$(wc -l < tools/.video-jobs.tsv | tr -d ' ')
sed -n "${START},$((START+COUNT-1))p" tools/.video-jobs.tsv > /tmp/.batch.tsv
BATCH_N=$(wc -l < /tmp/.batch.tsv | tr -d ' ')
if [ "$BATCH_N" -eq 0 ]; then
  echo "DONE total=$TOTAL nothing left at start=$START"
  exit 0
fi
export -f 2>/dev/null || true
while IFS=$'\t' read -r SRCF OUTF; do
  echo "$SRCF" >> /tmp/.batch_only_src.txt
done < /tmp/.batch.tsv
cat /tmp/.batch.tsv | xargs -P 3 -I{} -d '\n' bash -c '
  line="{}"
  src="${line%%$(printf "\t")*}"
  out="${line#*$(printf "\t")}"
  ffmpeg -y -loglevel error -i "$src" -vf "scale=w=480:h=-2" -r 24 -an -c:v libx264 -preset veryfast -crf 30 -movflags +faststart "$out" || echo "FAILED: $src" >> tools/.video-fail.log
'
rm -f /tmp/.batch.tsv /tmp/.batch_only_src.txt
NEXT=$((START+COUNT))
echo "processed=${BATCH_N} range=${START}-$((START+BATCH_N-1)) total=${TOTAL} next_start=${NEXT}"
if [ "$NEXT" -gt "$TOTAL" ]; then echo "DONE"; fi
