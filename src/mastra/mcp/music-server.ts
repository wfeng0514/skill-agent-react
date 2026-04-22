import { MCPServer } from '@mastra/mcp';
import { searchMusicTool } from '../tools/search-music';
import { getLyricsTool } from '../tools/get-lyrics';
import { getArtistSongsTool } from '../tools/get-artist-songs';
import { getMusicUrlTool } from '../tools/get-music-url';
import { musicAgent } from '../agents/music-agent';

export const musicMCPServer = new MCPServer({
  name: 'music-service',
  version: '1.0.0',
  description: '网易云音乐 MCP 服务，提供搜索、歌词、歌曲信息和播放链接',
  agents: { musicAgent },
  tools: { searchMusicTool, getLyricsTool, getArtistSongsTool, getMusicUrlTool },
});

await musicMCPServer.startStdio();
