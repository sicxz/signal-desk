"use client";

export function ChannelFilter({
  channels,
  selected,
  onSelect,
}: {
  channels: string[];
  selected: string | null;
  onSelect: (channel: string | null) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          selected === null
            ? "border-[#0969da] bg-[#ddf4ff] text-[#0969da]"
            : "border-[#d0d7de] bg-white text-[#57606a] hover:border-[#8c959f] hover:text-[#1f2328]"
        }`}
      >
        All sources
      </button>
      {channels.map((channel) => (
        <button
          key={channel}
          type="button"
          onClick={() => onSelect(channel)}
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            selected === channel
              ? "border-[#0969da] bg-[#ddf4ff] text-[#0969da]"
              : "border-[#d0d7de] bg-white text-[#57606a] hover:border-[#8c959f] hover:text-[#1f2328]"
          }`}
        >
          {channel}
        </button>
      ))}
    </div>
  );
}
