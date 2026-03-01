import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CityEntry = { id: string; name: string; score?: number };

type CityListModalProps = {
  open: boolean;
  totalCount: number;
  citySearch: string;
  onCitySearchChange: (value: string) => void;
  entries: CityEntry[];
  bestMatchedCityId: string | null;
  onClose: () => void;
};

export function CityListModal({
  open,
  totalCount,
  citySearch,
  onCitySearchChange,
  entries,
  bestMatchedCityId,
  onClose,
}: CityListModalProps) {
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const modalContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listContainerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [citySearch, open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!modalContentRef.current?.contains(target)) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onClose, open]);

  const modal = (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[2200] flex items-start justify-center bg-black/30 p-4 pt-[10vh] backdrop-blur-sm sm:pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-no-continue="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={modalContentRef}
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-[20rem] sm:max-w-xs"
            data-no-continue="true"
          >
            <Card className="max-h-[72vh] overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base text-primary">רשימת הערים ({totalCount})</CardTitle>
                  <Button type="button" size="sm" variant="secondary" className="rounded-full" onClick={onClose}>
                    סגור
                  </Button>
                </div>
              </CardHeader>
              <CardContent ref={listContainerRef} className="city-list-scroll max-h-[56vh] overflow-auto px-4 pb-4 pt-0">
                <div className="mb-3">
                  <input
                    type="text"
                    value={citySearch}
                    onChange={(event) => onCitySearchChange(event.target.value)}
                    placeholder="חפשו עיר..."
                    className="h-10 w-full rounded-xl border border-primary/25 bg-white/80 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 dark:bg-slate-900/70"
                  />
                </div>
                <ul className="m-0 list-none space-y-0.5 pr-0">
                  {entries.map((entry) => (
                    <li
                      key={entry.id}
                      className={
                        bestMatchedCityId === entry.id
                          ? "rounded-lg bg-amber-200/70 px-2 py-0.5 font-semibold leading-6 text-amber-900 dark:bg-amber-400/30 dark:text-amber-100"
                          : "leading-6"
                      }
                    >
                      {entry.name}
                    </li>
                  ))}
                </ul>
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

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
