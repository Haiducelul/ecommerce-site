"use client";

import { useState } from "react";
import { Tag } from "lucide-react";

type Props = {
  images: string[];       // image_gallery array from the DB
  coverUrl: string | null; // image_url shortcut — first gallery entry
  name: string;
  categoryLabel: string;
};

export default function ProductImageGallery({
  images,
  coverUrl,
  name,
  categoryLabel,
}: Props) {
  // Merge cover + gallery into a deduplicated ordered list
  const allImages = (() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const url of [coverUrl, ...images]) {
      if (url && !seen.has(url)) {
        seen.add(url);
        list.push(url);
      }
    }
    return list;
  })();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedUrl = allImages[selectedIndex] ?? null;

  return (
    <div className="flex flex-row gap-3">
      {/* Main image */}
      <div className="relative aspect-square flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {selectedUrl ? (
          <img
            src={selectedUrl}
            alt={name}
            className="h-full w-full object-contain"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-neutral-950"
            aria-label={`Imagine produs: ${name}`}
            role="img"
          >
            <div className="flex flex-col items-center gap-3 text-neutral-700 select-none">
              <div className="rounded-full bg-neutral-800 p-5">
                <Tag className="size-10" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-medium uppercase tracking-widest">
                {categoryLabel}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail strip — stacked vertically on the right */}
      {allImages.length > 1 && (
        <div className="flex flex-col gap-2">
          {allImages.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setSelectedIndex(i)}
              aria-label={`Imagine ${i + 1}`}
              aria-pressed={i === selectedIndex}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-1 ${
                i === selectedIndex
                  ? "border-[#22624a] shadow-sm"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <img
                src={url}
                alt={`Thumbnail ${i + 1}`}
                className="h-full w-full object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
