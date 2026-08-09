import { InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helper?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, helper, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
            error ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""
          } ${className}`}
          aria-invalid={!!error}
          {...props}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
        {helper && !error && (
          <span className="text-xs text-slate-400 dark:text-slate-500">{helper}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
