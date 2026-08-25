import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthSessionRedirect } from "@/app/components/auth-session-redirect";

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050816] px-6">
      <AuthSessionRedirect />
      <SignIn
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
        appearance={{
          elements: {
            card: "rounded-3xl border border-white/10 bg-[#0b1023] shadow-[0_0_40px_rgba(0,153,255,0.15)]",
            headerTitle: "text-white",
            headerSubtitle: "text-slate-400",
            socialButtonsBlockButton:
              "border border-white/10 bg-[#111827] text-white",
            formButtonPrimary:
              "rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white",
            footerActionLink: "text-cyan-300",
            formFieldInput:
              "border border-white/10 bg-[#0f172a] text-white",
          },
        }}
      />
    </main>
  );
}
