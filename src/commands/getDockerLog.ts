import yargs from 'yargs';
import * as fs from 'fs';
import Docker from 'dockerode';
import { initLoggerWithWorkspace, getWorkspacePath } from '../utils/workspace';
import { log } from '../utils/logger';

const docker = new Docker();

function parseDockerLogs(buffer: Buffer): string {
  const lines: string[] = [];
  let offset = 0;
  
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) break;
    
    const streamType = buffer.readUInt8(offset);
    if (streamType !== 1 && streamType !== 2) {
      offset++;
      continue;
    }
    
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;
    
    if (offset + size > buffer.length) {
      const remaining = buffer.slice(offset).toString('utf-8').trim();
      if (remaining) lines.push(remaining);
      break;
    }
    
    const content = buffer.slice(offset, offset + size).toString('utf-8');
    const lineParts = content.split('\n');
    
    for (const part of lineParts) {
      const trimmed = part.trim();
      if (trimmed) {
        lines.push(trimmed);
      }
    }
    
    offset += size;
  }
  
  return lines.join('\n');
}

async function findContainerByImage(imageName: string): Promise<Docker.ContainerInfo | null> {
  const containers = await docker.listContainers({ all: true });
  return containers.find(c => 
    c.Image === imageName || 
    c.Image.startsWith(imageName)
  ) || null;
}

export const getDockerLogCommand: yargs.CommandModule = {
  command: 'getDockerLog',
  describe: 'Get Docker container logs and write to agent.log',
  builder: (yargs) => {
    return yargs
      .option('container', {
        alias: 'c',
        type: 'string',
        description: 'Docker container name or ID',
      })
      .option('image', {
        alias: 'i',
        type: 'string',
        description: 'Docker image name to find container by',
      })
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory (default: ZAPSTER_WORKSPACE env)',
      })
      .option('name', {
        alias: 'n',
        type: 'string',
        default: 'agent.log',
        description: 'Output filename',
      })
      .option('tail', {
        alias: 't',
        type: 'number',
        default: 500,
        description: 'Number of lines to fetch from the end',
      });
  },
  handler: async (argv) => {
    initLoggerWithWorkspace();
    const tailLines = argv.tail as number;
    const filename = (argv.name as string) || 'agent.log';

    try {
      let containerId: string | undefined = argv.container as string | undefined;

      if (!containerId && argv.image) {
        log.info(`Finding container with image: ${argv.image}`);
        const containerInfo = await findContainerByImage(argv.image as string);
        if (containerInfo) {
          containerId = containerInfo.Id;
          log.info(`Found container: ${containerInfo.Names[0] || containerInfo.Id.substring(0, 12)}`);
        } else {
          log.error(`No container found with image: ${argv.image}`);
          process.exit(1);
        }
      }

      if (!containerId) {
        log.error('Either --container or --image must be specified');
        process.exit(1);
      }

      log.info(`Fetching logs for container: ${containerId.substring(0, 12)}`);

      const container = docker.getContainer(containerId);
      const logsBuffer = await container.logs({
        stdout: true,
        stderr: true,
        tail: tailLines,
        timestamps: true,
        follow: false,
      });

      const logs = parseDockerLogs(logsBuffer);

      const logPath = getWorkspacePath(filename);
      fs.writeFileSync(logPath, logs, 'utf-8');

      log.success(`Docker logs saved to: ${logPath}`);
      log.info(`Log size: ${logs.length} characters`);
    } catch (error: any) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  },
};
