import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface ArtistSongsResponse {
  code: number;
  msg: string;
  data: {
    n: number;
    title: string;
    singer: string;
    pic: string;
  }[];
}

export const getArtistSongsTool = createTool({
  id: 'get-artist-songs',
  description: '获取歌手的所有歌曲列表',
  inputSchema: z.object({
    artistName: z.string().describe('歌手名称'),
    limit: z.number().optional().default(20).describe('返回数量限制'),
  }),
  outputSchema: z.object({
    artist: z.string(),
    songs: z.array(
      z.object({
        n: z.number(),
        title: z.string(),
        singer: z.string(),
      }),
    ),
    total: z.number(),
  }),
  execute: async ({ artistName, limit }) => {
    return await getArtistSongs(artistName, limit);
  },
});

const getArtistSongs = async (artistName: string, limit: number = 20) => {
  const url = `https://ffapi.cn/int/v1/dg_netease?msg=${encodeURIComponent(artistName)}&limit=${limit}&format=json`;

  const response = await fetch(url);
  const data = (await response.json()) as ArtistSongsResponse;

  if (data.code !== 200 || !data.data) {
    return {
      artist: artistName,
      songs: [],
      total: 0,
    };
  }

  // 过滤出该歌手的歌曲
  const artistSongs = data.data.filter((song) => song.singer.includes(artistName));

  return {
    artist: artistName,
    songs: artistSongs.map((song) => ({
      n: song.n,
      title: song.title,
      singer: song.singer,
    })),
    total: artistSongs.length,
  };
};
