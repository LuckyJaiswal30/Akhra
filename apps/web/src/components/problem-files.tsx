import { FileText, Video } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface FileEntry {
  id: string;
  kind: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
}

const drawable = (file: FileEntry) => file.kind === 'photo' && !/heic|heif/.test(file.mimeType);

export function ProblemFiles({
  files,
  compact = false,
  className,
}: {
  files: FileEntry[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        'grid gap-3',
        compact ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3',
        className,
      )}
    >
      {files.map((file) => {
        const href = `/api/files/${file.storageKey}`;
        const Icon = file.kind === 'video' ? Video : FileText;
        return (
          <li key={file.id}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="group border-line bg-surface block overflow-hidden rounded-xl border"
            >
              {drawable(file) ? (
                <Image
                  src={href}
                  alt={file.originalName}
                  width={320}
                  height={240}
                  unoptimized
                  className="aspect-4/3 w-full object-cover"
                />
              ) : (
                <span className="bg-well text-subtle grid aspect-4/3 place-items-center">
                  <Icon aria-hidden className="h-7 w-7" />
                </span>
              )}
              <span
                className={cn(
                  'text-ink group-hover:text-sal block truncate px-2.5 py-1.5',
                  compact ? 'text-[11px]' : 'text-xs',
                )}
              >
                {file.originalName}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
