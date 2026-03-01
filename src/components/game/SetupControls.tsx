import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { SettingsState } from "@/game/types";

type SetupControlsProps = {
  settings: SettingsState;
  currentPoolLength: number;
  segmentMinCount: number;
  segmentMaxCount: number;
  usingSegmentedDifficulty: boolean;
  segmentOptions: Array<{ index: number; label: string; targetCount: number }>;
  onDifficultySegmentChange: (segmentIndex: number) => void;
  onToggleCityList: () => void;
  onSetIncludeTerritories: (includeTerritories: boolean) => void;
};

export function SetupControls({
  settings,
  currentPoolLength,
  segmentMinCount,
  segmentMaxCount,
  usingSegmentedDifficulty,
  segmentOptions,
  onDifficultySegmentChange,
  onToggleCityList,
  onSetIncludeTerritories,
}: SetupControlsProps) {
  const showListButtonClass = "h-11 w-full rounded-full font-semibold";
  const maxSegmentIndex = Math.max(0, segmentOptions.length - 1);
  const sliderValue = Math.min(settings.difficultySegmentIndex, maxSegmentIndex);

  return (
    <div className="px-4">
      <Card className="rounded-3xl">
        <CardContent className="space-y-3 px-4 pb-4 pt-4">
          {usingSegmentedDifficulty ? (
            <div className="space-y-2 rounded-2xl bg-black/10 px-3 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink/90">רמת קושי</p>
                <p className="text-xs font-semibold text-primary">{currentPoolLength} ערים</p>
              </div>
              <input
                data-no-continue="true"
                type="range"
                min={0}
                max={maxSegmentIndex}
                step={1}
                value={sliderValue}
                onChange={(event) => onDifficultySegmentChange(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-[hsl(var(--primary))]"
              />
              <div className="flex items-center justify-between text-[10px] text-ink/70">
                <span>{segmentMinCount || segmentOptions[0]?.targetCount || 0}</span>
                <span>{segmentMaxCount || segmentOptions[maxSegmentIndex]?.targetCount || currentPoolLength}</span>
              </div>
            </div>
          ) : null}

          <div className="space-y-2 py-1">
            <div dir="rtl" className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="cursor-pointer bg-transparent p-0 text-sm font-semibold text-ink/90"
                data-no-continue="true"
                onClick={() => onSetIncludeTerritories(!settings.includeTerritories)}
              >
                לכלול את איזורי פלסטין הכבושה?
              </button>
              <Switch
                data-no-continue="true"
                checked={settings.includeTerritories}
                onCheckedChange={onSetIncludeTerritories}
                className="h-8 w-16 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                checkedLabel="כן"
                uncheckedLabel="לא"
              />
            </div>
          </div>
          <Button
            id="city-list-toggle-btn"
            variant="secondary"
            size="lg"
            className={`${showListButtonClass} hidden sm:inline-flex`}
            data-no-continue="true"
            onClick={onToggleCityList}
          >
            הצג רשימת הערים שנבחרה
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
