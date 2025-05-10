// src/components/ai/AIRecommendationClient.tsx
"use client";

import { useFormState, useFormStatus } from "react-dom";
import { getAIRecommendationAction, type RecommendationActionState } from "@/actions/recommendationActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_AI_USER_HISTORY, DEFAULT_AI_TEAM_PERFORMANCE } from "@/lib/constants";
import { Lightbulb, Loader2, AlertTriangle } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
      Get AI Recommendation
    </Button>
  );
}

const AIRecommendationClient = () => {
  const initialState: RecommendationActionState = {};
  const [state, formAction] = useFormState(getAIRecommendationAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message && state.error) {
      toast({
        title: state.error,
        description: state.message,
        variant: "destructive",
      });
    } else if (state.message && state.data) {
       toast({
        title: "AI Recommendation",
        description: "Successfully fetched your recommendation!",
        className: "bg-primary text-primary-foreground",
      });
      // Optionally reset form: formRef.current?.reset();
    }
  }, [state, toast]);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl my-10">
      <CardHeader className="text-center">
        <Lightbulb className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle className="text-2xl font-bold">AI-Powered Predictions</CardTitle>
        <CardDescription>
          Leverage AI to get insights on your next simulated bet. Fill in the details below.
        </CardDescription>
      </CardHeader>
      <form action={formAction} ref={formRef}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="userBettingHistory" className="font-semibold">Your Betting Profile/History</Label>
            <Textarea
              id="userBettingHistory"
              name="userBettingHistory"
              placeholder="e.g., I prefer high-risk, high-reward bets on underdog teams in football."
              rows={4}
              className="border-input focus:border-primary"
              defaultValue={DEFAULT_AI_USER_HISTORY}
              required
            />
            <p className="text-xs text-muted-foreground">Describe your betting style or past experiences.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamPerformanceData" className="font-semibold">Team(s) & Match Context</Label>
            <Textarea
              id="teamPerformanceData"
              name="teamPerformanceData"
              placeholder="e.g., Team X: WWLWD, strong attack. Team Y: LLLDW, good defense but struggles to score. Match is crucial for Team X."
              rows={5}
              className="border-input focus:border-primary"
              defaultValue={DEFAULT_AI_TEAM_PERFORMANCE}
              required
            />
            <p className="text-xs text-muted-foreground">Provide current form, strengths, weaknesses, or any relevant match context.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-4">
          <SubmitButton />
          {state.error && state.message && !state.data && (
             <p className="text-sm text-destructive text-center flex items-center gap-1"><AlertTriangle size={14}/> {state.message}</p>
          )}
        </CardFooter>
      </form>

      {state.data && (
        <div className="p-6 border-t border-border mt-4 bg-background rounded-b-lg">
          <h3 className="text-xl font-semibold text-primary mb-2">AI Recommendation:</h3>
          <p className="text-lg font-medium text-foreground">
            Bet on: <span className="text-primary">{state.data.recommendedTeam}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
            <strong className="text-foreground">Reasoning:</strong> {state.data.reasoning}
          </p>
        </div>
      )}
    </Card>
  );
};

export default AIRecommendationClient;
