export function Spinner({ size = 6 }: { size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin`}
    />
  );
}
