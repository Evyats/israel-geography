import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";

import { CityListModal } from "@/components/game/CityListModal";
import { SetupControls } from "@/components/game/SetupControls";
import { Button } from "@/components/ui/button";
import type { SettingsState } from "@/game/types";

type Screen = "home" | "play" | "end";

type SidebarPanelProps = {
  leftScreen: Screen;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  settings: SettingsState;
  currentPoolLength: number;
  onDifficultyChange: (difficulty: SettingsState["difficulty"]) => void;
  onToggleCityList: () => void;
  onToggleTerritories: (checked: boolean) => void;
  startDisabled: boolean;
  warningText: string;
  onStartGame: () => void;
  currentTargetName: string | null;
  questionText: string;
  feedbackText: string;
  feedbackTone: "ok" | "bad" | "";
  showContinueHint: boolean;
  onStopGame: () => void;
  score: number;
  onGoHome: () => void;
  onReplay: () => void;
  showCityList: boolean;
  citySearch: string;
  onCitySearchChange: (value: string) => void;
  cityEntriesForCurrentSettingsCount: number;
  displayedCityEntries: Array<{ id: string; name: string; score?: number }>;
  bestMatchedCityId: string | null;
  onCloseCityList: () => void;
};

export function SidebarPanel({
  leftScreen,
  isDarkMode,
  onToggleTheme,
  settings,
  currentPoolLength,
  onDifficultyChange,
  onToggleCityList,
  onToggleTerritories,
  startDisabled,
  warningText,
  onStartGame,
  currentTargetName,
  questionText,
  feedbackText,
  feedbackTone,
  showContinueHint,
  onStopGame,
  score,
  onGoHome,
  onReplay,
  showCityList,
  citySearch,
  onCitySearchChange,
  cityEntriesForCurrentSettingsCount,
  displayedCityEntries,
  bestMatchedCityId,
  onCloseCityList,
}: SidebarPanelProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const screen: Screen = leftScreen === "play" || leftScreen === "end" || leftScreen === "home" ? leftScreen : "home";

  useEffect(() => {
    sectionRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [screen]);

  return (
    <section ref={sectionRef} className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-3xl border border-white/20 bg-white/50 p-4 backdrop-blur-sm dark:bg-white/10">
      <header className="relative text-center">
        <div className="absolute left-0 top-0">
          <motion.div whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.05 }}>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={isDarkMode ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
              data-no-continue="true"
              onClick={onToggleTheme}
            >
              <span className="relative block h-4 w-4 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  {isDarkMode ? (
                    <motion.span
                      key="sun"
                      className="absolute inset-0"
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 22, opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <Sun className="h-4 w-4" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="moon"
                      className="absolute inset-0"
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 22, opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <Moon className="h-4 w-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </Button>
          </motion.div>
        </div>
        <motion.div
          className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full border border-primary/40 bg-primary/20 text-2xl"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          📍
        </motion.div>
        <h1 className="text-4xl font-extrabold">משחק מיקום ערים בישראל</h1>
      </header>

      {screen === "home" ? (
        <>
          <SetupControls
            settings={settings}
            currentPoolLength={currentPoolLength}
            onDifficultyChange={onDifficultyChange}
            onToggleCityList={onToggleCityList}
            onToggleTerritories={onToggleTerritories}
          />
          <div className="grid justify-center gap-2">
            <Button
              size="lg"
              className="h-14 min-w-[260px] rounded-2xl bg-gradient-to-l from-primary to-cyan-400 text-lg font-extrabold shadow-[0_14px_30px_rgba(34,145,255,0.32)] hover:from-primary/95 hover:to-cyan-400/95"
              data-no-continue="true"
              onClick={onStartGame}
              disabled={startDisabled}
            >
              התחל משחק
            </Button>
            <p className="min-h-5 text-center text-sm text-[#ff9f9f]">{warningText}</p>
          </div>
        </>
      ) : null}

      {screen === "play" ? (
        <>
          <div className="space-y-3 px-1 text-ink">
            <div className="rounded-2xl border border-primary/30 bg-white/80 p-4 text-center dark:bg-black/25">
              <p className="text-sm font-semibold text-ink/75">מצאו את העיר:</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-primary">
                {(currentTargetName ?? questionText) || "טוען סיבוב..."}
              </p>
              <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-primary/70" />
            </div>

            <p className={feedbackTone === "ok" ? "font-semibold text-[#3fe28a]" : feedbackTone === "bad" ? "font-semibold text-[#ff6b6b]" : ""}>
              {feedbackText}
            </p>

            {showContinueHint ? (
              <p className="text-sm font-medium text-ink/75">לחצו בכל מקום כדי להמשיך לסיבוב הבא</p>
            ) : null}
          </div>

          <div className="grid justify-center gap-2">
            <Button
              size="lg"
              variant="destructive"
              className="h-12 min-w-[260px] rounded-2xl text-base font-bold"
              data-no-continue="true"
              onClick={onStopGame}
            >
              עצור משחק
            </Button>
          </div>
        </>
      ) : null}

      {screen === "end" ? (
        <>
          <div className="rounded-2xl border border-white/20 bg-black/10 p-4 text-center">
            <p className="text-sm text-ink/75">תוצאת המשחק</p>
            <p className="mt-2 text-3xl font-extrabold text-primary">{score}</p>
            <p className="mt-1 text-sm text-ink/75">נקודות</p>
          </div>
          <div className="grid justify-center gap-2">
            <Button size="lg" className="min-w-[260px]" data-no-continue="true" onClick={onGoHome}>
              חזרה למסך הבית
            </Button>
            <Button size="lg" variant="secondary" className="min-w-[260px]" data-no-continue="true" onClick={onReplay}>
              שחקו שוב עם אותן הגדרות
            </Button>
          </div>
        </>
      ) : null}

      <CityListModal
        open={screen === "home" && showCityList}
        difficulty={settings.difficulty}
        totalCount={cityEntriesForCurrentSettingsCount}
        citySearch={citySearch}
        onCitySearchChange={onCitySearchChange}
        entries={displayedCityEntries}
        bestMatchedCityId={bestMatchedCityId}
        onClose={onCloseCityList}
      />
    </section>
  );
}
