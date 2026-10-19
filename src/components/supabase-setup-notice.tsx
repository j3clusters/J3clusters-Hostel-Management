import { AppText } from '@/components/ui/app-text';
import { StatusBadge } from '@/components/ui/status-badge';

export function SupabaseSetupNotice() {
  return (
    <>
      <StatusBadge label="Setup needed" />
      <AppText variant="title">Connect Supabase</AppText>
      <AppText variant="body">
        Create a project in the Supabase dashboard. Then add the project URL and publishable key to
        .env.local in this app folder, and restart Expo. Do not put the secret key in the app.
      </AppText>
    </>
  );
}
