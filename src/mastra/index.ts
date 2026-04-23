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
import { ragAgent } from './agents/rag-agent';

const workspace = new Workspace({
  filesystem: new LocalFilesystem({ basePath: './wokerkspace', contained: false }),
  skills: ['./**/skills', './**/my-skills'],
  bm25: true, // 开启 BM25 搜索
});

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  mcpServers: { musicMCPServer },
  workspace,
  agents: { weatherAgent, cargoAgent, mcpAgent, musicAgent, ragAgent },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: 'mastra-storage',
      url: process.env.MASTRA_DB_URL || 'file:./mastra.db',
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
          new CloudExporter(), // 将可观测性数据发送至托管的 Mastra Studio（若已设置 MASTRA_CLOUD_ACCESS_TOKEN）
        ],
        spanOutputProcessors: [
          // 处理诸如密码、令牌、密钥等敏感数据
          new SensitiveDataFilter({
            // Add custom sensitive fields
            sensitiveFields: [
              // Default fields
              'password',
              'token',
              'secret',
              'key',
              'apikey',
              // Custom fields for your application
              'creditCard',
              'bankAccount',
              'routingNumber',
              'email',
              'phoneNumber',
              'dateOfBirth',
            ],
            // Custom redaction token
            redactionToken: '***SENSITIVE***',
            // Redaction style
            redactionStyle: 'full', // or 'partial'
          }),
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
