export interface TopicForRanking {
  id: string;
  title: string;
  description: string | null;
  status: string;
  temperature: string;
  lastActivityAt: Date;
  gatewayComplete: boolean;
  intermediateStarted: boolean;
  intermediateComplete: boolean;
  advancedStarted: boolean;
  advancedComplete: boolean;
  tags: { tag: { id: string; name: string } }[];
  resources: {
    id: string;
    tier: string;
    completions: { id: string }[];
  }[];
}

export interface RankedTopic extends TopicForRanking {
  score: number;
  stage: string;
}
