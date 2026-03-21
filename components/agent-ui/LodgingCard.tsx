"use client";

import { HouseLine, MapPin, ShootingStar, Star } from "@phosphor-icons/react";
import { motion } from "framer-motion";

export interface LodgingOption {
  name: string;
  provider: string;
  stayType: 'hotel' | 'airbnb' | 'hostel' | 'resort' | 'guesthouse' | 'other';
  neighborhood: string;
  nightlyRate: number;
  totalPrice: number;
  rating: number;
  perks: string[];
  bookingUrl?: string;
}

export interface LodgingData {
  destination: string;
  stayType: LodgingOption["stayType"];
  summary: string;
  recommendedArea: string;
  options: LodgingOption[];
  bookingTip: string;
}

export interface SelectedLodgingOption extends LodgingOption {
  id: string;
  destination: string;
}

function labelForStayType(stayType: LodgingOption["stayType"]) {
  switch (stayType) {
    case "airbnb":
      return "Airbnb";
    case "guesthouse":
      return "Guesthouse";
    default:
      return stayType.charAt(0).toUpperCase() + stayType.slice(1);
  }
}

interface LodgingCardProps {
  data: LodgingData;
  selectedLodgingId?: string;
  onSelectLodging?: (lodging: SelectedLodgingOption) => void;
}

export function LodgingCard({ data, selectedLodgingId, onSelectLodging }: LodgingCardProps) {
  return (
    <div
      className="rounded-[28px] overflow-hidden w-full border border-white/12"
      style={{
        background: "linear-gradient(180deg, rgba(14,29,73,0.98) 0%, rgba(9,20,55,0.98) 100%)",
        boxShadow: "0 24px 56px rgba(5,10,33,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div className="px-4 pt-4 pb-3 flex items-start gap-2.5" style={{ background: "linear-gradient(180deg, rgba(244,114,182,0.18), rgba(244,114,182,0.05))" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}>
          <HouseLine weight="fill" className="w-5 h-5 text-pink-200" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-white/42 uppercase tracking-[0.22em]">Stay</p>
          <p className="text-base font-semibold text-pink-200">{data.destination}</p>
          <p className="text-xs text-white/62 mt-1">{data.summary}</p>
        </div>
        <span className="px-2 py-1 rounded-full text-xs font-semibold border border-pink-300/20 bg-pink-400/15 text-pink-100">
          {labelForStayType(data.stayType)}
        </span>
      </div>

      <div className="px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2 text-xs text-white/62">
          <MapPin weight="fill" className="w-4 h-4 text-pink-200" />
          <span>Best area: {data.recommendedArea}</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2 border-b border-white/8">
        {data.options.map((option, index) => (
          (() => {
            const optionId = `${option.provider}-${option.name}-${option.totalPrice}-${index}`;
            const isSelected = selectedLodgingId === optionId;

            return (
              <motion.div
                key={`${option.name}-${index}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl px-3 py-3 border cursor-pointer"
                style={{
                  background: isSelected
                    ? "linear-gradient(180deg, rgba(244,114,182,0.16), rgba(14,29,73,0.96))"
                    : "rgba(255,255,255,0.04)",
                  borderColor: isSelected ? "rgba(244,114,182,0.42)" : "rgba(255,255,255,0.08)",
                }}
                onClick={() =>
                  onSelectLodging?.({
                    id: optionId,
                    destination: data.destination,
                    ...option,
                  })
                }
              >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{option.name}</p>
                  <span className="px-1.5 py-0.5 rounded-full text-[11px] font-medium border border-white/12 bg-white/6 text-white/70">
                    {option.provider}
                  </span>
                  {isSelected && (
                    <span className="px-1.5 py-0.5 rounded-full text-[11px] font-medium border border-pink-300/20 bg-pink-400/15 text-pink-100">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/52 mt-1">{option.neighborhood}</p>
                <div className="flex items-center gap-1.5 text-xs text-white/62 mt-2">
                  <Star weight="fill" className="w-3.5 h-3.5 text-amber-200" />
                  <span>{option.rating.toFixed(1)}</span>
                  <span className="text-white/20">·</span>
                  <span>${option.nightlyRate.toLocaleString()}/night</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {option.perks.map((perk) => (
                    <span
                      key={perk}
                      className="px-2 py-1 rounded-full text-[11px] font-medium border border-white/10 bg-white/6 text-white/70"
                    >
                      {perk}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-white">${option.totalPrice.toLocaleString()}</p>
                <p className="text-xs text-white/35">total stay</p>
                <p className="text-[11px] text-pink-100/80 mt-1">
                  {isSelected ? "Applied in draft" : "Choose stay"}
                </p>
              </div>
            </div>
              </motion.div>
            );
          })()
        ))}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-start gap-2">
          <ShootingStar weight="fill" className="w-3.5 h-3.5 text-pink-200 mt-0.5 shrink-0" />
          <p className="text-xs text-white/65">{data.bookingTip}</p>
        </div>
      </div>
    </div>
  );
}
