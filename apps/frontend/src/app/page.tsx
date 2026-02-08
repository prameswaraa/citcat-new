import { redirect } from 'next/navigation';

// Redirect root path to default locale
export default function RootPage() {
  redirect('/en');
}
