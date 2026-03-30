"use client";

import { useState } from "react";

type StoryImageVariant = "hero" | "card" | "thumb";

const VARIANT_STYLES: Record<
  StoryImageVariant,
  {
    frameClass: string;
    fallbackLabel: string;
  }
> = {
  hero: {
    frameClass: "aspect-[16/9] w-full",
    fallbackLabel: "Lead image unavailable",
  },
  card: {
    frameClass: "aspect-[4/3] w-full",
    fallbackLabel: "Story image unavailable",
  },
  thumb: {
    frameClass: "aspect-square w-full",
    fallbackLabel: "Thumbnail unavailable",
  },
};

export function StoryImage({
  src,
  variant,
  label,
}: {
  src: string | null;
  variant: StoryImageVariant;
  label: string;
}) {
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");
  const style = VARIANT_STYLES[variant];

  if (!src) {
    return (
      <div
        className={`relative overflow-hidden rounded-md border border-dashed border-[#d0d7de] bg-[linear-gradient(180deg,#f6f8fa_0%,#edf2f7_100%)] ${style.frameClass}`}
      >
        <div className="flex h-full items-end p-3">
          <div className="rounded-md border border-[#d0d7de] bg-white/80 px-2 py-1 text-[11px] font-medium text-[#57606a]">
            {style.fallbackLabel}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-[#d8dee4] bg-[#eef2f6] ${style.frameClass}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        loading="lazy"
        onLoad={(event) => {
          const image = event.currentTarget;
          const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
          setFitMode(ratio > 2.15 || ratio < 0.8 ? "contain" : "cover");
        }}
        className={`h-full w-full transition-opacity ${
          fitMode === "contain"
            ? "object-contain object-top p-3"
            : "object-cover object-center object-top"
        }`}
      />
    </div>
  );
}
