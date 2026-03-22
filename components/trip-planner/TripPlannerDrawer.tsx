"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  AirplaneTilt,
  CalendarBlank,
  CarProfile,
  HouseLine,
  MapPin,
  Receipt,
  ShieldCheck,
  Sparkle,
  Users,
  X,
} from "@phosphor-icons/react";
import { BrowserTimeline } from "@/components/chat/BrowserTimeline";
import { MapboxTripMap } from "@/components/trip-planner/MapboxTripMap";
import type { TripArtifact, TripTimelineItem } from "@/lib/trip-artifact";
import { CONTROL_COLORS } from "@/lib/inline-ui/colors";
import { cn } from "@/lib/utils";

/** Same Pexels-backed proxy as destination suggestion cards (`/api/image?q=...`). */
function PlannerPexelsImage({
  imageQuery,
  alt,
  className,
  colorIndex = 0,
}: {
  imageQuery: string;
  alt: string;
  className: string;
  colorIndex?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const src = `/api/image?q=${encodeURIComponent(imageQuery)}`;
  const color = CONTROL_COLORS[Math.abs(colorIndex) % CONTROL_COLORS.length];

  useEffect(() => {
    setImgError(false);
  }, [imageQuery]);

  if (imgError) {
    return (
      <div
        className={className}
        style={{ background: color.gradient }}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={() => setImgError(true)} />
  );
}

interface TripPlannerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: TripArtifact | null;
  bookingInProgress?: boolean;
  onPrimaryAction?: () => void;
  primaryLabel?: string;
}

const timelineMeta: Record<
  TripTimelineItem["kind"],
  { icon: React.ReactNode; label: string; accent: string }
> = {
  arrive: {
    icon: <AirplaneTilt weight="fill" className="h-4 w-4" />,
    label: "Arrival",
    accent: "bg-[#7e6ff7]/20 text-[#ded5ff] border-[#9789ff]/25",
  },
  transfer: {
    icon: <CarProfile weight="fill" className="h-4 w-4" />,
    label: "Transfer",
    accent: "bg-white/10 text-white/82 border-white/14",
  },
  stay: {
    icon: <HouseLine weight="fill" className="h-4 w-4" />,
    label: "Stay",
    accent: "bg-[#ff8fb6]/16 text-[#ffd8e7] border-[#ffb6d0]/22",
  },
  explore: {
    icon: <Sparkle weight="fill" className="h-4 w-4" />,
    label: "Discover",
    accent: "bg-[#86efac]/16 text-[#dbffe7] border-[#9df1bd]/18",
  },
  depart: {
    icon: <AirplaneTilt weight="fill" className="h-4 w-4" />,
    label: "Departure",
    accent: "bg-[#f9a8d4]/16 text-[#ffe1f1] border-[#fbc7e1]/18",
  },
};

function panelClassName(extra?: string) {
  return cn(
    "rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(38,38,38,0.95),rgba(22,22,22,0.96))] shadow-[0_18px_50px_rgba(0,0,0,0.35)]",
    extra
  );
}

function darkPill(text: string) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">
      {text}
    </span>
  );
}

export function TripPlannerDrawer({
  open,
  onOpenChange,
  artifact,
  bookingInProgress = false,
  onPrimaryAction,
  primaryLabel = "Love it! Looks good",
}: TripPlannerDrawerProps) {
  const handlePrimaryClick = () => {
    onOpenChange(false);
    onPrimaryAction?.();
  };
  if (!artifact) return null;

  const selectedFlight = artifact.selectedFlight;
  const transportSteps = artifact.flights?.localOptions ?? [];
  const itineraryPreview = artifact.itinerary?.slice(0, 6) ?? [];
  const timelineItems = artifact.timeline;
  const highlightEvent = artifact.events?.events?.[0];
  const eventsImageDestination =
    artifact.events?.destination ?? artifact.destination;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={{ x: "100%", opacity: 0.96 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0.98 }}
                transition={{ type: "spring", stiffness: 220, damping: 28 }}
                className="fixed inset-y-3 right-3 z-50 w-[min(1180px,calc(100vw-24px))] overflow-hidden rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,#1a1a1a_0%,#141414_40%,#111111_100%)] shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between border-b border-white/8 px-8 py-7">
                    <div>
                      <Dialog.Title className="text-[46px] font-semibold leading-[1.02] text-white">
                        {artifact.title}
                      </Dialog.Title>
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[20px] text-white/72">
                        <span className="inline-flex items-center gap-2">
                          <CalendarBlank weight="regular" className="h-5 w-5" />
                          {artifact.dateRangeLabel}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Users weight="regular" className="h-5 w-5" />
                          {artifact.travelers} travellers
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <MapPin weight="fill" className="h-5 w-5" />
                          {artifact.originLabel ?? "Origin"} · {artifact.destination}
                          {artifact.selectedLodging?.neighborhood ? ` · ${artifact.selectedLodging.neighborhood}` : ""}
                        </span>
                      </div>
                    </div>

                    <Dialog.Close asChild>
                      <button className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/80">
                        <X weight="bold" className="h-6 w-6" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <div className="flex-1 overflow-y-auto px-8 py-7">
                    <div className="space-y-6">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px_280px]">
                        <MapboxTripMap artifact={artifact} />

                        <div className={panelClassName("p-6")}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                            Trip total
                          </p>
                          <p className="mt-4 text-[34px] font-semibold text-white">
                            {artifact.totalEstimate ? `~£${artifact.totalEstimate.toLocaleString()}` : "TBC"}
                          </p>
                          <p className="mt-2 text-lg text-white/55">Flights + stay estimate</p>
                        </div>

                        <div className={panelClassName("p-6")}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                            Trip setup
                          </p>
                          <div className="mt-4 space-y-4 text-[18px] text-white/76">
                            <p>Stay type {artifact.stayType ?? "pending"}</p>
                            <p>{selectedFlight?.airline ?? "Transport pending"}</p>
                            <p>{artifact.selectedLodging?.name ?? "Stay pending"}</p>
                          </div>
                        </div>
                      </div>

                      <div className={panelClassName("p-6")}>
                        <div className="flex items-center gap-2">
                          <Receipt weight="fill" className="h-4 w-4 text-white/70" />
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                            Trip spine
                          </p>
                        </div>

                        <div className="relative mt-6 space-y-8">
                          <div className="absolute bottom-0 left-[27px] top-2 w-px bg-white/12" />
                          {timelineItems.map((item) => (
                            <div key={item.id} className="relative flex gap-6 pl-[68px]">
                              <div className="absolute left-0 top-0 flex h-[54px] w-[54px] items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] text-white">
                                {timelineMeta[item.kind].icon}
                              </div>

                              <div className="min-w-[160px] pt-1">
                                <p className="text-[30px] font-semibold leading-tight text-white">{item.title}</p>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", timelineMeta[item.kind].accent)}>
                                    {timelineMeta[item.kind].label}
                                  </span>
                                </div>
                                <p className="mt-2 text-[16px] text-white/52">{item.subtitle}</p>
                              </div>

                              <div className="max-w-3xl flex-1 pt-2">
                                <p className="text-[18px] leading-8 text-white/78">{item.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedFlight && artifact.flights && (
                        <div className={panelClassName("p-6")}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-white/78">{selectedFlight.airline}</p>
                                {darkPill(selectedFlight.stops === 0 ? "Direct" : `${selectedFlight.stops} stop${selectedFlight.stops > 1 ? "s" : ""}`)}
                              </div>

                              <div className="mt-6 flex items-end gap-6">
                                <div>
                                  <p className="text-[38px] font-semibold leading-none text-white">
                                    {artifact.flights.originAirport?.code ?? "ORG"}
                                  </p>
                                  <p className="mt-2 text-base text-white/58">{artifact.dates?.from ?? artifact.dateRangeLabel}</p>
                                </div>

                                <div className="min-w-[220px] flex-1 px-2 pb-3">
                                  <p className="text-center text-base text-white/70">{selectedFlight.duration}</p>
                                  <div className="relative mt-2">
                                    <div className="h-2 rounded-full bg-white/18" />
                                    <div className="absolute inset-x-0 -top-3 flex justify-center text-white">
                                      <AirplaneTilt weight="fill" className="h-7 w-7 rotate-90" />
                                    </div>
                                  </div>
                                  <p className="mt-2 text-center text-sm text-white/58">
                                    {selectedFlight.stops === 0 ? "nonstop" : `${selectedFlight.stops} stop${selectedFlight.stops > 1 ? "s" : ""}`}
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="text-[38px] font-semibold leading-none text-white">
                                    {artifact.flights.arrivalAirport?.code ?? "DST"}
                                  </p>
                                  <p className="mt-2 text-base text-white/58">{artifact.dates?.to ?? artifact.dateRangeLabel}</p>
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-[34px] font-semibold text-white">~£{selectedFlight.price.toLocaleString()}</p>
                              <p className="text-base text-white/48">per person</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {transportSteps.length > 0 && (
                        <div className={panelClassName("p-6")}>
                          <div className="flex items-center gap-2">
                            <CarProfile weight="fill" className="h-4 w-4 text-white/70" />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                              How to get to your location
                            </p>
                          </div>

                          <div className="mt-5 space-y-4">
                            {transportSteps.map((option, index) => (
                              <div
                                key={`${option.mode}-${index}`}
                                className="rounded-[16px] border border-white/10 bg-white/5 px-5 py-4"
                              >
                                <div className="flex items-start justify-between gap-5">
                                  <div className="min-w-0">
                                    <p className="text-[24px] font-semibold text-white">{option.mode}</p>
                                    <p className="mt-1 text-[18px] text-white/74">{option.details}</p>
                                  </div>
                                  <p className="shrink-0 text-[18px] font-medium text-white/60">{option.priceEstimate}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {artifact.selectedLodging && (
                        <div className={panelClassName("p-6")}>
                          <div className="flex items-center gap-4">
                            <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/6 text-pink-200">
                              <HouseLine weight="fill" className="h-10 w-10" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[30px] font-semibold text-white">{artifact.selectedLodging.name}</p>
                                {darkPill(`${artifact.selectedLodging.rating.toFixed(1)} rated`)}
                              </div>
                              <p className="mt-2 text-lg text-white/66">
                                {artifact.selectedLodging.provider} · {artifact.selectedLodging.neighborhood}
                              </p>
                              <p className="mt-4 text-[34px] font-semibold text-white">
                                £{artifact.selectedLodging.totalPrice.toLocaleString()}{" "}
                                <span className="text-lg font-medium text-white/50">total</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {highlightEvent && (
                        <div className={panelClassName("p-6")}>
                          <div className="flex items-center gap-2">
                            <Sparkle weight="fill" className="h-4 w-4 text-emerald-200" />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                              Worth checking out
                            </p>
                          </div>
                          <div className="relative mt-5 h-44 w-full overflow-hidden rounded-[16px]">
                            <PlannerPexelsImage
                              imageQuery={`${highlightEvent.name} ${eventsImageDestination} ${highlightEvent.category}`.trim()}
                              alt={highlightEvent.name}
                              className="h-full w-full object-cover"
                              colorIndex={highlightEvent.id
                                .split("")
                                .reduce((a, c) => a + c.charCodeAt(0), 0)}
                            />
                            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/55 via-black/15 to-transparent" />
                          </div>
                          <p className="mt-4 text-[30px] font-semibold leading-tight text-white">
                            {highlightEvent.name}
                          </p>
                          <p className="mt-2 text-[16px] text-white/56">{highlightEvent.date}</p>
                          <p className="mt-4 text-[18px] leading-8 text-white/76">
                            {highlightEvent.description}
                          </p>
                        </div>
                      )}

                      {itineraryPreview.length > 0 && (
                        <div className={panelClassName("p-6")}>
                          <div className="flex items-center gap-2">
                            <ShieldCheck weight="fill" className="h-4 w-4 text-white/70" />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                              Your itinerary
                            </p>
                          </div>

                          <div className="mt-5 space-y-4">
                            {itineraryPreview.map((day) => {
                              const imageQuery = [
                                day.theme,
                                day.activities[0]?.location.name,
                                artifact.destination,
                              ]
                                .filter(Boolean)
                                .join(" ")
                                .trim() || artifact.destination;

                              return (
                                <div
                                  key={`day-${day.day}`}
                                  className="rounded-[16px] border border-white/10 bg-white/5 p-4"
                                >
                                  <div className="flex items-center gap-4">
                                    <PlannerPexelsImage
                                      imageQuery={`${imageQuery} travel destination`}
                                      alt={day.theme ?? `Day ${day.day}`}
                                      className="h-24 w-32 shrink-0 rounded-[12px] object-cover"
                                      colorIndex={day.day}
                                    />
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        {darkPill(`Day ${day.day}`)}
                                        <span className="text-sm text-white/56">
                                          {day.activities.length} experiences
                                        </span>
                                        {day.date && <span className="text-sm text-white/56">{day.date}</span>}
                                      </div>
                                      <p className="mt-3 text-[28px] font-semibold leading-tight text-white">
                                        {day.theme ?? day.activities[0]?.name ?? `Day ${day.day}`}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {bookingInProgress && (
                        <div className={panelClassName("p-6")}>
                          <p className="mb-3 text-xl font-semibold text-white">Browser use</p>
                          <BrowserTimeline active />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/10 bg-[#141414]/95 px-8 py-5 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-base text-white/54">Ready when you are</p>
                        <p className="text-[40px] font-semibold text-white">
                          {artifact.totalEstimate ? `~£${artifact.totalEstimate.toLocaleString()}` : "Plan looks good"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handlePrimaryClick}
                        disabled={!onPrimaryAction}
                        className={cn(
                          "inline-flex items-center gap-3 rounded-full px-7 py-4 text-xl font-semibold text-white",
                          onPrimaryAction
                            ? "border border-white/14 bg-[linear-gradient(180deg,#2e2e2e,#1c1c1c)] shadow-[0_14px_32px_rgba(0,0,0,0.4)] hover:bg-[linear-gradient(180deg,#363636,#222)]"
                            : "bg-[#d7d7df]"
                        )}
                      >
                        <Receipt weight="fill" className="h-5 w-5" />
                        {primaryLabel}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
