import yargs from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import { ZapClient } from '../zap/ZapClient';
import { Alert } from '../types';

function generateJUnitXml(alerts: Alert[], title: string): string {
  const timestamp = new Date().toISOString();
  const testCases = alerts.map((alert) => {
    const className = `zap.${alert.risk.toLowerCase()}`;
    const isFailure = alert.risk === 'High' || alert.risk === 'Medium';
    
    return `
    <testcase name="${escapeXml(alert.alert)}" classname="${className}" time="0">
      ${isFailure ? `
      <failure message="${escapeXml(alert.alert)} on ${escapeXml(alert.url)}" type="security">
        <![CDATA[
Plugin ID: ${alert.pluginid}
Risk: ${alert.risk}
Confidence: ${alert.confidence}
URL: ${alert.url}
Parameter: ${alert.param}
Solution: ${alert.solution || 'N/A'}
        ]]>
      </failure>` : ''}
    </testcase>`;
  }).join('');

  const failures = alerts.filter(a => a.risk === 'High' || a.risk === 'Medium').length;

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="${escapeXml(title)}" tests="${alerts.length}" failures="${failures}" errors="0" skipped="0" timestamp="${timestamp}">
${testCases}
</testsuite>`;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const createJUnitResultsCommand: yargs.CommandModule = {
  command: 'createJUnitResults',
  describe: 'Generate JUnit test results from ZAP alerts',
  builder: (yargs) => {
    return yargs
      .option('output', {
        alias: 'o',
        type: 'string',
        demandOption: true,
        description: 'Output file path for JUnit XML',
      })
      .option('title', {
        alias: 't',
        type: 'string',
        default: 'ZAP Security Scan',
        description: 'Test suite title',
      })
      .option('base-url', {
        type: 'string',
        description: 'Filter alerts by base URL',
      });
  },
  handler: async (argv) => {
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    console.log('Generating JUnit results...');

    try {
      const alertsResponse = await zap.alerts.getAlerts(argv.baseUrl as string | undefined);
      const alerts = alertsResponse.alerts;

      console.log(`Found ${alerts.length} alerts`);

      const junitXml = generateJUnitXml(alerts, (argv.title as string) || 'ZAP Security Scan');

      const outputPath = path.resolve(argv.output as string);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, junitXml, 'utf-8');

      console.log(`JUnit results saved to: ${outputPath}`);
      console.log(`Test cases: ${alerts.length}`);
      console.log(`Failures: ${alerts.filter((a: Alert) => a.risk === 'High' || a.risk === 'Medium').length}`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
