import { notFound } from "next/navigation";
import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { modules } from "@/lib/navigation";

export function generateStaticParams() {
  return modules.map(({ href }) => ({ module: href.slice(1) }));
}

export async function generateMetadata({ params }) {
  const { module: slug } = await params;
  const currentModule = modules.find((item) => item.href === `/${slug}`);

  return {
    title: currentModule
      ? `${currentModule.label} | Sabit Super Store`
      : "Page not found | Sabit Super Store",
  };
}

export default async function ModulePage({ params }) {
  const { module: slug } = await params;
  const currentModule = modules.find((item) => item.href === `/${slug}`);

  if (!currentModule) {
    notFound();
  }

  return <ModulePlaceholder moduleKey={currentModule.key} />;
}
