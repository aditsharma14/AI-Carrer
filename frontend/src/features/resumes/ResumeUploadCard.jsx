import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '../../shared/lib/cn';
import { useUploadResume } from './hooks';

// Plain HTML5 drag events instead of react-dropzone — the only behavior
// needed is "accept one PDF/DOCX file," which doesn't justify a dependency.
export function ResumeUploadCard() {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const upload = useUploadResume();

  function handleFile(file) {
    if (!file) return;
    upload.mutate(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload resume — drop a file here or press Enter to browse"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        // A native <label> can't be Tab-focused when it wraps a visually
        // hidden input, so this drop zone needs its own keyboard handler to
        // stay operable without a mouse — Enter/Space are what a real
        // <button> would respond to.
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200',
        dragging
          ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
          : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
          dragging ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-100 text-slate-400'
        )}
      >
        <UploadCloud size={22} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-slate-700">
        {upload.isPending ? 'Uploading...' : 'Drop your resume here, or click to browse'}
      </p>
      <p className="text-xs text-slate-500">PDF or DOCX, up to 5MB</p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}
