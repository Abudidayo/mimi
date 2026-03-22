'use client';

import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarBlank, Download, FileText, Table, ArrowSquareOut, CaretDown, LinkSimple, FilePdf } from '@phosphor-icons/react';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

interface Activity {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  startTime?: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
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

interface KanbanBoardProps {
  schedule: DaySchedule[];
  onScheduleChange?: (schedule: DaySchedule[]) => void;
  onExportCalendar?: () => void;
  onExportDocs?: () => void;
  onExportSheets?: () => void;
  onShareTrip?: () => void;
  onDownloadPdf?: () => void;
  exportLabel?: string;
  docsLabel?: string;
  sheetsLabel?: string;
  docUrl?: string | null;
  sheetUrl?: string | null;
  shareUrl?: string | null;
  sharingLabel?: string;
  pdfLabel?: string;
}

export function KanbanBoard({ schedule: initialSchedule, onScheduleChange, onExportCalendar, onExportDocs, onExportSheets, onShareTrip, onDownloadPdf, exportLabel, docsLabel, sheetsLabel, docUrl, sheetUrl, shareUrl, sharingLabel, pdfLabel }: KanbanBoardProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(initialSchedule);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [exportMenu, setExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activity = schedule
      .flatMap((day) => day.activities)
      .find((act) => act.id === active.id);

    if (activity) {
      setActiveActivity(activity);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source and destination days
    const sourceDayIndex = schedule.findIndex((day) =>
      day.activities.some((act) => act.id === activeId)
    );

    const destDayId = overId.startsWith('day-')
      ? overId
      : schedule.findIndex((day) => day.activities.some((act) => act.id === overId));

    const destDayIndex =
      typeof destDayId === 'string'
        ? parseInt(destDayId.replace('day-', '')) - 1
        : destDayId;

    if (sourceDayIndex === -1 || destDayIndex === -1) return;

    // If dragging within the same day, reorder
    if (sourceDayIndex === destDayIndex) {
      const dayActivities = [...schedule[sourceDayIndex].activities];
      const oldIndex = dayActivities.findIndex((act) => act.id === activeId);
      const newIndex = overId.startsWith('day-')
        ? dayActivities.length
        : dayActivities.findIndex((act) => act.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newSchedule = [...schedule];
        newSchedule[sourceDayIndex] = {
          ...newSchedule[sourceDayIndex],
          activities: arrayMove(dayActivities, oldIndex, newIndex),
        };
        setSchedule(newSchedule);
      }
    } else {
      // Moving between days
      const sourceActivities = [...schedule[sourceDayIndex].activities];
      const destActivities = [...schedule[destDayIndex].activities];

      const activityIndex = sourceActivities.findIndex((act) => act.id === activeId);
      if (activityIndex === -1) return;

      const [movedActivity] = sourceActivities.splice(activityIndex, 1);
      destActivities.push(movedActivity);

      const newSchedule = [...schedule];
      newSchedule[sourceDayIndex] = {
        ...newSchedule[sourceDayIndex],
        activities: sourceActivities,
      };
      newSchedule[destDayIndex] = {
        ...newSchedule[destDayIndex],
        activities: destActivities,
      };
      setSchedule(newSchedule);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveActivity(null);
    onScheduleChange?.(schedule);
  };

  const handleDeleteActivity = (activityId: string) => {
    const newSchedule = schedule.map((day) => ({
      ...day,
      activities: day.activities.filter((act) => act.id !== activityId),
    }));
    setSchedule(newSchedule);
    onScheduleChange?.(newSchedule);
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
  };

  const handleSaveEdit = (updatedActivity: Activity) => {
    const newSchedule = schedule.map((day) => ({
      ...day,
      activities: day.activities.map((act) =>
        act.id === updatedActivity.id ? updatedActivity : act
      ),
    }));
    setSchedule(newSchedule);
    onScheduleChange?.(newSchedule);
    setEditingActivity(null);
  };

  const handleAddActivity = (day: number) => {
    // This would open a dialog to add a new activity
    console.log('Add activity to day', day);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Your Itinerary
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Drag activities between days to reorganize your trip
          </p>
        </div>

        <div ref={exportRef} className="relative">
          <button
            onClick={() => setExportMenu((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            Export
            <CaretDown className={`w-4 h-4 transition-transform ${exportMenu ? 'rotate-180' : ''}`} />
          </button>

          {exportMenu && (
            <div className="absolute right-0 mt-1 z-50 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
              {/* Calendar */}
              <button
                onClick={() => { onExportCalendar?.(); setExportMenu(false); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <CalendarBlank className="w-4 h-4 text-blue-500" />
                {exportLabel ?? 'Export to Calendar'}
              </button>

              {/* Docs */}
              <button
                onClick={() => { onExportDocs?.(); setExportMenu(false); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FileText className="w-4 h-4 text-emerald-500" />
                {docsLabel ?? 'Export to Docs'}
              </button>
              {docUrl && (
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setExportMenu(false)}
                  className="flex items-center gap-3 w-full px-4 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors pl-11"
                >
                  <ArrowSquareOut className="w-3.5 h-3.5" />
                  Open Doc
                </a>
              )}

              {/* Sheets */}
              <button
                onClick={() => { onExportSheets?.(); setExportMenu(false); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Table className="w-4 h-4 text-violet-500" />
                {sheetsLabel ?? 'Export to Sheets'}
              </button>
              {sheetUrl && (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setExportMenu(false)}
                  className="flex items-center gap-3 w-full px-4 py-2 text-xs text-violet-600 dark:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors pl-11"
                >
                  <ArrowSquareOut className="w-3.5 h-3.5" />
                  Open Sheet
                </a>
              )}

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

              {/* Share */}
              <button
                onClick={() => { onShareTrip?.(); setExportMenu(false); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <LinkSimple className="w-4 h-4 text-orange-500" />
                {sharingLabel ?? 'Share Trip Link'}
              </button>
              {shareUrl && (
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setExportMenu(false)}
                  className="flex items-center gap-3 w-full px-4 py-2 text-xs text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors pl-11"
                >
                  <ArrowSquareOut className="w-3.5 h-3.5" />
                  Open Shared Page
                </a>
              )}

              {/* PDF */}
              <button
                onClick={() => { onDownloadPdf?.(); setExportMenu(false); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FilePdf className="w-4 h-4 text-red-500" />
                {pdfLabel ?? 'Download as PDF'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {schedule.map((day) => (
            <KanbanColumn
              key={day.day}
              day={day.day}
              date={day.date}
              theme={day.theme}
              activities={day.activities}
              onEdit={handleEditActivity}
              onDelete={handleDeleteActivity}
              onAddActivity={handleAddActivity}
            />
          ))}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeActivity ? (
            <div className="rotate-3 scale-105">
              <KanbanCard activity={activeActivity} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Edit modal */}
      <AnimatePresence>
        {editingActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setEditingActivity(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Edit Activity
                </h3>
                <button
                  onClick={() => setEditingActivity(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Activity Name
                  </label>
                  <input
                    type="text"
                    value={editingActivity.name}
                    onChange={(e) =>
                      setEditingActivity({ ...editingActivity, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingActivity.description}
                    onChange={(e) =>
                      setEditingActivity({ ...editingActivity, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={editingActivity.duration}
                      onChange={(e) =>
                        setEditingActivity({
                          ...editingActivity,
                          duration: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      value={editingActivity.price}
                      onChange={(e) =>
                        setEditingActivity({
                          ...editingActivity,
                          price: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditingActivity(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEdit(editingActivity)}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
