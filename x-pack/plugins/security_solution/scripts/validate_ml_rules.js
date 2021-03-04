/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const { keyBy } = require('lodash');
const { promisify } = require('util');
const path = require('path');
const glob = promisify(require('glob'));
const plimit = require('p-limit');
const readFile = promisify(require('fs').readFile);
const parseDuration = require('parse-duration');
const { table } = require('table');
const chalk = require('chalk');

async function loadRules() {
  const ruleGlob = path.resolve(
    __dirname,
    '../server/lib/detection_engine/rules/prepackaged_rules',
    '*.json'
  );

  const ruleFiles = await glob(ruleGlob);

  const limit = plimit(20);

  const rules = await Promise.all(
    ruleFiles.map((file) => limit(() => readFile(file).then((buf) => JSON.parse(buf.toString()))))
  );

  return rules.filter((rule) => rule.type === 'machine_learning');
}

async function loadModels() {
  const modelGlob = path.resolve(
    __dirname,
    '../../ml/server/models/data_recognizer/modules/**/*.json'
  );

  const modelFiles = await glob(modelGlob);

  const limit = plimit(20);

  const models = await Promise.all(
    modelFiles.map((file) =>
      limit(() =>
        readFile(file).then((buf) => {
          const model = JSON.parse(buf.toString());
          return {
            ...model,
            job_id: path.basename(file).replace('.json', ''),
          };
        })
      )
    )
  );

  return models.filter((model) => model.job_type === 'anomaly_detector');
}

async function run() {
  const [rules, models] = await Promise.all([loadRules(), loadModels()]);

  const modelsByJobId = keyBy(models, 'job_id');

  const rows = rules
    .map((rule) => {
      const from = rule.from;
      const lookback = parseDuration(from.match(/now-(\d+[mh])/)[1]);

      const model = modelsByJobId[rule.machine_learning_job_id];

      if (!model) {
        console.warn(`Model for ${rule.machine_learning_job_id} not found.`);
        return undefined;
      }

      const bucketSpan = parseDuration(model.analysis_config.bucket_span);

      const ratio = lookback / bucketSpan;

      let color = 'visible';
      let message = '✓';

      if (ratio <= 1) {
        color = 'red';
        message = 'Too short';
      } else if (ratio > 3) {
        color = 'yellow';
        message = 'Longer than necessary';
      }

      return [rule.name, ratio, chalk[color](message)];
    })
    .filter(Boolean);

  console.log(table(rows));
}

run();
