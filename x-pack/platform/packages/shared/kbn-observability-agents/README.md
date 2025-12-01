# @kbn/observability-agents

Simple reference implementation of an agent that analyzes the health of a "thing" in the system. It roughly works as follows:

- 1000 documents are fetched and aggregated into a single data structure that describes the available field/value pairs for the given thing
- All signal definitions and signals for the given thing are fetched. These are alerting rules/alerts, anomaly detection jobs/anomalies, and SLO definitions/SLOs.
- Log patterns are extracted via text categorization and a labeling process. The labeling is used to drop uninteresting log patterns (no changes, indicative of normal operations)
- The LLM is asked to generate ES|QL queries for key health indicators, including change points

Finally, based on the log patterns, key metrics, and signals, the LLM will be asked to determine whether a further investigation is needed. This further investigation could include:

- Correlation analysis
- Outlier analysis
- Timeline of change events in the system (such as releases, config changes)
- Dependency analysis

## Notes

- The system prompt is generated using [@kbn/inference-prompt-utils](../kbn-inference-prompt-utils/README.md).
