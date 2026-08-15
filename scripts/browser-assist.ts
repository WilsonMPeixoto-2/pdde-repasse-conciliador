import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';
import { stdin as input, stdout as output } from 'node:process';
import {
  collectWithAssistedBrowser,
  type HumanInterventionContext,
} from '../backend/adapters/browser-assisted-source';

export interface BrowserAssistCliOptions {
  url: string;
  output?: string;
  interactive: boolean;
}

export function parseBrowserAssistArgs(args: readonly string[]): BrowserAssistCliOptions {
  if (args.length === 0) throw new Error('Informe uma URL HTTP/HTTPS para o browser assistido.');
  const rawUrl = args[0];
  if (!rawUrl || rawUrl.startsWith('--')) throw new Error('Informe uma URL HTTP/HTTPS para o browser assistido.');
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('A URL do browser assistido deve usar HTTP ou HTTPS.');
  }

  let outputPath: string | undefined;
  let interactive = true;
  for (let index = 1; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--output') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error('O parâmetro --output exige um caminho.');
      outputPath = value;
      index += 1;
      continue;
    }
    if (token === '--headless') {
      interactive = false;
      continue;
    }
    throw new Error(`Parâmetro desconhecido: ${token}.`);
  }

  return {
    url: parsed.toString(),
    ...(outputPath ? { output: outputPath } : {}),
    interactive,
  };
}

async function awaitHumanIntervention(context: HumanInterventionContext): Promise<void> {
  const rl = createInterface({ input, output });
  try {
    output.write(`\nDesafio interativo detectado em ${context.url}\n`);
    output.write(`${context.reasons.join('\n')}\n`);
    await rl.question('Resolva o CAPTCHA/desafio no navegador aberto e pressione Enter para continuar. ');
  } finally {
    rl.close();
  }
}

export async function runBrowserAssistCli(args = process.argv.slice(2)): Promise<void> {
  const options = parseBrowserAssistArgs(args);
  const result = await collectWithAssistedBrowser({
    url: options.url,
    interactive: options.interactive,
    ...(options.interactive ? { onIntervention: awaitHumanIntervention } : {}),
  });

  if (options.output) {
    const target = resolve(options.output);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, result.html, 'utf8');
    output.write(`HTML final preservado em ${target}\n`);
  }
  output.write(
    `Coleta concluída: ${result.sourceUrl}; intervenção humana: ${result.humanInterventionUsed ? 'sim' : 'não'}; `
      + `intervenções: ${result.interventions}.\n`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  runBrowserAssistCli().catch((cause) => {
    const message = cause instanceof Error ? cause.message : String(cause);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
