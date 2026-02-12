import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to login page
  // TODO: Add authentication check - if authenticated, redirect to dashboard
  redirect('/login');
}
