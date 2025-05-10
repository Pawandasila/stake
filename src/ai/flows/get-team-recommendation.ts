'use server';

/**
 * @fileOverview Provides AI-powered team recommendations to enhance simulated betting outcomes.
 *
 * - getTeamRecommendation - A function that returns an AI-powered team recommendation.
 * - GetTeamRecommendationInput - The input type for the getTeamRecommendation function.
 * - GetTeamRecommendationOutput - The return type for the getTeamRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetTeamRecommendationInputSchema = z.object({
  userBettingHistory: z
    .string()
    .describe('The user betting history on simulated bets.'),
  teamPerformanceData: z
    .string()
    .describe('The recent performance data of different teams.'),
});
export type GetTeamRecommendationInput = z.infer<typeof GetTeamRecommendationInputSchema>;

const GetTeamRecommendationOutputSchema = z.object({
  recommendedTeam: z
    .string()
    .describe('The name of the recommended team for simulated bets.'),
  reasoning: z
    .string()
    .describe('The detailed reasoning behind the team recommendation.'),
});
export type GetTeamRecommendationOutput = z.infer<typeof GetTeamRecommendationOutputSchema>;

export async function getTeamRecommendation(
  input: GetTeamRecommendationInput
): Promise<GetTeamRecommendationOutput> {
  return getTeamRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getTeamRecommendationPrompt',
  input: {schema: GetTeamRecommendationInputSchema},
  output: {schema: GetTeamRecommendationOutputSchema},
  prompt: `Based on the user's betting history and the teams' performance data, provide an AI-powered team recommendation to improve the user's simulated betting outcomes.\n\nUser Betting History: {{{userBettingHistory}}}\n\nTeam Performance Data: {{{teamPerformanceData}}}\n\nConsider various factors such as winning streaks, recent performance, and historical data to provide the best recommendation. You MUST explain the reasoning behind the recommendation in detail.`,
});

const getTeamRecommendationFlow = ai.defineFlow(
  {
    name: 'getTeamRecommendationFlow',
    inputSchema: GetTeamRecommendationInputSchema,
    outputSchema: GetTeamRecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
