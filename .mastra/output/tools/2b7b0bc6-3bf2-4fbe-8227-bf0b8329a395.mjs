import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const getMusicUrlTool = createTool({
  id: "get-music-url",
  description: "\u83B7\u53D6\u6B4C\u66F2\u64AD\u653E\u94FE\u63A5",
  inputSchema: z.object({
    songName: z.string().describe("\u6B4C\u66F2\u540D\u79F0"),
    artist: z.string().optional().describe("\u6B4C\u624B\u540D\u79F0\uFF08\u53EF\u9009\uFF09")
  }),
  outputSchema: z.object({
    title: z.string(),
    singer: z.string(),
    url: z.string().optional(),
    hasUrl: z.boolean()
  }),
  execute: async ({ songName, artist }) => {
    return await getMusicUrl(songName, artist);
  }
});
const getMusicUrl = async (songName, artist) => {
  const searchQuery = artist ? `${songName} ${artist}` : songName;
  const url = `https://ffapi.cn/int/v1/dg_netease?msg=${encodeURIComponent(searchQuery)}&act=musicurl&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.code !== 200) {
    return {
      title: songName,
      singer: artist || "\u672A\u77E5",
      hasUrl: false
    };
  }
  let urlString = "";
  let title = songName;
  let singer = artist || "\u672A\u77E5";
  if (typeof data.data === "string") {
    urlString = data.data;
  } else if (data.data && typeof data.data === "object" && "url" in data.data) {
    urlString = data.data.url;
  } else if (Array.isArray(data.data) && data.data[0]) {
    urlString = data.data[0].url || "";
    title = data.data[0].title || songName;
    singer = data.data[0].singer || singer;
  }
  return {
    title,
    singer,
    url: urlString || void 0,
    hasUrl: !!urlString
  };
};

export { getMusicUrlTool };
