export type DevOpsPlatform = 'azure-devops' | 'github-actions' | 'teamcity' | 'unknown';

export interface DevOpsVariable {
  name: string;
  value: string;
}

export function detectDevOpsPlatform(): DevOpsPlatform {
  if (process.env.AZURE_HTTP_USER_AGENT || process.env.AZUREPS_HOST_ENVIRONMENT) {
    return 'azure-devops';
  }
  if (process.env.GITHUB_ACTIONS === 'true') {
    return 'github-actions';
  }
  if (process.env.TEAMCITY_VERSION) {
    return 'teamcity';
  }
  return 'unknown';
}

export function setDevOpsVariable(name: string, value: string): void {
  const platform = detectDevOpsPlatform();
  
  switch (platform) {
    case 'azure-devops':
      console.log(`##vso[task.setvariable variable=${name}]${value}`);
      break;
    case 'github-actions':
      console.log(`::set-output name=${name}::${value}`);
      break;
    case 'teamcity':
      console.log(`##teamcity[setParameter name='${name}' value='${value}']`);
      break;
    default:
      break;
  }
}

export function setDevOpsVariables(variables: DevOpsVariable[]): void {
  variables.forEach(({ name, value }) => {
    setDevOpsVariable(name, value);
  });
}