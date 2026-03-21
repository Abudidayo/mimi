"use client";

import { motion } from "framer-motion";
import {
  Heart,
  Stamp,
  Airplane,
  Confetti,
  HouseLine,
  Receipt,
  SlidersHorizontal,
  CurrencyDollar,
  CalendarBlank,
} from "@phosphor-icons/react";
import { CONTROL_COLORS, pillBoxShadow } from "@/lib/inline-ui/colors";
import type { AgentData } from "@/components/AgentPanel";
import type { Country } from "@/components/inline-ui/CountryPicker";
import { parseInlineUI } from "@/lib/inline-ui/parser";
import { COUNTRY_BY_CODE } from "@/lib/inline-ui/countries";

interface ActionButton {
  label: string;
  prompt: string;
  icon: React.ReactNode;
  colorIdx: number;
}

interface ActionButtonsProps {
  agentData: AgentData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlValues: Record<string, any>;
  assistantText?: string;
  onAction: (prompt: string) => void;
  isLoading?: boolean;
}

interface InlineDefaults {
  destination?: Country;
  travelers?: number;
  budget?: number;
  stayType?: string;
}

interface SelectedFlightValue {
  airline?: string;
  departTime?: string;
  arrivalTime?: string;
}

function toValidDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  return null;
}

function inferTripDays(controlValues: Record<string, unknown>): number {
  const explicitDays = Number(controlValues['days']);
  if (Number.isFinite(explicitDays) && explicitDays > 0) {
    return explicitDays;
  }

  const nights = Number(controlValues['nights']);
  if (Number.isFinite(nights) && nights > 0) {
    return nights + 1;
  }

  const departure = toValidDate(controlValues['departure']);
  const returnDate = toValidDate(controlValues['return']);
  if (departure && returnDate) {
    const diffMs = returnDate.getTime() - departure.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      return diffDays + 1;
    }
  }

  return 7;
}

function extractInlineDefaults(text: string | undefined): InlineDefaults {
  if (!text) return {};

  const defaults: InlineDefaults = {};

  for (const segment of parseInlineUI(text)) {
    if (segment.type === 'country' && segment.controlId === 'destination' && segment.props?.initialCode) {
      defaults.destination = COUNTRY_BY_CODE[segment.props.initialCode];
      continue;
    }

    if (segment.type === 'stepper' && segment.controlId === 'travelers' && segment.props?.initialValue) {
      defaults.travelers = segment.props.initialValue;
      continue;
    }

    if (segment.type === 'price' && segment.controlId === 'budget' && segment.props?.initialValue) {
      defaults.budget = segment.props.initialValue;
      continue;
    }

    if (segment.type === 'select' && segment.controlId === 'stay_type') {
      defaults.stayType = segment.props?.options?.[0]?.value;
    }
  }

  return defaults;
}

export function ActionButtons({ agentData, controlValues, assistantText, onAction, isLoading }: ActionButtonsProps) {
  const inlineDefaults = extractInlineDefaults(assistantText);
  const destination: Country | undefined = controlValues['destination'] ?? inlineDefaults.destination;
  const destName = destination?.name ?? '';
  const travelersValue = controlValues['travelers'];
  const travelers =
    typeof travelersValue === 'number'
      ? travelersValue
      : inlineDefaults.travelers ?? 2;
  const stayTypeValue = controlValues['stay_type'];
  const stayType =
    typeof stayTypeValue === 'string' && stayTypeValue.trim()
      ? stayTypeValue
      : inlineDefaults.stayType;
  const selectedFlight =
    controlValues['selected_flight'] &&
    typeof controlValues['selected_flight'] === 'object'
      ? (controlValues['selected_flight'] as SelectedFlightValue)
      : undefined;

  const days = inferTripDays(controlValues);

  const buttons: ActionButton[] = [];

  if (destName) {
    // Primary CTA — plan the trip if not yet planned
    if (!agentData.itinerary) {
      buttons.push({
        label: 'Love it! Plan this trip',
        prompt: `Plan my ${days}-day trip to ${destName} for ${travelers} ${travelers === 1 ? 'person' : 'people'}`,
        icon: <Heart weight="fill" className="w-3.5 h-3.5" />,
        colorIdx: 0,
      });
    }

    // Visa — only suggest if not already checked
    if (!agentData.visa) {
      buttons.push({
        label: 'Check visa eligibility',
        prompt: `What are the visa requirements to visit ${destName}?`,
        icon: <Stamp weight="fill" className="w-3.5 h-3.5" />,
        colorIdx: 3,
      });
    }

    // Transport — only if not already checked
    if (!agentData.flights) {
      buttons.push({
        label: 'Plan transport',
        prompt: `What are the best transportation options to get to ${destName}?`,
        icon: <Airplane weight="fill" className="w-3.5 h-3.5" />,
        colorIdx: 1,
      });
    }

    if (!agentData.lodging) {
      buttons.push({
        label: 'Find stays',
        prompt: stayType
          ? `Find me great ${stayType} options in ${destName}`
          : `Help me choose where to stay in ${destName}`,
        icon: <HouseLine weight="fill" className="w-3.5 h-3.5" />,
        colorIdx: 3,
      });
    }

    // Events — only if no dates set or events not yet fetched
    if (!agentData.events) {
      buttons.push({
        label: 'Find local events',
        prompt: `What events and festivals are happening in ${destName}?`,
        icon: <Confetti weight="fill" className="w-3.5 h-3.5" />,
        colorIdx: 4,
      });
    }

    // Currency — if not yet checked
    if (!agentData.currency) {
      buttons.push({
        label: 'Currency & costs',
        prompt: `What currency does ${destName} use and what are typical daily costs?`,
        icon: <CurrencyDollar weight="fill" className="w-3.5 h-3.5" />,
        colorIdx: 2,
      });
    }
  }

  // Post-itinerary contextual actions
  if (agentData.itinerary) {
    const hasContextForBooking =
      Boolean(agentData.weather) &&
      Boolean(agentData.safety) &&
      Boolean(agentData.shopping);

    if (!agentData.booking && hasContextForBooking && destName) {
      buttons.push({
        label: 'Love it! Looks good',
        prompt: stayType
          ? `Yes, this plan makes sense. Start the browser booking flow for ${destName} with ${stayType} lodging and transport${selectedFlight?.airline ? `, using the ${selectedFlight.airline} option leaving at ${selectedFlight.departTime}` : ''}, and stop at checkout.`
          : `Yes, this plan makes sense. Start the browser booking flow for ${destName}, choose the best transport and stay options${selectedFlight?.airline ? `, using the ${selectedFlight.airline} option leaving at ${selectedFlight.departTime}` : ''}, and stop at checkout.`,
        icon: <Receipt weight="fill" className="w-3.5 h-3.5" />,
        colorIdx: 2,
      });
      buttons.push({
        label: 'Modify plan',
        prompt: `Modify this ${destName} trip plan before booking.`,
        icon: <SlidersHorizontal weight="fill" className="w-3.5 h-3.5" />,
        colorIdx: 5,
      });
      buttons.push({
        label: 'No, rethink it',
        prompt: `No, this ${destName} trip plan does not make sense yet. Rethink it and suggest a better version.`,
        icon: <Heart weight="fill" className="w-3.5 h-3.5" />,
        colorIdx: 0,
      });
    }

    buttons.push({
      label: 'Change the pace',
      prompt: `Regenerate my ${destName} itinerary with a more packed schedule`,
      icon: <SlidersHorizontal weight="fill" className="w-3.5 h-3.5" />,
      colorIdx: 5,
    });
    buttons.push({
      label: 'Add a day',
      prompt: `Add one more day to my ${destName} trip itinerary`,
      icon: <CalendarBlank weight="fill" className="w-3.5 h-3.5" />,
      colorIdx: 6,
    });
    if (!agentData.flights) {
      buttons.push({
        label: 'Transport options',
        prompt: `How should I get to ${destName}?`,
        icon: <Airplane weight="fill" className="w-3.5 h-3.5" />,
        colorIdx: 1,
      });
    }
    if (!agentData.lodging) {
      buttons.push({
        label: 'Stay options',
        prompt: `Where should I stay in ${destName}?`,
        icon: <HouseLine weight="fill" className="w-3.5 h-3.5" />,
        colorIdx: 3,
      });
    }
  }

  if (destName && (agentData.itinerary || agentData.flights || agentData.lodging) && !agentData.booking) {
    buttons.push({
      label: 'Book this trip',
      prompt: stayType
        ? `Book this trip to ${destName} with ${stayType} lodging and the best transport option${selectedFlight?.airline ? `, using the selected ${selectedFlight.airline} flight` : ''}, in the browser, and stop at checkout`
        : `Book this trip to ${destName} and choose the best transport and stay options${selectedFlight?.airline ? `, using the selected ${selectedFlight.airline} flight` : ''}, in the browser, and stop at checkout`,
      icon: <Receipt weight="fill" className="w-3.5 h-3.5" />,
      colorIdx: 2,
    });
  }

  if (buttons.length === 0) return null;

  // Cap at 4 buttons to avoid clutter
  const visible = buttons.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25, ease: "easeOut" }}
      className="mt-4 flex flex-wrap gap-2"
    >
      {visible.map((btn) => {
        const color = CONTROL_COLORS[btn.colorIdx % CONTROL_COLORS.length];
        return (
          <motion.button
            key={btn.label}
            onClick={() => !isLoading && onAction(btn.prompt)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: color.gradient,
              boxShadow: pillBoxShadow(color, "sm"),
            }}
            initial={{ opacity: 0, scale: 0.85, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.4,
              type: "spring",
              stiffness: 800,
              damping: 22,
            }}
            whileHover={{ scale: 1.07, transition: { type: "spring", stiffness: 800, damping: 20 } }}
            whileTap={{ scale: 0.93, transition: { type: "spring", stiffness: 1000, damping: 30 } }}
          >
            {btn.icon}
            <span>{btn.label}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
