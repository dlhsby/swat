import { redirect } from 'next/navigation';

/** Locale root — send users into the dashboard (the app guard handles auth). */
export default async function LocaleRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/dashboard`);
}
