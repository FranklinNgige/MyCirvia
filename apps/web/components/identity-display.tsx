import type { ResolvedIdentityDTO } from '@/lib/types';

export function IdentityDisplay({ identity }: { identity: ResolvedIdentityDTO }) {
  const initials = identity.displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {identity.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={identity.avatarUrl} alt={identity.displayName} className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
          {initials}
        </div>
      )}
      <span className="text-sm font-medium text-slate-800">{identity.displayName}</span>
    </div>
  );
}
