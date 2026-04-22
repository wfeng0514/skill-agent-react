import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, SensitiveDataFilter, DefaultExporter, CloudExporter } from '@mastra/observability';
import { MastraEditor } from '@mastra/editor';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';
import { MCPClient, MCPServer } from '@mastra/mcp';
import { chatRoute } from '@mastra/ai-sdk';
import { Workspace, LocalFilesystem } from '@mastra/core/workspace';

const forecastSchema = z.object({
  date: z.string(),
  maxTemp: z.number(),
  minTemp: z.number(),
  precipitationChance: z.number(),
  condition: z.string(),
  location: z.string()
});
function getWeatherCondition$1(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    95: "Thunderstorm"
  };
  return conditions[code] || "Unknown";
}
const fetchWeather = createStep({
  id: "fetch-weather",
  description: "Fetches weather forecast for a given city",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for")
  }),
  outputSchema: forecastSchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputData.city)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = await geocodingResponse.json();
    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${inputData.city}' not found`);
    }
    const { latitude, longitude, name } = geocodingData.results[0];
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=precipitation,weathercode&timezone=auto,&hourly=precipitation_probability,temperature_2m`;
    const response = await fetch(weatherUrl);
    const data = await response.json();
    const forecast = {
      date: (/* @__PURE__ */ new Date()).toISOString(),
      maxTemp: Math.max(...data.hourly.temperature_2m),
      minTemp: Math.min(...data.hourly.temperature_2m),
      condition: getWeatherCondition$1(data.current.weathercode),
      precipitationChance: data.hourly.precipitation_probability.reduce(
        (acc, curr) => Math.max(acc, curr),
        0
      ),
      location: name
    };
    return forecast;
  }
});
const planActivities = createStep({
  id: "plan-activities",
  description: "Suggests activities based on weather conditions",
  inputSchema: forecastSchema,
  outputSchema: z.object({
    activities: z.string()
  }),
  execute: async ({ inputData, mastra }) => {
    const forecast = inputData;
    if (!forecast) {
      throw new Error("Forecast data not found");
    }
    const agent = mastra?.getAgent("weatherAgent");
    if (!agent) {
      throw new Error("Weather agent not found");
    }
    const prompt = `Based on the following weather forecast for ${forecast.location}, suggest appropriate activities:
      ${JSON.stringify(forecast, null, 2)}
      For each day in the forecast, structure your response exactly as follows:

      \u{1F4C5} [Day, Month Date, Year]
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

      \u{1F321}\uFE0F WEATHER SUMMARY
      \u2022 Conditions: [brief description]
      \u2022 Temperature: [X\xB0C/Y\xB0F to A\xB0C/B\xB0F]
      \u2022 Precipitation: [X% chance]

      \u{1F305} MORNING ACTIVITIES
      Outdoor:
      \u2022 [Activity Name] - [Brief description including specific location/route]
        Best timing: [specific time range]
        Note: [relevant weather consideration]

      \u{1F31E} AFTERNOON ACTIVITIES
      Outdoor:
      \u2022 [Activity Name] - [Brief description including specific location/route]
        Best timing: [specific time range]
        Note: [relevant weather consideration]

      \u{1F3E0} INDOOR ALTERNATIVES
      \u2022 [Activity Name] - [Brief description including specific venue]
        Ideal for: [weather condition that would trigger this alternative]

      \u26A0\uFE0F SPECIAL CONSIDERATIONS
      \u2022 [Any relevant weather warnings, UV index, wind conditions, etc.]

      Guidelines:
      - Suggest 2-3 time-specific outdoor activities per day
      - Include 1-2 indoor backup options
      - For precipitation >50%, lead with indoor activities
      - All activities must be specific to the location
      - Include specific venues, trails, or locations
      - Consider activity intensity based on temperature
      - Keep descriptions concise but informative

      Maintain this exact formatting for consistency, using the emoji and section headers as shown.`;
    const response = await agent.stream([
      {
        role: "user",
        content: prompt
      }
    ]);
    let activitiesText = "";
    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      activitiesText += chunk;
    }
    return {
      activities: activitiesText
    };
  }
});
const weatherWorkflow = createWorkflow({
  id: "weather-workflow",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for")
  }),
  outputSchema: z.object({
    activities: z.string()
  })
}).then(fetchWeather).then(planActivities);
weatherWorkflow.commit();

const weatherTool = createTool({
  id: "get-weather",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name")
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string()
  }),
  execute: async (inputData) => {
    return await getWeather(inputData.location);
  }
});
const getWeather = async (location) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = await geocodingResponse.json();
  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }
  const { latitude, longitude, name } = geocodingData.results[0];
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;
  const response = await fetch(weatherUrl);
  const data = await response.json();
  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name
  };
};
function getWeatherCondition(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };
  return conditions[code] || "Unknown";
}

const weatherAgent = new Agent({
  id: "weather-agent",
  name: "Weather Agent",
  instructions: `
      You are a helpful weather assistant that provides accurate weather information and can help planning activities based on the weather.

      Your primary function is to help users get weather details for specific locations. When responding:
      - Always ask for a location if none is provided
      - If the location name isn't in English, please translate it
      - If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
      - Include relevant details like humidity, wind conditions, and precipitation
      - Keep responses concise but informative
      - If the user asks for activities and provides the weather forecast, suggest activities based on the weather forecast.
      - If the user asks for activities, respond in the format they request.

      Use the weatherTool to fetch current weather data.
`,
  // model: 'google/gemini-2.5-pro',
  model: "zhipuai/glm-4.5-flash",
  tools: { weatherTool },
  memory: new Memory()
});

const cargoAgent = new Agent({
  id: "cargo-agent",
  name: "Cargo Loading Agent",
  instructions: `
    \u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u8D27\u8FD0\u88C5\u8F7D\u7387\u5206\u6790\u52A9\u624B\u3002\u7528\u6237\u4F1A\u4E0A\u4F20\u8F66\u53A2\u56FE\u7247\uFF0C\u4F60\u9700\u8981\u76F4\u63A5\u5206\u6790\u56FE\u7247\u4E2D\u7684\u88C5\u8F7D\u60C5\u51B5\u3002

    \u5206\u6790\u7EF4\u5EA6\uFF08\u5FC5\u987B\u5168\u90E8\u8986\u76D6\uFF09\uFF1A
    1. **\u88C5\u8F7D\u7387**\uFF1A\u4F30\u7B97\u8F66\u53A2\u7684\u88C5\u8F7D\u7387\u767E\u5206\u6BD4\uFF080%-100%\uFF09
    2. **\u586B\u5145\u7A0B\u5EA6**\uFF1A\u5224\u65AD\u4E3A \u6EE1\u8F7D/\u8F83\u6EE1/\u9002\u4E2D/\u8F83\u7A7A/\u7A7A\u8F7D
    3. **\u7A7A\u95F4\u5229\u7528\u7387**\uFF1A\u63CF\u8FF0\u8F66\u53A2\u5404\u7EF4\u5EA6\uFF08\u957F/\u5BBD/\u9AD8\uFF09\u7684\u7A7A\u95F4\u5229\u7528\u60C5\u51B5
    4. **\u8D27\u7269\u7C7B\u578B**\uFF1A\u8BC6\u522B\u8F66\u53A2\u4E2D\u88C5\u8F7D\u7684\u8D27\u7269\u7C7B\u578B
    5. **\u4F18\u5316\u5EFA\u8BAE**\uFF1A\u63D0\u4F9B\u88C5\u8F7D\u4F18\u5316\u5EFA\u8BAE\uFF0C\u5982\u4F55\u63D0\u9AD8\u7A7A\u95F4\u5229\u7528\u7387
    6. **\u5B89\u5168\u8BC4\u4F30**\uFF1A\u8BC4\u4F30\u5F53\u524D\u88C5\u8F7D\u65B9\u5F0F\u7684\u5B89\u5168\u98CE\u9669

    \u8F93\u51FA\u683C\u5F0F\uFF08\u4E25\u683C\u9075\u5FAA\uFF09\uFF1A
    \u{1F4CA} **\u88C5\u8F7D\u7387\u5206\u6790\u62A5\u544A**
    \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
    \u{1F69B} \u88C5\u8F7D\u7387\uFF1AXX%
    \u{1F4E6} \u586B\u5145\u7A0B\u5EA6\uFF1A\u8F83\u6EE1/\u9002\u4E2D/\u8F83\u7A7A \u7B49
    \u{1F4D0} \u7A7A\u95F4\u5229\u7528\u7387\uFF1A\u8BE6\u7EC6\u63CF\u8FF0
    \u{1F4CB} \u8D27\u7269\u7C7B\u578B\uFF1A\u8BC6\u522B\u7ED3\u679C
    \u{1F4A1} \u4F18\u5316\u5EFA\u8BAE\uFF1A\u5177\u4F53\u53EF\u64CD\u4F5C\u7684\u5EFA\u8BAE
    \u26A0\uFE0F \u5B89\u5168\u8BC4\u4F30\uFF1A\u98CE\u9669\u7B49\u7EA7\u548C\u8BF4\u660E
    \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

    \u6CE8\u610F\u4E8B\u9879\uFF1A
    - \u4F7F\u7528\u4E2D\u6587\u56DE\u590D
    - \u5982\u679C\u7528\u6237\u6CA1\u6709\u4E0A\u4F20\u56FE\u7247\uFF0C\u63D0\u9192\u7528\u6237\u9700\u8981\u4E0A\u4F20\u8F66\u53A2\u56FE\u7247
    - \u5982\u679C\u56FE\u7247\u4E0D\u662F\u8F66\u53A2\uFF0C\u53CB\u597D\u5730\u544A\u77E5\u7528\u6237
    - \u88C5\u8F7D\u7387\u4E3A\u4F30\u7B97\u503C\uFF0C\u8BEF\u5DEE\u7EA6 \xB110%
    - \u5B89\u5168\u98CE\u9669\u8981\u91CD\u70B9\u63D0\u793A
    - \u5EFA\u8BAE\u8981\u5177\u4F53\u53EF\u64CD\u4F5C
`,
  model: "alibaba-cn/qwen3.5-plus",
  memory: new Memory()
});

const mcpClient = new MCPClient({
  id: "mcp-client",
  servers: {
    /**
     *  Mastra 官方文档 MCP
     */
    mastra: {
      command: "npx",
      args: ["-y", "@mastra/mcp-docs-server"],
      env: {
        DOCS_CACHE_TTL: "3600",
        // 缓存1小时
        EXAMPLES_REFRESH: "daily"
      }
    },
    /**
     * 食谱 MCP
     */
    howtocook: {
      command: "npx",
      args: ["-y", "howtocook-mcp"]
    },
    /**
     * 美国天气 MCP
     */
    weather: {
      url: new URL(
        `https://server.smithery.ai/@smithery-ai/national-weather-service/mcp?api_key=${process.env.SMITHERY_API_KEY}`
      )
    }
  }
});

const mcpAgent = new Agent({
  id: "mcp-agent",
  name: "MCP Agent",
  description: "\u4E00\u4E2A\u96C6\u6210\u591A\u4E2A MCP \u670D\u52A1\u7684\u4E13\u5BB6 Agent\uFF0C\u80FD\u591F\u67E5\u8BE2 Mastra \u6587\u6863\u3001\u63D0\u4F9B\u98DF\u8C31\u5EFA\u8BAE\u548C\u83B7\u53D6\u5929\u6C14\u4FE1\u606F",
  instructions: `
      \u4F60\u662F\u4E00\u4E2A\u517C\u5177\u591A\u9879\u80FD\u529B\u7684\u4E13\u5BB6 Agent\uFF0C\u96C6\u6210\u4E86\u4E09\u4E2A\u6838\u5FC3 MCP \u80FD\u529B\uFF1A
      ## \u{1F3AF} \u4F60\u7684\u80FD\u529B\u77E9\u9635

      ### 1\uFE0F\u20E3 Mastra \u6846\u67B6\u6280\u672F\u5B98\u65B9\u6587\u6863\u67E5\u8BE2\uFF08mastra-mcp\uFF09
      - \u5B9E\u65F6\u67E5\u8BE2 Mastra \u6700\u65B0\u6587\u6863
      - \u83B7\u53D6 API \u4F7F\u7528\u793A\u4F8B
      - \u4E86\u89E3\u6846\u67B6\u66F4\u65B0\u548C\u6700\u4F73\u5B9E\u8DF5

      ### 2\uFE0F\u20E3 \u98DF\u8C31\u52A9\u624B\uFF08howtocook-mcp\uFF09
      - \u63D0\u4F9B\u83DC\u8C31\u67E5\u8BE2\u548C\u63A8\u8350
      - \u70F9\u996A\u6B65\u9AA4\u6307\u5BFC
      - \u98DF\u6750\u6E05\u5355\u751F\u6210

      ### 3\uFE0F\u20E3 \u5929\u6C14\u670D\u52A1\uFF08weather-mcp\uFF09
      - \u7F8E\u56FD\u5730\u533A\u5929\u6C14\u67E5\u8BE2
      - \u6C14\u6E29\u3001\u98CE\u901F\u3001\u6E7F\u5EA6\u7B49\u5B9E\u65F6\u6570\u636E
      - \u5929\u6C14\u9884\u62A5\u548C\u5929\u6C14\u9884\u8B66
      
      ## \u{1F3AF} \u7EA6\u675F
      - \u53EA\u80FD\u4F7F\u7528 MCP \u63D0\u4F9B\u7684\u5DE5\u5177\u6765\u56DE\u7B54\u95EE\u9898
      - \u4E0D\u8981\u7F16\u9020\u4FE1\u606F\uFF0C\u5982\u679C\u5DE5\u5177\u65E0\u6CD5\u63D0\u4F9B\u7B54\u6848\uFF0C\u5C31\u8BF4\u4E0D\u77E5\u9053
      - \u56DE\u590D\u8981\u53CB\u597D\u3001\u8BE6\u7EC6\uFF0C\u7528\u4E2D\u6587\u56DE\u7B54

      ## \u{1F3AF} \u76EE\u6807
      - \u6210\u4E3A\u7528\u6237\u7684\u5168\u80FD\u52A9\u624B\uFF0C\u63D0\u4F9B\u51C6\u786E\u3001\u5B9E\u7528\u7684\u4FE1\u606F\u548C\u5EFA\u8BAE
  `,
  model: "alibaba-cn/qwen3.5-plus",
  tools: await mcpClient.listTools()
});

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

const musicAgent = new Agent({
  id: "music-agent",
  name: "\u7F51\u6613\u4E91\u97F3\u4E50\u52A9\u624B",
  instructions: `
    \u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u97F3\u4E50\u52A9\u624B\uFF0C\u5E2E\u52A9\u7528\u6237\u5904\u7406\u97F3\u4E50\u76F8\u5173\u7684\u8BF7\u6C42\u3002
    
    \u4F60\u53EF\u4EE5\uFF1A
    - \u641C\u7D22\u6B4C\u66F2\uFF1A\u4F7F\u7528 search-music \u5DE5\u5177
    - \u83B7\u53D6\u6B4C\u8BCD\uFF1A\u4F7F\u7528 get-lyrics \u5DE5\u5177  
    - \u67E5\u770B\u6B4C\u624B\u4F5C\u54C1\uFF1A\u4F7F\u7528 get-artist-songs \u5DE5\u5177
    - \u83B7\u53D6\u64AD\u653E\u94FE\u63A5\uFF1A\u4F7F\u7528 get-music-url \u5DE5\u5177
    
    \u6839\u636E\u7528\u6237\u7684\u95EE\u9898\uFF0C\u9009\u62E9\u5408\u9002\u7684\u5DE5\u5177\u6765\u56DE\u7B54\u3002
    \u56DE\u590D\u8981\u53CB\u597D\u3001\u8BE6\u7EC6\uFF0C\u7528\u4E2D\u6587\u56DE\u7B54\u3002
    
    ## \u56FE\u7247\u663E\u793A\u89C4\u5219
    \u5F53\u8FD4\u56DE\u6B4C\u66F2\u5C01\u9762\u6216\u6D77\u62A5\u65F6\uFF0C\u8BF7\u4F7F\u7528\u4EE5\u4E0B HTML/Markdown \u683C\u5F0F\u63A7\u5236\u5927\u5C0F\uFF1A
    
    ### Markdown \u683C\u5F0F\uFF08\u63A8\u8350\uFF09\uFF1A
    ![\u6B4C\u66F2\u5C01\u9762](\u56FE\u7247URL =200x200)
    
    \u6216\u4F7F\u7528 HTML \u683C\u5F0F\uFF1A
    <img src="\u56FE\u7247URL" width="200" height="200" style="max-width: 200px; border-radius: 8px;" />
    
    ### \u91CD\u8981\uFF1A
    - \u6240\u6709\u56FE\u7247\u5BBD\u5EA6\u5FC5\u987B\u63A7\u5236\u5728 200px \u4EE5\u5185
    - \u4FDD\u6301\u56FE\u7247\u6BD4\u4F8B\uFF0C\u4E0D\u8981\u53D8\u5F62
    - \u5982\u679C\u6709\u591A\u5F20\u56FE\u7247\uFF0C\u6BCF\u5F20\u90FD\u8981\u8BBE\u7F6E\u5927\u5C0F
    - \u4E0D\u8981\u8FD4\u56DE\u539F\u59CB\u5927\u5C0F\u7684\u56FE\u7247
  `,
  model: "alibaba-cn/qwen3.5-plus",
  tools: {
    searchMusicTool,
    getLyricsTool,
    getArtistSongsTool,
    getMusicUrlTool
  },
  memory: new Memory()
});

const musicMCPServer = new MCPServer({
  name: "music-service",
  version: "1.0.0",
  description: "\u7F51\u6613\u4E91\u97F3\u4E50 MCP \u670D\u52A1\uFF0C\u63D0\u4F9B\u641C\u7D22\u3001\u6B4C\u8BCD\u3001\u6B4C\u66F2\u4FE1\u606F\u548C\u64AD\u653E\u94FE\u63A5",
  agents: { musicAgent },
  tools: { searchMusicTool, getLyricsTool, getArtistSongsTool, getMusicUrlTool }
});
await musicMCPServer.startStdio();

const workspace = new Workspace({
  filesystem: new LocalFilesystem({
    basePath: "./wokerkspace"
  }),
  skills: ["./**/skills"],
  bm25: true
});
const mastra = new Mastra({
  workflows: {
    weatherWorkflow
  },
  mcpServers: {
    musicMCPServer
  },
  workspace,
  agents: {
    weatherAgent,
    cargoAgent,
    mcpAgent,
    musicAgent
  },
  storage: new MastraCompositeStore({
    id: "composite-storage",
    default: new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db"
    }),
    domains: {
      observability: await new DuckDBStore().getStore("observability")
    }
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info"
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [
          new DefaultExporter(),
          // Persists traces to storage for Mastra Studio
          new CloudExporter()
          // Sends observability data to hosted Mastra Studio (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter()
          // Redacts sensitive data like passwords, tokens, keys
        ]
      }
    }
  }),
  editor: new MastraEditor(),
  server: {
    apiRoutes: [chatRoute({
      path: "/chat/:agentId"
    })]
  }
});

export { mastra };
