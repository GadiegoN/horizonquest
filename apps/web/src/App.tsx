import { RouterProvider } from "react-router/dom";
import { router } from "./router";
import { AuthProvider } from "./context/auth-context";
import { ToastProvider } from "./context/toast-context";

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}
