import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface MusicUrlResponse {
  code: number;
  msg: string;
  data: string | { url: string } | any[];
}

export const getMusicUrlTool = createTool({
  id: 'get-music-url',
  description: '获取歌曲播放链接',
  inputSchema: z.object({
    songName: z.string().describe('歌曲名称'),
    artist: z.string().optional().describe('歌手名称（可选）'),
  }),
  outputSchema: z.object({
    title: z.string(),
    singer: z.string(),
    url: z.string().optional(),
    hasUrl: z.boolean(),
  }),
  execute: async ({ songName, artist }) => {
    return await getMusicUrl(songName, artist);
  },
});

const getMusicUrl = async (songName: string, artist?: string) => {
  const searchQuery = artist ? `${songName} ${artist}` : songName;
  const url = `https://ffapi.cn/int/v1/dg_netease?msg=${encodeURIComponent(searchQuery)}&act=musicurl&format=json`;

  const response = await fetch(url);
  const data = (await response.json()) as MusicUrlResponse;

  if (data.code !== 200) {
    return {
      title: songName,
      singer: artist || '未知',
      hasUrl: false,
    };
  }

  let urlString = '';
  let title = songName;
  let singer = artist || '未知';

  if (typeof data.data === 'string') {
    urlString = data.data;
  } else if (data.data && typeof data.data === 'object' && 'url' in data.data) {
    urlString = data.data.url;
  } else if (Array.isArray(data.data) && data.data[0]) {
    urlString = data.data[0].url || '';
    title = data.data[0].title || songName;
    singer = data.data[0].singer || singer;
  }

  return {
    title,
    singer,
    url: urlString || undefined,
    hasUrl: !!urlString,
  };
};
