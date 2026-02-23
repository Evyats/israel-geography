import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { HEBREW_DIFFICULTY } from "@/game/constants";
import type { Difficulty, SettingsState } from "@/game/types";

type SetupControlsProps = {
  settings: SettingsState;
  currentPoolLength: number;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onToggleCityList: () => void;
  onToggleTerritories: (checked: boolean) => void;
};

export function SetupControls({
  settings,
  currentPoolLength,
  onDifficultyChange,
  onToggleCityList,
  onToggleTerritories,
}: SetupControlsProps) {
  return (
    <div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">רמת קושי</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 pt-0">
          <div className="flex items-center justify-center gap-3">
            {(["easy", "medium", "hard"] as Difficulty[]).map((level) => {
              const active = settings.difficulty === level;
              return (
                <motion.div key={level} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    type="button"
                    variant={active ? "default" : "secondary"}
                    className={active ? "h-10 min-w-[98px] rounded-full px-3" : "h-10 min-w-[98px] rounded-full border border-primary/30 px-3"}
                    data-no-continue="true"
                    onClick={() => onDifficultyChange(level)}
                  >
                    <span>{HEBREW_DIFFICULTY[level]}</span>
                    <AnimatePresence>
                      {active ? (
                        <motion.span
                          className="inline-flex items-center rounded-full bg-black/30 px-2 py-0.5 text-xs text-primary-foreground"
                          initial={{ opacity: 0, x: 12, scale: 0.75 }}
                          animate={{ opacity: 1, x: 0, scale: 1.08 }}
                          exit={{ opacity: 0, x: 8, scale: 0.8 }}
                          transition={{ duration: 0.2 }}
                        >
                          {currentPoolLength}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              );
            })}
          </div>
          <Button id="city-list-toggle-btn" variant="secondary" size="lg" data-no-continue="true" onClick={onToggleCityList}>
            הצג רשימת הערים ברמה שנבחרה
          </Button>
          <div className="space-y-2 rounded-xl border border-white/20 bg-black/10 px-3 py-3">
            <p className="text-sm font-semibold text-ink/90">אזורי יהודה ושומרון ועזה</p>
            <label className="flex items-center justify-between">
              <span className="text-sm text-ink/90">
                {settings.includeTerritories ? "לכלול אזורי יהודה ושומרון ועזה" : "לא לכלול אזורי יהודה ושומרון ועזה"}
              </span>
              <Switch
                data-no-continue="true"
                checked={settings.includeTerritories}
                onCheckedChange={onToggleTerritories}
              />
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
