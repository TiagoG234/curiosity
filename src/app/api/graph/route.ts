import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess } from "@/lib/api";

interface GraphNode {
  id: string;
  label: string;
  type: "topic";
  status: string;
  temperature: string;
  gatewayComplete: boolean;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: "shared_concept" | "inspiration";
}

export async function GET(_request: NextRequest) {
  const userId = await getCurrentUserId();

  // Fetch all topics as nodes
  const topics = await prisma.topic.findMany({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      temperature: true,
      gatewayComplete: true
    }
  });

  const nodes: GraphNode[] = topics.map((topic) => ({
    id: topic.id,
    label: topic.title,
    type: "topic",
    status: topic.status,
    temperature: topic.temperature,
    gatewayComplete: topic.gatewayComplete
  }));

  const edges: GraphEdge[] = [];

  // Build edges from shared concepts (topics that share the same concept)
  const topicConcepts = await prisma.topicConcept.findMany({
    where: {
      topic: { userId }
    },
    select: {
      topicId: true,
      conceptId: true,
      concept: { select: { name: true } }
    }
  });

  // Group by conceptId to find topics sharing the same concept
  const conceptToTopics = new Map<string, { topicId: string; conceptName: string }[]>();
  for (const tc of topicConcepts) {
    const existing = conceptToTopics.get(tc.conceptId) ?? [];
    existing.push({ topicId: tc.topicId, conceptName: tc.concept.name });
    conceptToTopics.set(tc.conceptId, existing);
  }

  for (const [conceptId, entries] of conceptToTopics) {
    // Create an edge for every pair of topics sharing this concept
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        edges.push({
          id: `concept-${conceptId}-${entries[i].topicId}-${entries[j].topicId}`,
          source: entries[i].topicId,
          target: entries[j].topicId,
          label: entries[i].conceptName,
          type: "shared_concept"
        });
      }
    }
  }

  // Build edges from inspirations
  const inspirations = await prisma.topicInspiration.findMany({
    where: {
      topic: { userId },
      inspiredByTopicId: { not: null }
    },
    select: {
      id: true,
      topicId: true,
      inspiredByTopicId: true,
      context: true
    }
  });

  for (const insp of inspirations) {
    if (insp.inspiredByTopicId) {
      edges.push({
        id: `inspiration-${insp.id}`,
        source: insp.inspiredByTopicId,
        target: insp.topicId,
        label: insp.context || "inspired",
        type: "inspiration"
      });
    }
  }

  return apiSuccess({ nodes, edges });
}
