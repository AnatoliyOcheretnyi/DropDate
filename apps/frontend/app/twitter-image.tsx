import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background:
            "linear-gradient(140deg, #0b1f1a 0%, #0f2a22 50%, #0b1418 100%)",
          color: "#f4f3ef",
          fontFamily: "ui-sans-serif"
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: 2 }}>DropDate</div>
        <div style={{ fontSize: 32, marginTop: 20, maxWidth: 900, lineHeight: 1.3 }}>
          Дізнайся дату наступного релізу серіалів і фільмів.
        </div>
        <div style={{ fontSize: 22, marginTop: 30, color: "#69f0ae" }}>
          Пошук по TMDB · Підказки · Постери · Збережений список
        </div>
      </div>
    ),
    size
  );
}
