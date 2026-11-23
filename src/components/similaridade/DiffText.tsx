import * as Diff from 'diff';

interface DiffTextProps {
  oldText: string;
  newText: string;
  type: 'previous' | 'current';
  score: number;
}

/** Renderiza diff word-by-word entre dois textos de laudos com tokens Sylva adaptativos */
export function DiffText({ oldText, newText, type, score }: DiffTextProps) {
  if (score >= 100) {
    return <div className="text-[var(--foreground)]">{type === 'previous' ? oldText : newText}</div>;
  }

  const diff = Diff.diffWordsWithSpace(oldText || '', newText || '');

  return (
    <>
      {diff.map((part, index) => {
        if (type === 'previous') {
          if (part.removed) {
            return (
              <span key={index} className="bg-rose-500/15 text-rose-700 dark:text-rose-300 line-through font-semibold px-1 py-0.5 rounded border-b border-rose-400/40">
                {part.value}
              </span>
            );
          }
          if (part.added) return null;
          return <span key={index} className="text-[var(--foreground)]">{part.value}</span>;
        } else {
          if (part.added) {
            return (
              <span key={index} className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-semibold px-1 py-0.5 rounded border-b border-emerald-400/40">
                {part.value}
              </span>
            );
          }
          if (part.removed) return null;
          return <span key={index} className="text-[var(--foreground)]">{part.value}</span>;
        }
      })}
    </>
  );
}
