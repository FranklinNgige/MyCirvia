import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'MyCirvia',
  description: 'Privacy-first communities with scoped identity.'
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body>
      <main>{children}</main>
    </body>
  </html>
);

export default RootLayout;
