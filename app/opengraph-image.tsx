import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "muzi — Real-time social jukebox. Open a room, share a code, vote the queue.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const outfitBold = await readFile(
  join(process.cwd(), "assets/fonts/Outfit-Bold.ttf"),
);

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#0d0915",
          fontFamily: "Outfit",
          overflow: "hidden",
        }}
      >
        {/* Ambient purple glow (layered circles; resvg radial-gradient artifacts) */}
        <div
          style={{
            position: "absolute",
            top: -260,
            left: 320,
            width: 900,
            height: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 900,
              height: 900,
              borderRadius: 9999,
              backgroundColor: "rgba(168, 85, 247, 0.08)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 620,
              height: 620,
              borderRadius: 9999,
              backgroundColor: "rgba(168, 85, 247, 0.12)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 360,
              height: 360,
              borderRadius: 9999,
              backgroundColor: "rgba(168, 85, 247, 0.16)",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: -320,
            right: -160,
            width: 700,
            height: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 700,
              height: 700,
              borderRadius: 9999,
              backgroundColor: "rgba(99, 102, 241, 0.07)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 440,
              height: 440,
              borderRadius: 9999,
              backgroundColor: "rgba(99, 102, 241, 0.10)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px 80px",
            width: "100%",
          }}
        >
          {/* Brand row */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="52" height="52" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="7" fill="#171021" />
              <g transform="translate(-2.5 0)">
                <circle cx="14" cy="22" r="6" fill="#a855f7" />
                <rect x="17" y="4" width="4" height="18" rx="2" fill="#a855f7" />
                <path d="M17 4c6 0 10 3 12 7-3-2-7-3-12-3z" fill="#d8b4fe" />
              </g>
            </svg>
            <span style={{ fontSize: 40, fontWeight: 700, color: "#fafafa" }}>
              muzi
            </span>
          </div>

          {/* Headline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 44,
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              color: "#fafafa",
            }}
          >
            <span>The queue is</span>
            <span style={{ color: "#c084fc" }}>a democracy.</span>
          </div>

          {/* Subline */}
          <div
            style={{
              marginTop: 28,
              fontSize: 30,
              lineHeight: 1.4,
              color: "#a5a0b5",
              maxWidth: 720,
            }}
          >
            Open a room, share one code, and let votes decide what plays next.
          </div>

          {/* Pills */}
          <div style={{ display: "flex", gap: 14, marginTop: 48 }}>
            {["YouTube", "Spotify", "Live upvotes"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: 9999,
                  border: "1px solid rgba(168, 85, 247, 0.35)",
                  backgroundColor: "rgba(168, 85, 247, 0.12)",
                  color: "#d8b4fe",
                  fontSize: 22,
                  fontWeight: 700,
                  padding: "10px 24px",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* EQ bars, bottom right */}
        <div
          style={{
            position: "absolute",
            right: 80,
            bottom: 72,
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            height: 120,
          }}
        >
          {[44, 88, 60, 108, 34, 76].map((h, i) => (
            <div
              key={i}
              style={{
                width: 16,
                height: h,
                borderRadius: 8,
                backgroundColor: i % 2 === 0 ? "#a855f7" : "#7c3aed",
                opacity: 0.9,
              }}
            />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Outfit",
          data: outfitBold,
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
}
