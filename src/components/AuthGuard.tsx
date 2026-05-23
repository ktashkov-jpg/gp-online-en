import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface AuthGuardProps {
  user: { uid: string } | null;
  children: ReactNode;
}

export default function AuthGuard({ user, children }: AuthGuardProps) {
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
