import { WelcomeRolePicker } from "@/components/welcome/WelcomeRolePicker";
import { GradientShell } from "@/components/shell/GradientShell";
import { getServerT } from "@/lib/i18n/server";

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

export default async function WelcomePage() {
  const { t } = await getServerT();
  return (
    <GradientShell>
      <main className="mx-auto max-w-3xl px-5 pt-20 md:pt-28 pb-12">
        <div className="text-center">
          <div className="text-sm uppercase tracking-[0.22em] text-white/65">{t("Step {n} of {total}", { n: 1, total: 2 })}</div>
          <h1 className="mt-3 font-serif italic text-4xl md:text-6xl text-white leading-tight">
            {t("What roles do you want to apply to?")}
          </h1>
          <p className="mt-4 text-white/75 text-base md:text-lg">
            {t("We'll tailor a CV for each one. Add up to five.")}
          </p>
        </div>
        <WelcomeRolePicker suggestions={SUGGESTIONS} />
      </main>
    </GradientShell>
  );
}
