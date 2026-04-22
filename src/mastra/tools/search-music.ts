import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// 定义 API 响应类型
interface MusicSearchResponse {
  code: number;
  msg: string;
  data: {
    n: number;
    title: string;
    singer: string;
    pic: string;
  }[];
}

export const searchMusicTool = createTool({
  id: 'search-music',
  description: '搜索音乐歌曲信息（支持网易云音乐库）',
  inputSchema: z.object({
    query: z.string().describe('搜索关键词，可以是歌曲名或歌手名'),
    limit: z.number().optional().default(10).describe('返回结果数量，最大20'),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        n: z.number(),
        title: z.string(),
        singer: z.string(),
        pic: z.string().optional(),
      }),
    ),
    total: z.number(),
  }),
  execute: async ({ query, limit }) => {
    return await searchMusic(query, limit);
  },
});

const searchMusic = async (query: string, limit: number = 10) => {
  const url = `https://ffapi.cn/int/v1/dg_netease?msg=${encodeURIComponent(query)}&limit=${limit}&format=json`;

  const response = await fetch(url);
  const data = (await response.json()) as MusicSearchResponse;

  if (data.code !== 200 || !data.data) {
    return {
      results: [],
      total: 0,
    };
  }

  return {
    results: data.data.map((song) => ({
      n: song.n,
      title: song.title,
      singer: song.singer,
      pic: song.pic,
    })),
    total: data.data.length,
  };
};
