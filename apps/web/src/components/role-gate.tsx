import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../hooks/use-auth";

type RoleGateProps = {
  roles: string[];
  children: ReactNode;
};

export default function RoleGate({ roles, children }: RoleGateProps) {
  const { user, loading } = useAuth();

  if (loading) return <p className="text-neutral-300">Carregando...</p>;
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
