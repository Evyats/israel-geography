import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TOTAL_QUESTIONS, createIdleSessionState } from "@/game/constants";
import type { FeedbackTone, LocalityFeature, SessionState } from "@/game/types";
import { randomPick } from "@/game/utils";

const CONTINUE_HINT_DELAY_MS = 5000;

type Screen = "home" | "play" | "end";

type SessionEngineArgs = {
  currentPool: string[];
  fullFeatureIndex: Map<string, LocalityFeature>;
  featureCenterById: Map<string, [number, number]>;
};

export function useGameSession({ currentPool, fullFeatureIndex, featureCenterById }: SessionEngineArgs) {
  const [session, setSession] = useState<SessionState>(createIdleSessionState());
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("");
  const [showContinueHint, setShowContinueHint] = useState(false);
  const [questionText, setQuestionText] = useState("");

  const sessionRef = useRef<SessionState>(session);
  const continueHintTimerRef = useRef<number | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const clearContinueHintTimer = useCallback(() => {
    if (continueHintTimerRef.current !== null) {
      window.clearTimeout(continueHintTimerRef.current);
      continueHintTimerRef.current = null;
    }
  }, []);

  const resetSession = useCallback(() => {
    clearContinueHintTimer();
    const nextSession = createIdleSessionState();
    sessionRef.current = nextSession;
    setSession(nextSession);
    setFeedbackText("");
    setFeedbackTone("");
    setShowContinueHint(false);
  }, [clearContinueHintTimer]);

  const finishGame = useCallback((score: number) => {
    setSession((prev) => ({ ...prev, status: "finished", currentTargetId: null, selectedFeatureId: null }));
    setQuestionText("סיום משחק");
    setFeedbackText(`ניקוד סופי: ${score}`);
    setFeedbackTone("");
  }, []);

  const getProximityPoints = useCallback(
    (selectedId: string, targetId: string) => {
      if (selectedId === targetId) return 100;

      const selectedCenter = featureCenterById.get(selectedId);
      const targetCenter = featureCenterById.get(targetId);
      if (!selectedCenter || !targetCenter) return 0;

      const [slat, slng] = selectedCenter;
      const [tlat, tlng] = targetCenter;
      const avgLat = ((slat + tlat) / 2) * (Math.PI / 180);
      const dxKm = (slng - tlng) * 111.32 * Math.cos(avgLat);
      const dyKm = (slat - tlat) * 110.57;
      const distanceKm = Math.sqrt(dxKm * dxKm + dyKm * dyKm);

      return Math.max(0, Math.round(80 * Math.exp(-distanceKm / 40)));
    },
    [featureCenterById]
  );

  const nextRound = useCallback(() => {
    clearContinueHintTimer();
    setShowContinueHint(false);

    setSession((prev) => {
      if (prev.currentIndex >= TOTAL_QUESTIONS) {
        finishGame(prev.score);
        return prev;
      }

      const remaining = currentPool.filter((id) => !prev.askedIds.includes(id));
      const sourcePool = remaining.length > 0 ? remaining : currentPool;
      if (sourcePool.length === 0) {
        finishGame(prev.score);
        return prev;
      }

      const targetId = randomPick(sourcePool);
      const targetFeature = fullFeatureIndex.get(targetId);
      if (!targetFeature) {
        finishGame(prev.score);
        return prev;
      }

      setQuestionText(`מצאו את העיר: ${targetFeature.properties.name_he}`);
      setFeedbackText("");
      setFeedbackTone("");

      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        currentTargetId: targetId,
        askedIds: remaining.length > 0 ? [...prev.askedIds, targetId] : [targetId],
        selectedFeatureId: null,
        status: "awaiting_answer",
      };
    });
  }, [clearContinueHintTimer, currentPool, finishGame, fullFeatureIndex]);

  const onStartGame = useCallback(
    (startDisabled: boolean) => {
      if (startDisabled) return;
      clearContinueHintTimer();
      setShowContinueHint(false);
      const nextSession = createIdleSessionState();

      const targetId = randomPick(currentPool);
      const targetFeature = fullFeatureIndex.get(targetId);
      if (!targetFeature) {
        resetSession();
        return;
      }

      setQuestionText(`מצאו את העיר: ${targetFeature.properties.name_he}`);
      setFeedbackText("");
      setFeedbackTone("");

      setSession({
        ...nextSession,
        currentIndex: 1,
        currentTargetId: targetId,
        askedIds: [targetId],
        status: "awaiting_answer",
        selectedFeatureId: null,
      });
    },
    [clearContinueHintTimer, currentPool, fullFeatureIndex, resetSession]
  );

  const handleCityClick = useCallback(
    (featureId: string) => {
      setSession((prev) => {
        if (prev.status !== "awaiting_answer" || !prev.currentTargetId) return prev;

        const isCorrect = featureId === prev.currentTargetId;
        const roundPoints = getProximityPoints(featureId, prev.currentTargetId);

        setFeedbackText(isCorrect ? `נכון! +${roundPoints}` : `לא נכון, קיבלתם +${roundPoints} לפי קרבה`);
        setFeedbackTone(isCorrect ? "ok" : "bad");
        setShowContinueHint(false);
        clearContinueHintTimer();

        continueHintTimerRef.current = window.setTimeout(() => {
          if (sessionRef.current.status !== "locked") return;
          setShowContinueHint(true);
        }, CONTINUE_HINT_DELAY_MS);

        return {
          ...prev,
          score: prev.score + roundPoints,
          selectedFeatureId: featureId,
          status: "locked",
        };
      });
    },
    [clearContinueHintTimer, getProximityPoints]
  );

  const continueAfterAnswer = useCallback(() => {
    if (sessionRef.current.status !== "locked") return;
    nextRound();
  }, [nextRound]);

  const onStopGame = useCallback(() => {
    clearContinueHintTimer();
    setShowContinueHint(false);
    setSession((prev) => {
      setQuestionText("המשחק הופסק");
      setFeedbackText(`ניקוד סופי: ${prev.score}`);
      setFeedbackTone("");
      return {
        ...prev,
        status: "finished",
        currentTargetId: null,
        selectedFeatureId: null,
      };
    });
  }, [clearContinueHintTimer]);

  const goToHomeScreen = useCallback(() => {
    clearContinueHintTimer();
    resetSession();
    setQuestionText("");
  }, [clearContinueHintTimer, resetSession]);

  const onReplayCurrentSettings = useCallback(
    (startDisabled: boolean) => {
      onStartGame(startDisabled);
    },
    [onStartGame]
  );

  const leftScreen: Screen =
    session.status === "finished" ? "end" : session.status === "awaiting_answer" || session.status === "locked" ? "play" : "home";

  const currentTargetName = useMemo(() => {
    if (!session.currentTargetId) return null;
    return fullFeatureIndex.get(session.currentTargetId)?.properties.name_he ?? null;
  }, [fullFeatureIndex, session.currentTargetId]);

  useEffect(() => {
    return () => {
      clearContinueHintTimer();
    };
  }, [clearContinueHintTimer]);

  return {
    session,
    feedbackText,
    feedbackTone,
    showContinueHint,
    questionText,
    leftScreen,
    currentTargetName,
    setQuestionText,
    setFeedbackText,
    setFeedbackTone,
    onStartGame,
    handleCityClick,
    continueAfterAnswer,
    onStopGame,
    goToHomeScreen,
    onReplayCurrentSettings,
  };
}
