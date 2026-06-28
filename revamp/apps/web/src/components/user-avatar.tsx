import { Avatar, AvatarFallback } from '@/components/ui';
import { avatarToneClass } from '@/lib/avatar-tone';
import { cn } from '@/lib/cn';
import { initialsOf } from '@/lib/format';

/**
 * UserAvatar — initials chip whose background + ring encode the user's role
 * (deterministic per role). Size/font come from `className` on the Avatar root.
 */
export function UserAvatar({
  name,
  role,
  className,
}: {
  name: string;
  role?: string | null;
  className?: string;
}): JSX.Element {
  return (
    <Avatar className={className}>
      <AvatarFallback
        className={cn('font-semibold ring-2 ring-inset', avatarToneClass(role ?? ''))}
      >
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}
