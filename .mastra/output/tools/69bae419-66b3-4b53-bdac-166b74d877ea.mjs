import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const getLyricsTool = createTool({
  id: "get-lyrics",
  description: "\u83B7\u53D6\u6B4C\u66F2\u6B4C\u8BCD",
  inputSchema: z.object({
    songName: z.string().describe("\u6B4C\u66F2\u540D\u79F0"),
    artist: z.string().optional().describe("\u6B4C\u624B\u540D\u79F0\uFF08\u53EF\u9009\uFF09")
  }),
  outputSchema: z.object({
    lyrics: z.string(),
    hasLyrics: z.boolean()
  }),
  execute: async ({ songName, artist }) => {
    return await getLyrics(songName, artist);
  }
});
const getLyrics = async (songName, artist) => {
  const searchQuery = artist ? `${songName} ${artist}` : songName;
  const url = `https://ffapi.cn/int/v1/dg_netease?msg=${encodeURIComponent(searchQuery)}&act=lrcgc&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.code !== 200) {
    return {
      lyrics: "\u672A\u627E\u5230\u6B4C\u8BCD",
      hasLyrics: false
    };
  }
  let lyrics = "";
  if (typeof data.data === "string") {
    lyrics = data.data;
  } else if (data.data && typeof data.data === "object" && "lyrics" in data.data) {
    lyrics = data.data.lyrics;
  } else if (Array.isArray(data.data) && data.data[0] && "lyrics" in data.data[0]) {
    lyrics = data.data[0].lyrics;
  }
  const cleanLyrics = lyrics.replace(/\[\d{2}:\d{2}\.\d{2,}\]/g, "").replace(/\[\d{2}:\d{2}:\d{2}\]/g, "").trim();
  return {
    lyrics: cleanLyrics || "\u672A\u627E\u5230\u6B4C\u8BCD",
    hasLyrics: !!cleanLyrics
  };
};

export { getLyricsTool };
