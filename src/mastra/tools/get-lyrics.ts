import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface LyricsResponse {
  code: number;
  msg: string;
  data: string | { lyrics: string } | any[];
}

export const getLyricsTool = createTool({
  id: 'get-lyrics',
  description: '获取歌曲歌词',
  inputSchema: z.object({
    songName: z.string().describe('歌曲名称'),
    artist: z.string().optional().describe('歌手名称（可选）'),
  }),
  outputSchema: z.object({
    lyrics: z.string(),
    hasLyrics: z.boolean(),
  }),
  execute: async ({ songName, artist }) => {
    return await getLyrics(songName, artist);
  },
});

const getLyrics = async (songName: string, artist?: string) => {
  const searchQuery = artist ? `${songName} ${artist}` : songName;
  const url = `https://ffapi.cn/int/v1/dg_netease?msg=${encodeURIComponent(searchQuery)}&act=lrcgc&format=json`;

  const response = await fetch(url);
  const data = (await response.json()) as LyricsResponse;

  if (data.code !== 200) {
    return {
      lyrics: '未找到歌词',
      hasLyrics: false,
    };
  }

  let lyrics = '';
  if (typeof data.data === 'string') {
    lyrics = data.data;
  } else if (data.data && typeof data.data === 'object' && 'lyrics' in data.data) {
    lyrics = data.data.lyrics;
  } else if (Array.isArray(data.data) && data.data[0] && 'lyrics' in data.data[0]) {
    lyrics = data.data[0].lyrics;
  }

  // 清理歌词格式（去除时间戳）
  const cleanLyrics = lyrics
    .replace(/\[\d{2}:\d{2}\.\d{2,}\]/g, '')
    .replace(/\[\d{2}:\d{2}:\d{2}\]/g, '')
    .trim();

  return {
    lyrics: cleanLyrics || '未找到歌词',
    hasLyrics: !!cleanLyrics,
  };
};
