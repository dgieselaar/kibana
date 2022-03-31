multielasticdump \
  --input="https://${ELASTIC_AUTH}@profiling-es.35.240.6.93.ip.es.io/" \
  --match="(dario-prof-events|profiling-stacktraces|profiling-stackframes)" \
  --output=./profiling-dump \
  --limit=10000 \
  --direction=dump \
  --support-big-int \
  --searchBody='
{
  "query": {
    "bool": {
      "filter": [
        {
          "bool": {
            "should": [
              {
                "bool": {
                  "filter": [
                    {
                      "term": {
                        "ProjectID": 5
                      }
                    },
                    {
                      "range": {
                        "@timestamp": {
                          "gte": "now-24h",
                          "lt": "now"
                        }
                      }
                    }
                  ]
                }
              },
              {
                "bool": {
                  "filter": [
                    {
                      "range": {
                        "LastSeen": {
                          "gte": "now-24h",
                          "lt": "now"
                        }
                      }
                    }
                  ]
                }
              }
            ],
            "minimum_should_match": 1
          }
        }
      ]
    }
  }
}'
