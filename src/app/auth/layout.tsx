import type { ReactNode } from 'react';

const AuthLayout = ({ children }: { children: ReactNode }) => (
  <div className="auth-card">{children}</div>
);

export default AuthLayout;
