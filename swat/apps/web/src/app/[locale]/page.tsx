import { redirect } from 'next/navigation';

/** Locale root — send users into the dashboard (the app guard handles auth). */
export default function LocaleRootPage({ params }: { params: { locale: string } }): never {
  redirect(`/${params.locale}/dasbor`);
}
