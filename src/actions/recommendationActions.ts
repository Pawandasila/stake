// src/actions/recommendationActions.ts
"use server";

import { getTeamRecommendation, type GetTeamRecommendationInput, type GetTeamRecommendationOutput } from "@/ai/flows/get-team-recommendation";
import { z } from "zod";

const ActionInputSchema = z.object({
  userBettingHistory: z.string().min(10, "Please provide some details about your betting history or preferences."),
  teamPerformanceData: z.string().min(10, "Please provide some context on team performance."),
});

export type RecommendationActionState = {
  data?: GetTeamRecommendationOutput;
  error?: string;
  message?: string;
};

export async function getAIRecommendationAction(
  prevState: RecommendationActionState,
  formData: FormData
): Promise<RecommendationActionState> {
  
  const rawInput = {
    userBettingHistory: formData.get("userBettingHistory"),
    teamPerformanceData: formData.get("teamPerformanceData"),
  };

  const validatedFields = ActionInputSchema.safeParse(rawInput);

  if (!validatedFields.success) {
    return {
      error: "Validation Error",
      message: validatedFields.error.issues.map((issue) => issue.message).join(", "),
    };
  }
  
  const input: GetTeamRecommendationInput = {
    userBettingHistory: validatedFields.data.userBettingHistory,
    teamPerformanceData: validatedFields.data.teamPerformanceData,
  };

  try {
    const recommendation = await getTeamRecommendation(input);
    if (!recommendation || !recommendation.recommendedTeam) {
      return { error: "AI Error", message: "Failed to get a recommendation from the AI." };
    }
    return { data: recommendation, message: "Recommendation received!" };
  } catch (error) {
    console.error("Error getting AI recommendation:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { error: "Server Error", message: `Failed to get recommendation: ${errorMessage}` };
  }
}
