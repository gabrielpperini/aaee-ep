import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Delegação EP — Engenharia UFRGS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cores da identidade da AAEE (mesma paleta de globals.css)
const NAVY = "#0F1F33";
const CYAN = "#4A8FA6";
const CREAM = "#EDE5D0";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/logo.png"));
  const logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: NAVY,
          color: CREAM,
          position: "relative",
          padding: "72px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Glow no canto */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${CYAN}66, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -180,
            left: -180,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${CYAN}33, transparent 70%)`,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 56,
            width: "100%",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDataUri}
            alt=""
            width={340}
            height={308}
            style={{ filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.45))" }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontSize: 22,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: CYAN,
                fontWeight: 700,
              }}
            >
              AAEE · Engenharia UFRGS
            </div>
            <div
              style={{
                fontSize: 108,
                fontWeight: 700,
                lineHeight: 0.95,
                letterSpacing: -2,
                color: CREAM,
              }}
            >
              Delegação EP.
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 30,
                color: `${CREAM}b3`,
                maxWidth: 620,
                lineHeight: 1.25,
              }}
            >
              Agenda, torcida e operação dos 3 dias num só painel.
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 72,
            right: 72,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: `${CREAM}80`,
            fontWeight: 600,
          }}
        >
          <span>EP · 2026</span>
          <span>delegacao-ep</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
