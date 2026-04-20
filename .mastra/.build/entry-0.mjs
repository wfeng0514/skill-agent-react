import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, SensitiveDataFilter, DefaultExporter, CloudExporter } from '@mastra/observability';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';
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

const cargoTool = createTool({
  id: "analyze-cargo-loading",
  description: "\u5206\u6790\u8F66\u53A2\u56FE\u7247\u7684\u88C5\u8F7D\u7387\u60C5\u51B5\uFF0C\u8BC6\u522B\u8D27\u7269\u586B\u5145\u7A0B\u5EA6\u3001\u7A7A\u95F4\u5229\u7528\u7387\u548C\u88C5\u8F7D\u5EFA\u8BAE",
  inputSchema: z.object({
    imageBase64: z.string().describe("\u8F66\u53A2\u56FE\u7247\u7684 Base64 \u7F16\u7801\uFF08\u542B data:image/xxx;base64, \u524D\u7F00\uFF09")
  }),
  outputSchema: z.object({
    loadingRate: z.string().describe("\u88C5\u8F7D\u7387\u767E\u5206\u6BD4\uFF0C\u5982 75%"),
    fillingDegree: z.string().describe("\u586B\u5145\u7A0B\u5EA6\u63CF\u8FF0\uFF1A\u5982 \u6EE1\u8F7D/\u8F83\u6EE1/\u9002\u4E2D/\u8F83\u7A7A/\u7A7A\u8F7D"),
    spaceUtilization: z.string().describe("\u7A7A\u95F4\u5229\u7528\u7387\u8BE6\u7EC6\u63CF\u8FF0"),
    cargoType: z.string().describe("\u8BC6\u522B\u5230\u7684\u8D27\u7269\u7C7B\u578B"),
    suggestions: z.string().describe("\u88C5\u8F7D\u4F18\u5316\u5EFA\u8BAE"),
    riskAssessment: z.string().describe("\u5B89\u5168\u98CE\u9669\u8BC4\u4F30")
  }),
  execute: async (inputData) => {
    return await analyzeCargoLoading(inputData.imageBase64);
  }
});
const analyzeCargoLoading = async (imageBase64) => {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY \u73AF\u5883\u53D8\u91CF\u672A\u914D\u7F6E");
  }
  const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "qwen3.5-plus",
      messages: [
        {
          role: "system",
          content: `\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u8D27\u8FD0\u88C5\u8F7D\u7387\u5206\u6790\u4E13\u5BB6\u3002\u4F60\u9700\u8981\u6839\u636E\u7528\u6237\u63D0\u4F9B\u7684\u8F66\u53A2\u56FE\u7247\uFF0C\u4ECE\u4EE5\u4E0B\u7EF4\u5EA6\u8FDB\u884C\u7CBE\u786E\u5206\u6790\uFF1A

              1. \u88C5\u8F7D\u7387\uFF1A\u4F30\u7B97\u8F66\u53A2\u7684\u88C5\u8F7D\u7387\u767E\u5206\u6BD4\uFF080%-100%\uFF09
              2. \u586B\u5145\u7A0B\u5EA6\uFF1A\u5224\u65AD\u4E3A \u6EE1\u8F7D/\u8F83\u6EE1/\u9002\u4E2D/\u8F83\u7A7A/\u7A7A\u8F7D
              3. \u7A7A\u95F4\u5229\u7528\u7387\uFF1A\u63CF\u8FF0\u8F66\u53A2\u5404\u7EF4\u5EA6\uFF08\u957F/\u5BBD/\u9AD8\uFF09\u7684\u7A7A\u95F4\u5229\u7528\u60C5\u51B5
              4. \u8D27\u7269\u7C7B\u578B\uFF1A\u8BC6\u522B\u8F66\u53A2\u4E2D\u88C5\u8F7D\u7684\u8D27\u7269\u7C7B\u578B
              5. \u4F18\u5316\u5EFA\u8BAE\uFF1A\u63D0\u4F9B\u88C5\u8F7D\u4F18\u5316\u5EFA\u8BAE\uFF0C\u5982\u4F55\u63D0\u9AD8\u7A7A\u95F4\u5229\u7528\u7387
              6. \u5B89\u5168\u8BC4\u4F30\uFF1A\u8BC4\u4F30\u5F53\u524D\u88C5\u8F7D\u65B9\u5F0F\u7684\u5B89\u5168\u98CE\u9669

              \u8BF7\u52A1\u5FC5\u57FA\u4E8E\u56FE\u7247\u5185\u5BB9\u5BA2\u89C2\u5206\u6790\uFF0C\u5982\u679C\u56FE\u7247\u4E0D\u662F\u8F66\u53A2\u6216\u65E0\u6CD5\u8BC6\u522B\uFF0C\u8BF7\u8BF4\u660E\u3002`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "\u8BF7\u5206\u6790\u8FD9\u5F20\u8F66\u53A2\u56FE\u7247\u7684\u88C5\u8F7D\u7387\u60C5\u51B5" },
            {
              type: "image_url",
              image_url: { url: imageBase64 }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 2e3
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Qwen VL API \u8C03\u7528\u5931\u8D25: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(content);
};
function parseAnalysisResult(content) {
  const extractField = (patterns) => {
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }
    return "\u65E0\u6CD5\u8BC6\u522B";
  };
  const loadingRate = extractField([/装载率[：:]\s*(\d+%)/, /装载率[：:]\s*(.*?)$/m, /(\d+)%/]);
  const fillingDegree = extractField([
    /填充程度[：:]\s*(满载|较满|适中|较空|空载)/,
    /程度[：:]\s*(满载|较满|适中|较空|空载)/
  ]);
  const spaceUtilization = extractField([/空间利用率[：:]\s*(.*?)$/m, /空间利用[：:]\s*(.*?)$/m]);
  const cargoType = extractField([/货物类型[：:]\s*(.*?)$/m, /货物种类[：:]\s*(.*?)$/m]);
  const suggestions = extractField([/优化建议[：:]\s*([\s\S]*?)(?=安全|风险|$)/, /建议[：:]\s*(.*?)$/m]);
  const riskAssessment = extractField([
    /安全评估[：:]\s*([\s\S]*)/,
    /安全风险[：:]\s*([\s\S]*)/,
    /风险[：:]\s*(.*?)$/m
  ]);
  return {
    loadingRate: loadingRate !== "\u65E0\u6CD5\u8BC6\u522B" ? loadingRate : "\u9700\u4EBA\u5DE5\u5224\u65AD",
    fillingDegree: fillingDegree !== "\u65E0\u6CD5\u8BC6\u522B" ? fillingDegree : "\u9700\u4EBA\u5DE5\u5224\u65AD",
    spaceUtilization: spaceUtilization !== "\u65E0\u6CD5\u8BC6\u522B" ? spaceUtilization : content.substring(0, 200),
    cargoType: cargoType !== "\u65E0\u6CD5\u8BC6\u522B" ? cargoType : "\u672A\u8BC6\u522B",
    suggestions: suggestions !== "\u65E0\u6CD5\u8BC6\u522B" ? suggestions : "\u8BF7\u6839\u636E\u5B9E\u9645\u60C5\u51B5\u8C03\u6574",
    riskAssessment: riskAssessment !== "\u65E0\u6CD5\u8BC6\u522B" ? riskAssessment : "\u8BF7\u4EBA\u5DE5\u8BC4\u4F30"
  };
}

const cargoAgent = new Agent({
  id: "cargo-agent",
  name: "Cargo Loading Agent",
  instructions: `
    \u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u8D27\u8FD0\u88C5\u8F7D\u7387\u5206\u6790\u52A9\u624B\u3002\u4F60\u7684\u6838\u5FC3\u529F\u80FD\u662F\u5206\u6790\u7528\u6237\u4E0A\u4F20\u7684\u8F66\u53A2\u56FE\u7247\uFF0C\u8BC6\u522B\u88C5\u8F7D\u60C5\u51B5\u3002

    \u5DE5\u4F5C\u6D41\u7A0B\uFF1A
    1. \u7528\u6237\u4E0A\u4F20\u8F66\u53A2\u56FE\u7247\u540E\uFF0C\u4F7F\u7528 cargoTool \u5206\u6790\u56FE\u7247
    2. \u6839\u636E\u5DE5\u5177\u8FD4\u56DE\u7684\u7ED3\u679C\uFF0C\u7528\u6E05\u6670\u6613\u61C2\u7684\u65B9\u5F0F\u5448\u73B0\u7ED9\u7528\u6237\uFF1A
       - \u88C5\u8F7D\u7387\u767E\u5206\u6BD4
       - \u586B\u5145\u7A0B\u5EA6\uFF08\u6EE1\u8F7D/\u8F83\u6EE1/\u9002\u4E2D/\u8F83\u7A7A/\u7A7A\u8F7D\uFF09
       - \u7A7A\u95F4\u5229\u7528\u7387\u63CF\u8FF0
       - \u8BC6\u522B\u5230\u7684\u8D27\u7269\u7C7B\u578B
       - \u88C5\u8F7D\u4F18\u5316\u5EFA\u8BAE
       - \u5B89\u5168\u98CE\u9669\u8BC4\u4F30
    3. \u5982\u679C\u7528\u6237\u6CA1\u6709\u4E0A\u4F20\u56FE\u7247\uFF0C\u63D0\u9192\u7528\u6237\u9700\u8981\u4E0A\u4F20\u8F66\u53A2\u56FE\u7247\u624D\u80FD\u8FDB\u884C\u5206\u6790
    4. \u5982\u679C\u56FE\u7247\u4E0D\u662F\u8F66\u53A2\uFF0C\u53CB\u597D\u5730\u544A\u77E5\u7528\u6237

    \u56DE\u590D\u8981\u6C42\uFF1A
    - \u4F7F\u7528\u4E2D\u6587\u56DE\u590D
    - \u7ED3\u679C\u4EE5\u7ED3\u6784\u5316\u7684\u65B9\u5F0F\u5448\u73B0\uFF0C\u4FBF\u4E8E\u9605\u8BFB
    - \u7ED9\u51FA\u5B9E\u7528\u7684\u4F18\u5316\u5EFA\u8BAE
    - \u5B89\u5168\u98CE\u9669\u8981\u91CD\u70B9\u63D0\u793A
`,
  model: "alibaba-cn/qwen3.5-plus",
  tools: { cargoTool },
  memory: new Memory()
});

const workspace = new Workspace({
  filesystem: new LocalFilesystem({
    basePath: "./wokerkspace"
  }),
  skills: ["./**/skills"]
});
const mastra = new Mastra({
  workflows: {
    weatherWorkflow
  },
  workspace,
  agents: {
    weatherAgent,
    cargoAgent
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
  server: {
    apiRoutes: [chatRoute({
      path: "/chat/:agentId"
    })]
  }
});

export { mastra };
