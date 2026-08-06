import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

// A persistent top banner instead of a toast — a toast disappears in a few
// seconds even though the underlying problem (no network) hasn't gone away,
// which is misleading. This stays up for exactly as long as the user is
// actually offline.
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
    >
      <WifiOff size={15} />
      You're offline — changes won't save until your connection comes back.
    </div>
  );
}
