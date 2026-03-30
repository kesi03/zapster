import yargs from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import { parse as parseToml, stringify as stringifyToml } from '@iarna/toml';
import { log } from '../../utils/logger';

interface GenerateTomlArgs {
  input: string;
  output?: string;
  prefix?: string;
  verbose?: boolean;
}

function resolveEnvVars(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return obj.replace(/\$\{(\w+)(?::-([^}]*))?\}/g, (_, key, defaultVal) => {
      const val = process.env[key];
      if (val === undefined) {
        if (defaultVal !== undefined) {
          return defaultVal;
        }
        log.warn(`Warning: Environment variable ${key} is not set`);
        return '';
      }
      return val;
    }).replace(/\$(\w+)/g, (_, key) => {
      const val = process.env[key];
      if (val === undefined) {
        log.warn(`Warning: Environment variable ${key} is not set`);
        return '';
      }
      return val;
    });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(resolveEnvVars);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveEnvVars(value);
    }
    return result;
  }
  
  return obj;
}

export const generateTomlCommand: yargs.CommandModule = {
  command: 'generate-toml',
  describe: 'Generate a TOML file from a template with environment variable substitution',
  builder: (yargs) => {
    return yargs
      .option('input', {
        alias: 'i',
        type: 'string',
        demandOption: true,
        description: 'Input TOML template file',
      })
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output TOML file (default: input filename with .generated.toml suffix)',
      })
      .option('prefix', {
        alias: 'x',
        type: 'string',
        description: 'Environment variable prefix to add to variables in template',
      })
      .option('verbose', {
        alias: 'v',
        type: 'boolean',
        default: false,
        description: 'Show verbose output including resolved values',
      });
  },
  handler: async (argv) => {
    const args = argv as unknown as GenerateTomlArgs;
    
    const inputPath = path.resolve(args.input);
    
    if (!fs.existsSync(inputPath)) {
      log.error(`Input file not found: ${inputPath}`);
      process.exit(1);
    }

    log.info(`Reading template: ${inputPath}`);
    
    let content = fs.readFileSync(inputPath, 'utf-8');
    
    if (args.prefix) {
      log.info(`Using prefix: ${args.prefix}`);
      content = content.replace(/\$\{(\w+)(?::-([^}]*))?\}/g, (_, key, defaultVal) => `\${${args.prefix}${key}:-${defaultVal || ''}}`);
    }
    
    const resolvedContent = resolveEnvVars(content);
    
    const parsed = parseToml(resolvedContent);
    
    if (args.verbose) {
      log.info('Resolved values:');
      console.log(JSON.stringify(parsed, null, 2));
    }
    
    const outputPath = args.output 
      ? path.resolve(args.output)
      : path.join(path.dirname(inputPath), `${path.basename(inputPath, path.extname(inputPath))}.generated${path.extname(inputPath)}`);
    
    const output = stringifyToml(parsed);
    fs.writeFileSync(outputPath, output, 'utf-8');
    
    log.success(`Generated: ${outputPath}`);
  },
};
