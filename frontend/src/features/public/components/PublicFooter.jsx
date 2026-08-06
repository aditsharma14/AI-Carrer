import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { to: '/features', label: 'Features' },
      { to: '/pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/login', label: 'Log in' },
      { to: '/signup', label: 'Sign up' },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                <Sparkles size={16} />
              </div>
              <span className="text-sm font-semibold text-slate-900">CareerCoach AI</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              One AI for your career, one copilot for hiring. Resume scoring, skill gaps, and interviews for job
              seekers — candidate ranking and screening for recruiters.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-slate-900">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-slate-500 hover:text-slate-900">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-slate-100 pt-6">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} CareerCoach AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
