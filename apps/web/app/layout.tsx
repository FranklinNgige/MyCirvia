import type { ReactNode } from "react";

export const metadata = {
  title: "MyCirvia",
  description: "Privacy-first Cirvia communities",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
