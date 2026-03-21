"use client";

import { Browser, CheckCircle, ClockCountdown, LinkSimple, Receipt, WarningCircle } from "@phosphor-icons/react";

export interface BookingReservation {
  kind: 'transport' | 'lodging';
  provider: string;
  title: string;
  status: 'confirmed' | 'prepared' | 'browser-attempted';
  confirmationCode: string;
  price: string;
  details: string;
  bookingUrl?: string;
}

export interface BookingTask {
  label: string;
  status: 'completed' | 'partial' | 'skipped' | 'failed';
  summary: string;
  sessionUrl?: string;
  actions: string[];
}

export interface BookingData {
  destination: string;
  executionMode: 'mock' | 'browser';
  summary: string;
  reservations: BookingReservation[];
  browserTasks: BookingTask[];
  nextStep: string;
}

function statusIcon(status: BookingReservation["status"] | BookingTask["status"]) {
  if (status === "confirmed" || status === "completed") {
    return <CheckCircle weight="fill" className="w-4 h-4 text-emerald-200" />;
  }

  if (status === "failed") {
    return <WarningCircle weight="fill" className="w-4 h-4 text-red-200" />;
  }

  return <ClockCountdown weight="fill" className="w-4 h-4 text-amber-200" />;
}

export function BookingCard({ data }: { data: BookingData }) {
  return (
    <div
      className="rounded-[28px] overflow-hidden w-full border border-white/12"
      style={{
        background: "linear-gradient(180deg, rgba(14,29,73,0.98) 0%, rgba(9,20,55,0.98) 100%)",
        boxShadow: "0 24px 56px rgba(5,10,33,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div className="px-4 pt-4 pb-3 flex items-start gap-2.5" style={{ background: "linear-gradient(180deg, rgba(45,212,191,0.18), rgba(45,212,191,0.05))" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}>
          <Receipt weight="fill" className="w-5 h-5 text-emerald-200" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-white/42 uppercase tracking-[0.22em]">Booking</p>
          <p className="text-base font-semibold text-emerald-200">{data.destination}</p>
          <p className="text-xs text-white/62 mt-1">{data.summary}</p>
        </div>
        <span className="px-2 py-1 rounded-full text-xs font-semibold border border-emerald-300/20 bg-emerald-400/15 text-emerald-100">
          {data.executionMode === "browser" ? "Browser execution" : "Demo mode"}
        </span>
      </div>

      <div className="px-4 py-3 border-b border-white/8 space-y-2">
        {data.reservations.map((reservation) => (
          <div
            key={reservation.confirmationCode}
            className="rounded-2xl px-3 py-3 border flex items-start justify-between gap-3"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {statusIcon(reservation.status)}
                <p className="text-sm font-semibold text-white">{reservation.title}</p>
              </div>
              <p className="text-xs text-white/52 mt-1">{reservation.provider}</p>
              <p className="text-xs text-white/68 mt-2">{reservation.details}</p>
              <p className="text-[11px] text-white/40 mt-2">Ref {reservation.confirmationCode}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-white">{reservation.price}</p>
              <p className="text-[11px] text-white/38 mt-1 capitalize">{reservation.kind}</p>
            </div>
          </div>
        ))}
      </div>

      {data.browserTasks.length > 0 && (
        <div className="px-4 py-3 border-b border-white/8 space-y-2">
          <div className="flex items-center gap-2">
            <Browser weight="fill" className="w-4 h-4 text-cyan-200" />
            <p className="text-[11px] font-semibold text-white/42 uppercase tracking-[0.22em]">Browser execution</p>
          </div>
          {data.browserTasks.map((task) => (
            <div
              key={task.label}
              className="rounded-2xl px-3 py-3 border"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center gap-2">
                {statusIcon(task.status)}
                <p className="text-sm font-semibold text-white">{task.label}</p>
              </div>
              <p className="text-xs text-white/62 mt-2">{task.summary}</p>
              {task.sessionUrl && (
                <a
                  href={task.sessionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-200 mt-2"
                >
                  <LinkSimple className="w-3.5 h-3.5" />
                  <span>Open browser session</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-3">
        <p className="text-xs text-white/65">{data.nextStep}</p>
      </div>
    </div>
  );
}
