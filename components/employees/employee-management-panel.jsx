"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, MailPlus, Users } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

const initialForm = {
  displayName: "",
  email: "",
  employeeCode: "",
  phone: "",
  roleCode: "cashier",
  preferredLanguage: "en",
};

const errorMessages = {
  configuration: "auth.configurationMissing",
  email_invite_failed: "employees.inviteFailed",
  forbidden: "employees.permissionDenied",
  invalid_request: "employees.invalidInvite",
  profile_not_saved: "employees.profileSaveFailed",
};

export function EmployeeManagementPanel({ employees }) {
  const { numberLocale, t } = useLocale();
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setPending(true);

    try {
      const response = await fetch("/api/employees/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(t(errorMessages[result.error] ?? "employees.inviteFailed"));
        return;
      }

      setForm(initialForm);
      setSuccess(t("employees.inviteSent"));
      router.refresh();
    } catch {
      setError(t("employees.requestFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
          {t("employees.team")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
          {t("employees.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t("employees.description")}
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <MailPlus size={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">{t("employees.inviteTitle")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("employees.inviteDescription")}
            </p>
          </div>
        </div>

        {error ? (
          <p
            aria-live="polite"
            className="mb-4 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <p
            aria-live="polite"
            className="mb-4 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2.5 text-sm text-foreground"
            role="status"
          >
            {success}
          </p>
        ) : null}

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Field label={t("employees.name")} name="displayName" required>
            <input
              autoComplete="name"
              className={inputClassName}
              maxLength={120}
              name="displayName"
              onChange={updateField}
              required
              value={form.displayName}
            />
          </Field>
          <Field label={t("employees.email")} name="email" required>
            <input
              autoComplete="email"
              className={inputClassName}
              maxLength={254}
              name="email"
              onChange={updateField}
              required
              type="email"
              value={form.email}
            />
          </Field>
          <Field label={t("employees.employeeCode")} name="employeeCode">
            <input
              className={inputClassName}
              maxLength={40}
              name="employeeCode"
              onChange={updateField}
              value={form.employeeCode}
            />
          </Field>
          <Field label={t("employees.phone")} name="phone">
            <input
              autoComplete="tel"
              className={inputClassName}
              maxLength={40}
              name="phone"
              onChange={updateField}
              type="tel"
              value={form.phone}
            />
          </Field>
          <Field label={t("employees.role")} name="roleCode" required>
            <select
              className={inputClassName}
              name="roleCode"
              onChange={updateField}
              value={form.roleCode}
            >
              <option value="cashier">{t("employees.roles.cashier")}</option>
              <option value="admin">{t("employees.roles.admin")}</option>
            </select>
          </Field>
          <Field label={t("employees.preferredLanguage")} name="preferredLanguage">
            <select
              className={inputClassName}
              name="preferredLanguage"
              onChange={updateField}
              value={form.preferredLanguage}
            >
              <option value="en">English</option>
              <option value="ps">پښتو</option>
              <option value="fa">دری</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Button disabled={pending} type="submit">
              {pending ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <MailPlus size={16} />
              )}
              {pending ? t("employees.sendingInvite") : t("employees.sendInvite")}
            </Button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
            <Users size={17} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">{t("employees.directory")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Intl.NumberFormat(numberLocale).format(employees.length)}{" "}
              {t("employees.employeeCount")}
            </p>
          </div>
        </div>
        {employees.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            {t("employees.empty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs rtl:text-right">
              <thead className="bg-surface-muted text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    {t("employees.name")}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t("employees.employeeCode")}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t("employees.role")}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t("employees.status")}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t("employees.joined")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="px-5 py-3.5">
                      <span className="block font-medium text-foreground">
                        {employee.display_name}
                      </span>
                      <span className="mt-1 block text-muted-foreground">
                        {employee.phone || t("employees.noPhone")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {employee.employee_code || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {employee.roleCode
                        ? t(`employees.roles.${employee.roleCode}`)
                        : employee.roleName}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={
                          employee.is_active
                            ? "rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent"
                            : "rounded-full bg-warning-soft px-2.5 py-1 font-medium text-foreground"
                        }
                      >
                        {t(
                          employee.is_active
                            ? "employees.active"
                            : "employees.inactive",
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {new Intl.DateTimeFormat(numberLocale, {
                        dateStyle: "medium",
                      }).format(new Date(employee.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const inputClassName =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-accent";

function Field({ children, label }) {
  return (
    <label className="block space-y-1.5 text-xs font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
