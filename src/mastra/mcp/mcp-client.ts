/**
 * MCP Client
 */
import { MCPClient } from '@mastra/mcp';

export const mcpClient = new MCPClient({
  id: 'mcp-client',
  servers: {
    /**
     *  Mastra 官方文档 MCP
     */
    mastra: {
      command: 'npx',
      args: ['-y', '@mastra/mcp-docs-server'],
      env: {
        DOCS_CACHE_TTL: '3600', // 缓存1小时
        EXAMPLES_REFRESH: 'daily',
      },
    },
    /**
     * 食谱 MCP
     */
    howtocook: {
      command: 'npx',
      args: ['-y', 'howtocook-mcp'],
    },

    /**
     * 美国天气 MCP
     */
    weather: {
      url: new URL(
        `https://server.smithery.ai/@smithery-ai/national-weather-service/mcp?api_key=${process.env.SMITHERY_API_KEY}`,
      ),
    },
  },
});
