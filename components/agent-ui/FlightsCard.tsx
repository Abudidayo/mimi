"use client";

import { motion } from "framer-motion";
import {
  Airplane,
  ArrowRight,
  Bus,
  CarProfile,
  Clock,
  Lightbulb,
  MapPinLine,
  SuitcaseRolling,
  Train,
  Waves,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface FlightOption {
  airline: string;
  price: number;
  duration: string;
  stops: number;
  departTime: string;
  arrivalTime: string;
  class: 'economy' | 'premium' | 'business';
  baggage?: {
    carryOn: string;
    checked: string;
  };
}

export interface AlternativeTransportOption {
  mode: 'train' | 'bus' | 'ferry' | 'car' | 'rideshare';
  provider: string;
  duration: string;
  priceEstimate: string;
  bookingHint: string;
  bestFor: string;
}

export interface LocalTransportOption {
  mode: string;
  details: string;
  priceEstimate: string;
}

export interface FlightsData {
  summary: string;
  recommendedMode: 'air' | 'train' | 'bus' | 'ferry' | 'car' | 'mixed';
  route: string;
  flights: FlightOption[];
  alternatives: AlternativeTransportOption[];
  localOptions: LocalTransportOption[];
  bookingTip: string;
}

export interface SelectedFlightOption extends FlightOption {
  id: string;
  route?: string;
}

const classColors = {
  economy:  { bg: 'bg-blue-400/15',   text: 'text-blue-100',   border: 'border-blue-300/20' },
  premium:  { bg: 'bg-purple-400/15', text: 'text-purple-100', border: 'border-purple-300/20' },
  business: { bg: 'bg-amber-400/15',  text: 'text-amber-100',  border: 'border-amber-300/20' },
};

const modeIcon = (mode: FlightsData["recommendedMode"] | AlternativeTransportOption["mode"]) => {
  switch (mode) {
    case "air":
      return <Airplane weight="fill" className="w-5 h-5 text-sky-200" />;
    case "train":
      return <Train weight="fill" className="w-5 h-5 text-emerald-200" />;
    case "bus":
      return <Bus weight="fill" className="w-5 h-5 text-amber-200" />;
    case "ferry":
      return <Waves weight="bold" className="w-5 h-5 text-cyan-200" />;
    case "car":
    case "rideshare":
      return <CarProfile weight="fill" className="w-5 h-5 text-pink-200" />;
    case "mixed":
      return <MapPinLine weight="fill" className="w-5 h-5 text-purple-200" />;
  }
};

interface FlightsCardProps {
  data: FlightsData;
  selectedFlightId?: string;
  onSelectFlight?: (flight: SelectedFlightOption) => void;
}

export function FlightsCard({ data, selectedFlightId, onSelectFlight }: FlightsCardProps) {
  const cheapestFlight = data.flights.length > 0
    ? data.flights.reduce((min, option) => option.price < min.price ? option : min, data.flights[0])
    : null;

  return (
    <div
      className="rounded-[28px] overflow-hidden w-full border border-white/12"
      style={{
        background: "linear-gradient(180deg, rgba(14,29,73,0.98) 0%, rgba(9,20,55,0.98) 100%)",
        boxShadow: "0 24px 56px rgba(5,10,33,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div className="px-4 pt-4 pb-3 flex items-start gap-2.5" style={{ background: "linear-gradient(180deg, rgba(96,165,250,0.18), rgba(96,165,250,0.05))" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}>
          {modeIcon(data.recommendedMode)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-white/42 uppercase tracking-[0.22em]">Transport</p>
          <p className="text-base font-semibold text-sky-200">{data.route}</p>
          <p className="text-xs text-white/62 mt-1">{data.summary}</p>
        </div>
        {cheapestFlight && (
          <div className="text-right pt-0.5">
            <p className="text-xs text-white/35">flight from</p>
            <p className="text-base font-bold text-white">${cheapestFlight.price.toLocaleString()}</p>
          </div>
        )}
      </div>

      {data.flights.length > 0 && (
        <div className="px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-2 mb-3">
            <Airplane weight="fill" className="w-4 h-4 text-sky-200" />
            <p className="text-[11px] font-semibold text-white/42 uppercase tracking-[0.22em]">Air Options</p>
          </div>
          <div className="space-y-2">
            {data.flights.map((option, index) => {
              const colors = classColors[option.class];
              const isCheapest = option === cheapestFlight;
              const optionId = `${option.airline}-${option.departTime}-${option.arrivalTime}-${option.price}-${index}`;
              const isSelected = selectedFlightId === optionId;

              return (
                <motion.div
                  key={`${option.airline}-${index}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "rounded-2xl px-3 py-3 border",
                    isCheapest && "bg-sky-400/8",
                    onSelectFlight && "cursor-pointer"
                  )}
                  style={{
                    borderColor: isSelected ? "rgba(125,211,252,0.55)" : "rgba(255,255,255,0.08)",
                    background: isSelected
                      ? "linear-gradient(180deg, rgba(56,189,248,0.16), rgba(14,29,73,0.96))"
                      : undefined,
                  }}
                  onClick={() =>
                    onSelectFlight?.({
                      id: optionId,
                      route: data.route,
                      ...option,
                    })
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-white">{option.airline}</span>
                        {isCheapest && (
                          <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-sky-400/15 text-sky-100 border border-sky-300/20">
                            Best value
                          </span>
                        )}
                        <span className={cn("text-xs px-1.5 py-0.5 rounded-full border capitalize", colors.bg, colors.text, colors.border)}>
                          {option.class}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-100 border border-emerald-300/20">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/52 flex-wrap">
                        <span>{option.departTime}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{option.arrivalTime}</span>
                        <span className="text-white/20">·</span>
                        <Clock className="w-3 h-3" />
                        <span>{option.duration}</span>
                        <span className="text-white/20">·</span>
                        <span>{option.stops === 0 ? 'Direct' : `${option.stops} stop${option.stops > 1 ? 's' : ''}`}</span>
                      </div>
                      {option.baggage && (
                        <div className="flex items-center gap-2 text-xs text-white/50 mt-2">
                          <SuitcaseRolling className="w-3.5 h-3.5" weight="bold" />
                          <span>Carry-on: {option.baggage.carryOn}</span>
                          <span className="text-white/20">·</span>
                          <span>Checked: {option.baggage.checked}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-white">${option.price.toLocaleString()}</p>
                      <p className="text-xs text-white/35">per person</p>
                      {onSelectFlight && (
                        <p className="text-[11px] text-sky-100/80 mt-1">
                          {isSelected ? "Applied in draft" : "Choose flight"}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {data.alternatives.length > 0 && (
        <div className="px-4 py-3 border-b border-white/8">
          <p className="text-[11px] font-semibold text-white/42 uppercase tracking-[0.22em] mb-3">Other Ways To Get There</p>
          <div className="grid gap-2 md:grid-cols-2">
            {data.alternatives.map((option, index) => (
              <motion.div
                key={`${option.mode}-${index}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl px-3 py-3 border"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {modeIcon(option.mode)}
                  <span className="text-sm font-semibold text-white capitalize">{option.mode}</span>
                </div>
                <p className="text-xs text-white/72">{option.provider}</p>
                <div className="flex items-center gap-2 text-xs text-white/52 mt-2 flex-wrap">
                  <span>{option.duration}</span>
                  <span className="text-white/20">·</span>
                  <span>{option.priceEstimate}</span>
                </div>
                <p className="text-xs text-white/68 mt-2">{option.bestFor}</p>
                <p className="text-xs text-white/45 mt-2">{option.bookingHint}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {data.localOptions.length > 0 && (
        <div className="px-4 py-3 border-b border-white/8">
          <p className="text-[11px] font-semibold text-white/42 uppercase tracking-[0.22em] mb-3">Getting Around Locally</p>
          <div className="space-y-2">
            {data.localOptions.map((option, index) => (
              <div
                key={`${option.mode}-${index}`}
                className="flex items-start justify-between gap-3 rounded-2xl px-3 py-2.5 border"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{option.mode}</p>
                  <p className="text-xs text-white/55 mt-1">{option.details}</p>
                </div>
                <span className="text-xs text-white/72 shrink-0">{option.priceEstimate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-start gap-2">
          <Lightbulb weight="fill" className="w-3.5 h-3.5 text-amber-200 mt-0.5 shrink-0" />
          <p className="text-xs text-white/65">{data.bookingTip}</p>
        </div>
      </div>
    </div>
  );
}
