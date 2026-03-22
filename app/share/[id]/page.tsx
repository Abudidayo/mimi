'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { MapPin, Clock, CurrencyDollar, Star, CalendarBlank } from '@phosphor-icons/react';

interface Activity {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  startTime?: string;
  location: { name: string; lat: number; lng: number };
  price: number;
  rating?: number;
  bookingRequired?: boolean;
}

interface DaySchedule {
  day: number;
  date: string;
  theme?: string;
  activities: Activity[];
}

interface SharedTrip {
  schedule: DaySchedule[];
  tripName?: string;
  destination?: string;
  startDate?: string;
  sharedAt?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  morning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
  afternoon: 'bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800',
  evening: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
  night: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800',
};

export default function SharedTripPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const printMode = searchParams?.get('print') === 'true';
  const [trip, setTrip] = useState<SharedTrip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/share?id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Trip not found or link expired');
        return res.json();
      })
      .then((data) => setTrip(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-trigger print dialog when ?print=true
  useEffect(() => {
    if (printMode && trip && !loading) {
      setTimeout(() => window.print(), 500);
    }
  }, [printMode, trip, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse text-gray-500">Loading trip...</div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Trip not found</h1>
          <p className="text-gray-500">{error ?? 'This share link may have expired.'}</p>
        </div>
      </div>
    );
  }

  const totalActivities = trip.schedule.reduce((sum, d) => sum + d.activities.length, 0);
  const totalCost = trip.schedule.reduce(
    (sum, d) => sum + d.activities.reduce((s, a) => s + (a.price ?? 0), 0),
    0,
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {trip.tripName || 'Trip Itinerary'}
          </h1>
          {trip.destination && (
            <p className="text-lg text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5" />
              {trip.destination}
            </p>
          )}
          <div className="flex items-center justify-center gap-6 mt-3 text-sm text-gray-500 dark:text-gray-400">
            <span>{trip.schedule.length} days</span>
            <span>{totalActivities} activities</span>
            {totalCost > 0 && <span>${totalCost.toLocaleString()} total</span>}
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Planned with Mimi AI Travel Planner
          </p>
        </div>

        {/* Days */}
        <div className="space-y-6">
          {trip.schedule.map((day) => (
            <div key={day.day} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* Day header */}
              <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    Day {day.day}{day.theme ? ` — ${day.theme}` : ''}
                  </h2>
                  {day.date && (
                    <span className="flex items-center gap-1 text-sm opacity-90">
                      <CalendarBlank className="w-4 h-4" />
                      {day.date}
                    </span>
                  )}
                </div>
              </div>

              {/* Activities */}
              <div className="p-4 space-y-3">
                {day.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`p-4 rounded-lg border ${CATEGORY_COLORS[activity.category] ?? 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {activity.startTime && (
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {activity.startTime}
                            </span>
                          )}
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {activity.name}
                          </h3>
                        </div>
                        {activity.description && (
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {activity.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {activity.location?.name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {activity.location.name}
                            </span>
                          )}
                          {activity.duration > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {activity.duration} min
                            </span>
                          )}
                          {activity.price > 0 && (
                            <span className="flex items-center gap-1">
                              <CurrencyDollar className="w-3.5 h-3.5" />
                              ${activity.price}
                            </span>
                          )}
                          {activity.rating && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5" />
                              {activity.rating}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
