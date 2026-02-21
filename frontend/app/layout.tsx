// frontend/app/layout.tsx
import type { ReactNode } from "react";

export const metadata = {
  title: "Cohort Similarity Map",
  description: "Resume similarity + herd phrase analysis",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}