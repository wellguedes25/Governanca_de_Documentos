import * as Diff from 'diff';

interface DiffTextProps {
  oldText: string;
  newText: string;
  type: 'previous' | 'current';
  score: number;
}

/** Renderiza diff word-by-word entre dois textos de laudos */
export function DiffText({ oldText, newText, type, score }: DiffTextProps) {
  if (score >= 100) {
    return <div>{type === 'previous' ? oldText : newText}</div>;
  }

  const diff = Diff.diffWordsWithSpace(oldText || '', newText || '');

  return (
    <>
      {diff.map((part, index) => {
        if (type === 'previous') {
          if (part.removed) {
            return (
              <span key={index} className="bg-rose-100 text-rose-800 line-through font-bold px-0.5 rounded border-b border-rose-300">
                {part.value}
              </span>
            );
          }
          if (part.added) return null;
          return <span key={index}>{part.value}</span>;
        } else {
          if (part.added) {
            return (
              <span key={index} className="bg-emerald-100 text-emerald-800 font-bold px-0.5 rounded border-b border-emerald-300">
                {part.value}
              </span>
            );
          }
          if (part.removed) return null;
          return <span key={index}>{part.value}</span>;
        }
      })}
    </>
  );
}
