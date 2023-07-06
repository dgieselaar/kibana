/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Fs from 'fs';
import axios, { AxiosResponse } from 'axios';
import {
  ChatCompletionRequestMessage,
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
} from 'openai';
import inquirer from 'inquirer';
import yargs from 'yargs';
import chalk from 'chalk';
import ora from 'ora';

const functionToEndpointMap: Record<string, string> = {
  get_service_summary: '/internal/apm/assistant/get_service_summary',
  get_apm_chart: '/internal/apm/assistant/get_apm_chart',
  get_dependencies: '/internal/apm/assistant/get_downstream_dependencies',
};

const argv = yargs(process.argv)
  .option('input', {
    type: 'string',
    description: 'The location of the file, relative to the cwd',
    demandOption: true,
  })
  .option('key', {
    type: 'string',
    description: 'The OpenAI API key',
    demandOption: true,
  })
  .option('kibana', {
    alias: 'j',
    type: 'string',
    description:
      'The path of your Kibana instance where functions can be called. Must include the basePath',
    demandOption: true,
  })
  .help()
  .alias('help', 'h').argv;

const { key: apiKey, kibana: kibanaURL } = argv;

if (!apiKey) {
  throw new Error('OpenAI API key not provided');
}

const openAIClient = axios.create({
  baseURL: 'https://api.openai.com',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
});

const kibanaClient = axios.create({
  baseURL: kibanaURL,
  headers: {
    'kbn-xsrf': 'foo',
    'Content-Type': 'application/json',
  },
});
// Parse the JSON blob from the piped input
let request: CreateChatCompletionRequest = JSON.parse(
  Fs.readFileSync(argv.input).toString('utf-8')
);

const log = console.log;

function render() {
  console.clear();
  request.messages.forEach((message) => {
    if (message.role === 'system') {
      log(chalk.blueBright(`${chalk.bold(`[System]`)} ${message.content!}`));
    } else if (message.role === 'assistant') {
      if (message.content) {
        log(chalk.green(`${chalk.bold('[Assistant]')} ${message.content}`));
      }
      if (message.function_call) {
        log(
          chalk.green(
            `${chalk.bold(`[Assistant]`)} ${message.function_call.name}(${
              message.function_call.arguments
            })`
          )
        );
      }
    } else if (message.role === 'user') {
      log(`${chalk.bold(`[User]`)} ${message.content!}`);
    } else if (message.role === 'function') {
      log(`${chalk.bold(`[Function]`)} ${message.content}`);
    }
    log(``);
  });
}

async function promptAndNext() {
  const userInput = await inquirer.prompt([
    { name: 'response', message: `Response` },
  ]);

  if (userInput) {
    append({
      role: 'user',
      content: userInput.response,
    });

    return getNext();
  }

  return Promise.resolve(undefined);
}

function append(next: ChatCompletionRequestMessage) {
  request = {
    ...request,
    messages: [...request.messages, next],
  };
  render();
}

const spinner = ora('Waiting for response');

async function getNext(): Promise<any> {
  spinner.start();

  const response = (await openAIClient.post(
    '/v1/chat/completions',
    request
  )) as AxiosResponse<CreateChatCompletionResponse>;

  if (response.status >= 400) {
    console.error(
      `Request failed with a ${response.status}\n${JSON.stringify(
        response.data
      )}`
    );
    process.exit(1);
  }

  const message = response.data.choices[0].message!;

  append(message);

  if (message.function_call?.name) {
    const functionReply = await kibanaClient.post(
      functionToEndpointMap[message.function_call.name],
      message.function_call.arguments
        ? {
            now: new Date().getTime(),
            args: JSON.parse(message.function_call.arguments),
          }
        : {}
    );
    append({
      role: 'function',
      name: message.function_call.name,
      content: JSON.stringify(
        'content' in functionReply.data
          ? functionReply.data.content
          : functionReply.data
      ),
    });

    return getNext();
  }

  spinner.stop();

  return promptAndNext();
}

render();

let promise: Promise<any>;

if (request.messages[request.messages.length - 1].role !== 'user') {
  promise = promptAndNext();
} else {
  promise = getNext();
}

promise.catch((err) => {
  log('');
  log('');

  if (axios.isAxiosError(err)) {
    console.error(err.toJSON());
  } else {
    console.error(err);
  }
  process.exit(1);
});
