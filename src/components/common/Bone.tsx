type BoneProps = {
  className?: string;
};

export default function Bone({ className = "" }: BoneProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--surface-faint)] ${className}`}
      aria-hidden
    />
  );
}

export function FilterChipsSkeleton({
  count = 2,
  className = "mb-5",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <Bone key={i} className="h-9 w-24 rounded-lg" />
      ))}
    </div>
  );
}
