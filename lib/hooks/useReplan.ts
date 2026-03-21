import { useCallback, useRef, useEffect } from 'react';

interface ControlChange {
  controlId: string;
  value: unknown;
  timestamp: number;
}

interface UseReplanOptions {
  onReplan: (changes: Map<string, unknown>) => void;
  debounceMs?: number;
}

/**
 * Hook to manage control changes and trigger replanning
 * Debounces changes to avoid excessive API calls
 */
export function useReplan({ onReplan, debounceMs = 1000 }: UseReplanOptions) {
  const changesRef = useRef<Map<string, ControlChange>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleControlChange = useCallback((controlId: string, value: unknown) => {
    // Store the change
    changesRef.current.set(controlId, {
      controlId,
      value,
      timestamp: Date.now(),
    });

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for replan
    timeoutRef.current = setTimeout(() => {
      if (changesRef.current.size > 0) {
        // Convert changes to simple map of controlId -> value
        const changeMap = new Map<string, unknown>();
        changesRef.current.forEach((change) => {
          changeMap.set(change.controlId, change.value);
        });

        // Trigger replan
        onReplan(changeMap);

        // Clear changes
        changesRef.current.clear();
      }
    }, debounceMs);
  }, [onReplan, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { handleControlChange };
}

/**
 * Formats control changes into a natural language prompt for the AI
 */
function formatDateValue(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return String(value);
}

function formatDestinationValue(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return String(value);
  }

  const destination = value as { name?: unknown; code?: unknown };
  if (typeof destination.name === 'string' && destination.name.trim().length > 0) {
    if (typeof destination.code === 'string' && destination.code.trim().length > 0) {
      return `${destination.name} (${destination.code})`;
    }

    return destination.name;
  }

  if (typeof destination.code === 'string' && destination.code.trim().length > 0) {
    return destination.code;
  }

  return String(value);
}

function formatBudgetRangeValue(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return String(value);
  }

  const budgetRange = value as { min?: unknown; max?: unknown };
  return `$${budgetRange.min ?? '?'}-$${budgetRange.max ?? '?'}`;
}

function formatSelectedFlightValue(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return String(value);
  }

  const flight = value as {
    airline?: unknown;
    departTime?: unknown;
    arrivalTime?: unknown;
    price?: unknown;
    route?: unknown;
  };

  const airline = typeof flight.airline === 'string' ? flight.airline : 'selected flight';
  const route = typeof flight.route === 'string' ? ` on ${flight.route}` : '';
  const departTime = typeof flight.departTime === 'string' ? ` departing ${flight.departTime}` : '';
  const arrivalTime = typeof flight.arrivalTime === 'string' ? ` arriving ${flight.arrivalTime}` : '';
  const price = typeof flight.price === 'number' ? ` for $${flight.price}` : '';

  return `${airline}${route}${departTime}${arrivalTime}${price}`;
}

function formatSelectedLodgingValue(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return String(value);
  }

  const lodging = value as {
    name?: unknown;
    provider?: unknown;
    neighborhood?: unknown;
    totalPrice?: unknown;
  };

  const name = typeof lodging.name === 'string' ? lodging.name : 'selected stay';
  const provider = typeof lodging.provider === 'string' ? ` via ${lodging.provider}` : '';
  const neighborhood =
    typeof lodging.neighborhood === 'string' ? ` in ${lodging.neighborhood}` : '';
  const totalPrice =
    typeof lodging.totalPrice === 'number' ? ` for $${lodging.totalPrice} total` : '';

  return `${name}${provider}${neighborhood}${totalPrice}`;
}

export function formatReplanPrompt(changes: Map<string, unknown>): string {
  const changeDescriptions: string[] = [];

  changes.forEach((value, controlId) => {
    // Parse control ID to understand what changed
    switch (controlId) {
      case 'travelers':
        changeDescriptions.push(`${value} traveler${value !== 1 ? 's' : ''}`);
        break;
      case 'budget':
        changeDescriptions.push(`budget of $${value} per person`);
        break;
      case 'nights':
      case 'days':
        changeDescriptions.push(`${value} night${value !== 1 ? 's' : ''}`);
        break;
      case 'departure':
        changeDescriptions.push(`departure on ${formatDateValue(value)}`);
        break;
      case 'return':
        changeDescriptions.push(`return on ${formatDateValue(value)}`);
        break;
      case 'destination':
        changeDescriptions.push(`destination to ${formatDestinationValue(value)}`);
        break;
      case 'nationality':
        changeDescriptions.push(`passport country as ${formatDestinationValue(value)}`);
        break;
      case 'origin':
        changeDescriptions.push(`travelling from ${formatDestinationValue(value)}`);
        break;
      case 'stay_type':
        changeDescriptions.push(`stay type as ${value}`);
        break;
      case 'selected_flight':
        changeDescriptions.push(`preferred flight as ${formatSelectedFlightValue(value)}`);
        break;
      case 'selected_lodging':
        changeDescriptions.push(`preferred stay as ${formatSelectedLodgingValue(value)}`);
        break;
      case 'pace':
        changeDescriptions.push(`${value} pace`);
        break;
      case 'budgetRange':
        changeDescriptions.push(`budget range: ${formatBudgetRangeValue(value)}`);
        break;
      default:
        changeDescriptions.push(`${controlId}: ${value}`);
    }
  });

  if (changeDescriptions.length === 0) {
    return 'Please update the plan.';
  }

  const changesText = changeDescriptions.join(', ');
  return `I've updated my preferences: ${changesText}. Please regenerate the travel plan with these new parameters. Keep the same destination and general style, but adjust everything else to match my new requirements.`;
}
