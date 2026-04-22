import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const searchMusicTool = createTool({
  id: "search-music",
  description: "\u641C\u7D22\u97F3\u4E50\u6B4C\u66F2\u4FE1\u606F\uFF08\u652F\u6301\u7F51\u6613\u4E91\u97F3\u4E50\u5E93\uFF09",
  inputSchema: z.object({
    query: z.string().describe("\u641C\u7D22\u5173\u952E\u8BCD\uFF0C\u53EF\u4EE5\u662F\u6B4C\u66F2\u540D\u6216\u6B4C\u624B\u540D"),
    limit: z.number().optional().default(10).describe("\u8FD4\u56DE\u7ED3\u679C\u6570\u91CF\uFF0C\u6700\u592720")
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        n: z.number(),
        title: z.string(),
        singer: z.string(),
        pic: z.string().optional()
      })
    ),
    total: z.number()
  }),
  execute: async ({ query, limit }) => {
    return await searchMusic(query, limit);
  }
});
const searchMusic = async (query, limit = 10) => {
  const url = `https://ffapi.cn/int/v1/dg_netease?msg=${encodeURIComponent(query)}&limit=${limit}&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.code !== 200 || !data.data) {
    return {
      results: [],
      total: 0
    };
  }
  return {
    results: data.data.map((song) => ({
      n: song.n,
      title: song.title,
      singer: song.singer,
      pic: song.pic
    })),
    total: data.data.length
  };
};

export { searchMusicTool };
