import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Loader2 } from "lucide-react";

export const metadata = { title: "Login — Neural AI Studio" };

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid h-[70vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-neon-cyan" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
