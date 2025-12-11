export interface UserProfile {
  name: string;
  background: string; // New field: e.g. "4th year CS student, 6mo internship"
  coreSkills: string; // e.g., "React, Python, Copywriting"
  techStack: string; // e.g., "Next.js, Supabase, Tailwind"
  resources: string; // e.g., "4 hours/day, $0 budget"
  interests: string; // e.g., "Automation, SaaS"
  platformTarget: string; // e.g., "Upwork, Gumroad"
}

export type OpportunityType = 'Freelance' | 'Micro-SaaS' | 'DigitalProduct' | 'Automation/MMO';

export interface Valuation {
  estimatedEffortHours: number;
  projectedRevenue: string; // e.g. "$500/mo" or "$1000 fixed"
  dollarPerHour: number;
  rationale: string;
}

export interface SpyReport {
  competitors: string[];
  marketStatus: string; // e.g., "Saturated", "Blue Ocean"
  competitorWeaknesses: string[]; // e.g., "Expensive", "No support"
  winningAngle: string; // How to win
  valuation?: Valuation; // New Valuator Feature
}

export interface LearningBridge {
  missingSkill: string;
  analogy: string; // "ethers.js is like JS"
  hoursToLearn: number;
  curriculum: string[]; // Steps to learn
}

export interface Opportunity {
  id: string;
  title: string;
  type: OpportunityType;
  description: string;
  matchScore: number; // 0-100
  matchReasoning: string;
  estimatedValue: string;
  platform: string;
  actionPlan: string[];
  techStackRecommendation: string[];
  searchContext?: string; // Where this idea came from
  spyReport?: SpyReport; // Optional field for deep dive data
  learningBridge?: LearningBridge; // New Learning Bridge Feature
}

export interface MarketScanResult {
  opportunities: Opportunity[];
  sources: { title: string; uri: string }[];
  scannedAt: string;
}