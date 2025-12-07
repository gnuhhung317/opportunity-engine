import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, Opportunity, MarketScanResult, SpyReport } from "../types";

// Initialize Gemini Client
// @ts-ignore
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the Schema for the Output
const opportunitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    opportunities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["Freelance", "Micro-SaaS", "DigitalProduct"] },
          description: { type: Type.STRING },
          matchScore: { type: Type.INTEGER, description: "Percentage match 0-100 based on user profile" },
          matchReasoning: { type: Type.STRING, description: "Why this fits the user's specific skills" },
          estimatedValue: { type: Type.STRING, description: "E.g. $50/hr or $500/mo" },
          platform: { type: Type.STRING },
          actionPlan: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Step by step execution plan"
          },
          techStackRecommendation: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Recommended tech stack subset"
          },
          learningBridge: {
            type: Type.OBJECT,
            nullable: true,
            description: "Only populated if matchScore is between 60-80 and a high value skill is missing.",
            properties: {
              missingSkill: { type: Type.STRING },
              analogy: { type: Type.STRING, description: "Explain it simply using concepts they know" },
              hoursToLearn: { type: Type.INTEGER },
              curriculum: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 step crash course" }
            },
            required: ["missingSkill", "analogy", "hoursToLearn", "curriculum"]
          }
        },
        required: ["title", "type", "description", "matchScore", "matchReasoning", "actionPlan", "techStackRecommendation"]
      }
    }
  }
};

const spyReportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    competitors: { type: Type.ARRAY, items: { type: Type.STRING } },
    marketStatus: { type: Type.STRING, description: "Summary of market saturation" },
    competitorWeaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Complaints found in reviews/reddit" },
    winningAngle: { type: Type.STRING, description: "Specific strategy to beat competitors (e.g. lower price, better UX)" },
    valuation: {
      type: Type.OBJECT,
      description: "ROI Calculation",
      properties: {
        estimatedEffortHours: { type: Type.INTEGER, description: "Hours to build MVP based on user techstack" },
        projectedRevenue: { type: Type.STRING, description: "Conservative estimate" },
        dollarPerHour: { type: Type.NUMBER, description: "Projected Value / Effort Hours" },
        rationale: { type: Type.STRING, description: "Brief explanation of the math" }
      },
      required: ["estimatedEffortHours", "projectedRevenue", "dollarPerHour", "rationale"]
    }
  },
  required: ["competitors", "marketStatus", "competitorWeaknesses", "winningAngle", "valuation"]
};

// New function to parse unstructured text into a UserProfile
export const parseUserProfile = async (text: string): Promise<Partial<UserProfile>> => {
  const modelId = "gemini-2.5-flash";
  const prompt = `
    You are an intelligent profile parser. Extract user details from the text below to populate a "Digital Twin" profile.
    
    TEXT INPUT:
    "${text}"
    
    INSTRUCTIONS:
    - Extract Name, Core Skills, Tech Stack, Resources, Interests.
    - For "platformTarget": Extract specific platforms if mentioned (Upwork, Fiverr, etc.). IF NOT mentioned, return an empty string "".
    - Simplify and summarize the values (e.g., convert "I am expert in React and Node" to "React, Node.js").
  `;

  const profileSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      coreSkills: { type: Type.STRING },
      techStack: { type: Type.STRING },
      resources: { type: Type.STRING },
      interests: { type: Type.STRING },
      platformTarget: { type: Type.STRING },
    }
  };

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: profileSchema
    }
  });

  return JSON.parse(response.text) as Partial<UserProfile>;
};

export const scanMarketOpportunities = async (profile: UserProfile): Promise<MarketScanResult> => {
  const modelIdSearch = "gemini-2.5-flash"; // Good for search
  const modelIdReasoning = "gemini-2.5-flash"; // Good for JSON structure

  // Step 1: The Radar (Search Phase)
  // We use the search tool to get fresh data about the market.
  // Handle empty platform target by defaulting to broad search
  const targetPlatforms = profile.platformTarget && profile.platformTarget.trim() !== "" 
    ? profile.platformTarget 
    : "All major platforms (Upwork, Freelancer, Toptal, Indie Hacking, Gumroad, Micro-SaaS marketplaces)";

  const searchPrompt = `
    Analyze current market demand in late 2024 and 2025 for a developer with the following profile:
    - Skills: ${profile.coreSkills}
    - Tech Stack: ${profile.techStack}
    - Interests: ${profile.interests}
    - Target Platforms: ${targetPlatforms}

    Find 5-7 specific, high-value opportunities (Freelance gigs, Micro-SaaS ideas, or Digital Products).
    
    CRITICAL:
    1. Find "Perfect Matches" (User has 90%+ skills).
    2. Find "Stretch Opportunities" (High Pay/Demand, but User matches ~70% skills). 
       Example: User knows React but opportunity needs React + Web3 basics.
       Example: User knows Python but opportunity needs Python + a specific automation library.
    
    Focus on specific problems businesses are paying to solve right now.
  `;

  console.log("Step 1: Scanning Market...");
  
  const searchResponse = await ai.models.generateContent({
    model: modelIdSearch,
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const marketResearchText = searchResponse.text;
  const groundingChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  // Extract sources for the UI
  const sources = groundingChunks
    .map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
    .filter((s: any) => s !== null);

  console.log("Market Data Received. Step 2: Strategizing...");

  // Step 2: The Matchmaker & Strategist (Synthesis Phase)
  // We feed the search results + profile into the model to get structured JSON.
  const strategyPrompt = `
    You are a Talent Manager for a developer named ${profile.name}.
    
    USER PROFILE:
    ${JSON.stringify(profile)}

    MARKET RESEARCH DATA (from Google Search):
    ${marketResearchText}

    TASK:
    Generate a list of Personalized Opportunities.
    
    RULES:
    1. FILTER: Only keep opportunities where the User's Match Score is > 60%.
    2. LEARNING BRIDGE: If Match Score is 60-80% and the opportunity is high value, you MUST fill the "learningBridge" field. Explain what tiny skill is missing and how to learn it fast.
    3. TYPES: Mix Freelance, Micro-SaaS, and Digital Product ideas.
    4. ACTIONABLE: The "actionPlan" must be specific.
  `;

  const strategyResponse = await ai.models.generateContent({
    model: modelIdReasoning,
    contents: strategyPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: opportunitySchema,
      systemInstruction: "You are an expert technical career strategist. You find the 'Ikigai' intersection. You encourage learning new things if the reward is high.",
    },
  });

  const rawJSON = strategyResponse.text;
  let opportunities: Opportunity[] = [];

  try {
    const parsed = JSON.parse(rawJSON);
    if (parsed.opportunities) {
      opportunities = parsed.opportunities.map((op: any, index: number) => ({
        ...op,
        id: `op-${Date.now()}-${index}`,
      }));
    }
  } catch (e) {
    console.error("Failed to parse strategy JSON", e);
  }

  return {
    opportunities,
    sources,
    scannedAt: new Date().toISOString(),
  };
};

export const analyzeCompetitors = async (opportunity: Opportunity): Promise<SpyReport> => {
  const modelId = "gemini-2.5-flash";

  const searchPrompt = `
    I have a product/service idea: "${opportunity.title}" (${opportunity.description}).
    Target platform: ${opportunity.platform}.
    
    Perform a competitive analysis and pricing research:
    1. Search for existing competitors or alternatives on Google, Reddit, and ProductHunt.
    2. Search for PRICING of similar services (monthly subs, hourly rates, fixed project costs).
    3. Search for complaints to find weaknesses.
  `;

  // Step 1: Search for competitor info
  const searchResponse = await ai.models.generateContent({
    model: modelId,
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const researchData = searchResponse.text;

  // Step 2: Synthesize Spy Report + Valuation
  const analysisPrompt = `
    You are "The Niche Spy" and "Valuation Expert".
    
    IDEA: ${opportunity.title}
    TECH STACK RECOMMENDED: ${opportunity.techStackRecommendation.join(", ")}
    MARKET RESEARCH: ${researchData}

    Analyze the market to find a "Winning Angle" AND Calculate ROI.
    
    VALUATION LOGIC:
    - Estimate Effort: How many hours would it take a skilled dev (using the recommended stack) to build/complete this? Be realistic.
    - Estimate Revenue: Based on competitor pricing found in research.
    - Calculate $/Hour: Revenue / Effort.
  `;

  const analysisResponse = await ai.models.generateContent({
    model: modelId,
    contents: analysisPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: spyReportSchema
    }
  });

  return JSON.parse(analysisResponse.text) as SpyReport;
};