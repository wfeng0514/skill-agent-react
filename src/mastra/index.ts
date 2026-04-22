import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';

import { MastraEditor } from '@mastra/editor';

import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { cargoAgent } from './agents/cargo-agent';
import { mcpAgent } from './agents/mcp-agent';
import { musicMCPServer } from './mcp/music-server';

import { chatRoute } from '@mastra/ai-sdk';

import { Workspace, LocalFilesystem } from '@mastra/core/workspace';
import { musicAgent } from './agents/music-agent';

const workspace = new Workspace({
  filesystem: new LocalFilesystem({ basePath: './wokerkspace' }),
  skills: ['./**/skills'],
  bm25: true,
});

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  mcpServers: { musicMCPServer },
  workspace,
  agents: { weatherAgent, cargoAgent, mcpAgent, musicAgent },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: 'mastra-storage',
      url: 'file:./mastra.db',
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    },
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends observability data to hosted Mastra Studio (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),

  editor: new MastraEditor(),

  server: {
    apiRoutes: [
      chatRoute({
        path: '/chat/:agentId',
      }),
    ],
  },
});
