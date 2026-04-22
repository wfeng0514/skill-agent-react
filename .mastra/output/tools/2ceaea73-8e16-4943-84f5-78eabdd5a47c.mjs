import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const getArtistSongsTool = createTool({
  id: "get-artist-songs",
  description: "\u83B7\u53D6\u6B4C\u624B\u7684\u6240\u6709\u6B4C\u66F2\u5217\u8868",
  inputSchema: z.object({
    artistName: z.string().describe("\u6B4C\u624B\u540D\u79F0"),
    limit: z.number().optional().default(20).describe("\u8FD4\u56DE\u6570\u91CF\u9650\u5236")
  }),
  outputSchema: z.object({
    artist: z.string(),
    songs: z.array(
      z.object({
        n: z.number(),
        title: z.string(),
        singer: z.string()
      })
    ),
    total: z.number()
  }),
  execute: async ({ artistName, limit }) => {
    return await getArtistSongs(artistName, limit);
  }
});
const getArtistSongs = async (artistName, limit = 20) => {
  const url = `https://ffapi.cn/int/v1/dg_netease?msg=${encodeURIComponent(artistName)}&limit=${limit}&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.code !== 200 || !data.data) {
    return {
      artist: artistName,
      songs: [],
      total: 0
    };
  }
  const artistSongs = data.data.filter((song) => song.singer.includes(artistName));
  return {
    artist: artistName,
    songs: artistSongs.map((song) => ({
      n: song.n,
      title: song.title,
      singer: song.singer
    })),
    total: artistSongs.length
  };
};

export { getArtistSongsTool };
