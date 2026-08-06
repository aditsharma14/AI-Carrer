import { forwardRef } from 'react';
import { cn } from '../lib/cn';

// forwardRef is required, not optional — react-hook-form's register() attaches
// a ref directly to the DOM input to read its value uncontrolled.
export const Input = forwardRef(function Input(
  { label, error, helperText, id, className, ...props },
  ref
) {
  const inputId = id || props.name;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = !error && helperText ? `${inputId}-helper` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        aria-invalid={!!error}
        aria-describedby={errorId || helperId}
        className={cn(
          'h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900',
          'placeholder:text-slate-400',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500',
          error && 'border-rose-400 focus-visible:outline-rose-500',
          className
        )}
        {...props}
      />
      {error && <p id={errorId} className="text-xs text-rose-600">{error}</p>}
      {!error && helperText && <p id={helperId} className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
});
