import { WelcomeRolePicker } from "@/components/welcome/WelcomeRolePicker";
import { GradientShell } from "@/components/shell/GradientShell";

export const metadata = {
  title: "What roles do you want to apply to? · Hired",
};

const SUGGESTIONS = [
  "Product Manager",
  "Software Engineer",
  "Data Analyst",
  "Designer",
  "Marketing Manager",
  "Sales Lead",
  "Operations",
  "Recruiter",
];

export default function WelcomePage() {
  return (
    <GradientShell>
      <main className="mx-auto max-w-3xl px-5 pt-20 md:pt-28 pb-12">
        <div className="text-center">
          <div className="text-sm uppercase tracking-[0.22em] text-white/65">Step 1 of 2</div>
          <h1 className="mt-3 font-serif italic text-4xl md:text-6xl text-white leading-tight">
            What roles do you want to apply to?
          </h1>
          <p className="mt-4 text-white/75 text-base md:text-lg">
            We'll tailor a CV for each one. Add up to five.
          </p>
        </div>
        <WelcomeRolePicker suggestions={SUGGESTIONS} />
      </main>
    </GradientShell>
  );
}
