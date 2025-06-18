/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runRecipe } from '@kbn/inference-cli';
import { loadHuggingFaceDatasets } from '../src/hf_dataset_loader/load_hugging_face_datasets';

runRecipe(
  {
    name: 'knowledge_base',
    flags: {
      string: ['prompt'],
      help: `
        --prompt      The user prompt for asking a knowledge-based question
      `,
    },
  },
  async ({ inferenceClient, kibanaClient, flags, esClient, logger, log, signal }) => {
    await loadHuggingFaceDatasets({
      esClient,
      logger,
    });
  }
);
