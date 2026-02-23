import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HEBREW_DIFFICULTY } from "@/game/constants";
import type { Difficulty } from "@/game/types";

type CityEntry = { id: string; name: string; score?: number };

type CityListModalProps = {
  open: boolean;
  difficulty: Difficulty;
  totalCount: number;
  citySearch: string;
  onCitySearchChange: (value: string) => void;
  entries: CityEntry[];
  bestMatchedCityId: string | null;
  onClose: () => void;
};

export function CityListModal({
  open,
  difficulty,
  totalCount,
  citySearch,
  onCitySearchChange,
  entries,
  bestMatchedCityId,
  onClose,
}: CityListModalProps) {
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listContainerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [citySearch, open]);
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-no-continue="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-lg"
            data-no-continue="true"
          >
            <Card className="max-h-[72vh] overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base text-primary">
                    רשימת הערים ברמת {HEBREW_DIFFICULTY[difficulty]} ({totalCount})
                  </CardTitle>
                  <Button type="button" size="sm" variant="secondary" className="rounded-full" onClick={onClose}>
                    סגור
                  </Button>
                </div>
              </CardHeader>
              <CardContent ref={listContainerRef} className="max-h-[56vh] overflow-auto px-4 pb-4 pt-0">
                <div className="mb-3">
                  <input
                    type="text"
                    value={citySearch}
                    onChange={(event) => onCitySearchChange(event.target.value)}
                    placeholder="חפשו עיר..."
                    className="h-10 w-full rounded-xl border border-primary/25 bg-white/80 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 dark:bg-slate-900/70"
                  />
                </div>
                <motion.ul
                  className="m-0 list-disc space-y-0.5 pr-5"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1, transition: { staggerChildren: 0.015 } },
                  }}
                >
                  {entries.map((entry) => (
                    <motion.li
                      key={entry.id}
                      variants={{ hidden: { opacity: 0, x: 8 }, show: { opacity: 1, x: 0 } }}
                      className={
                        bestMatchedCityId === entry.id
                          ? "rounded-lg bg-amber-200/70 px-2 py-0.5 font-semibold leading-6 text-amber-900 dark:bg-amber-400/30 dark:text-amber-100"
                          : "leading-6"
                      }
                    >
                      {entry.name}
                    </motion.li>
                  ))}
                </motion.ul>
                {citySearch.trim() && entries.length === 0 ? (
                  <p className="pt-2 text-sm text-ink/70">לא נמצאו תוצאות לחיפוש.</p>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}


