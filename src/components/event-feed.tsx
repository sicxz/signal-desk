"use client";

import { Event } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export function EventFeed({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No events found. Send some events to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {event.icon && (
                <span className="text-xl flex-shrink-0 mt-0.5">
                  {event.icon}
                </span>
              )}
              <div className="min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {event.title}
                </h3>
                {event.description && (
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                    {event.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {event.channel}
                  </span>
                  {event.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
              {timeAgo(event.created_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
