"use client";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#57606a]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" />
      </svg>
      <input
        type="search"
        placeholder="Filter stories, tags, topics"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-[#d0d7de] bg-white pl-9 pr-3 text-sm text-[#1f2328] placeholder:text-[#57606a] shadow-sm outline-none transition-colors focus:border-[#0969da] focus:ring-4 focus:ring-[#0969da]/10"
      />
    </div>
  );
}
