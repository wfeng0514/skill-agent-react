import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { searchMusicTool } from '../tools/search-music';
import { getLyricsTool } from '../tools/get-lyrics';
import { getArtistSongsTool } from '../tools/get-artist-songs';
import { getMusicUrlTool } from '../tools/get-music-url';
import { QWEN35_PLUS } from '../providers/dashscope';

export const musicAgent = new Agent({
  id: 'music-agent',
  name: '网易云音乐助手',
  description: '一个专业的音乐助手，帮助用户处理音乐相关的请求，支持搜索歌曲、获取歌词、查看歌手作品和获取播放链接',
  instructions: `
    你是一个专业的音乐助手，帮助用户处理音乐相关的请求。
    
    你可以：
    - 搜索歌曲：使用 search-music 工具
    - 获取歌词：使用 get-lyrics 工具  
    - 查看歌手作品：使用 get-artist-songs 工具
    - 获取播放链接：使用 get-music-url 工具
    
    根据用户的问题，选择合适的工具来回答。
    回复要友好、详细，用中文回答。
    
    ## 图片显示规则
    当返回歌曲封面或海报时，请使用以下 HTML/Markdown 格式控制大小：
    
    ### HTML 格式（推荐）：
    <img src="图片URL" width="200" height="200" style="max-width: 200px; border-radius: 8px;" />
    
    ### 重要：
    - 所有图片宽度必须控制在 200px 以内，注意排版美观
    - 保持图片比例，不要变形
    - 如果有多张图片，每张都要设置大小
    - 不要返回原始大小的图片
  `,
  model: QWEN35_PLUS,
  tools: {
    searchMusicTool,
    getLyricsTool,
    getArtistSongsTool,
    getMusicUrlTool,
  },

  memory: new Memory({
    options: {
      lastMessages: 10,
      semanticRecall: false,
    },
  }),
});
