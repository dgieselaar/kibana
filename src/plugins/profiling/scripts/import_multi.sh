multielasticdump \
  --input=./profiling-dump \
  --output=http://admin:changeme@localhost:9200 \
  --limit=10000 \
  --direction=load \
  --ignoreChildError
