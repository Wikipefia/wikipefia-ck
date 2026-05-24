import Image from "next/image";
import { C } from "@/lib/theme";

interface FigureProps {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

export function Figure({
  src,
  alt,
  caption,
  width = 800,
  height = 450,
}: FigureProps) {
  return (
    <figure className="mb-6 border-2" style={{ borderColor: C.border }}>
      <div className="relative overflow-hidden" style={{ backgroundColor: C.bg }}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto block"
          style={{ objectFit: "contain" }}
        />
      </div>

      {caption && (
        <figcaption
          className="px-3 py-2 border-t-2 text-[11px] leading-[1.6]"
          style={{
            fontFamily: "var(--font-mono)",
            color: C.textMuted,
            backgroundColor: C.bg,
            borderColor: C.border,
          }}
        >
          <span
            className="font-bold uppercase tracking-[0.1em] mr-1.5"
            style={{ color: C.text }}
          >
            Fig.
          </span>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
