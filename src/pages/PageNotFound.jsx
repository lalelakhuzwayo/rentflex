import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search, FileQuestion, HelpCircle } from 'lucide-react';

export default function PageNotFound() {
    const location = useLocation();
    const navigate = useNavigate();
    const attemptedPath = location.pathname;

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6 app-bg-pattern">
            <div className="max-w-md w-full text-center space-y-6 bg-white/90 backdrop-blur-md p-8 sm:p-10 rounded-2xl border border-zinc-200 shadow-xl">
                {/* Brand Logo & Error Badge */}
                <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-md">
                        <img src="/assets/rentflex-logo.png" alt="RentFlex" className="w-8 h-8 object-contain" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                        <FileQuestion className="w-3.5 h-3.5 text-zinc-500" />
                        Error 404
                    </span>
                </div>

                {/* Main Heading & Description */}
                <div className="space-y-2.5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                        Page Not Found
                    </h1>
                    <p className="text-sm text-zinc-600 leading-relaxed max-w-sm mx-auto">
                        Sorry, we couldn’t find the page you’re looking for. The link may be broken or the URL might have changed.
                    </p>
                    {attemptedPath && attemptedPath !== '/' && (
                        <div className="pt-1">
                            <span className="inline-block text-[11px] font-mono text-zinc-500 bg-zinc-100/80 px-2.5 py-1 rounded-lg border border-zinc-200 max-w-full truncate">
                                {attemptedPath}
                            </span>
                        </div>
                    )}
                </div>

                {/* Primary & Secondary Actions */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <Button
                        onClick={() => navigate('/Dashboard')}
                        className="w-full sm:w-auto h-10 px-5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
                    >
                        <Home className="w-3.5 h-3.5" />
                        Go to Dashboard
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate(-1)}
                        className="w-full sm:w-auto h-10 px-4 rounded-xl border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Go Back
                    </Button>
                </div>

                {/* Quick Helpful Links */}
                <div className="pt-4 border-t border-zinc-100 flex items-center justify-center gap-6 text-xs text-zinc-500">
                    <Link to="/Properties" className="hover:text-zinc-900 flex items-center gap-1.5 transition-colors font-medium">
                        <Search className="w-3.5 h-3.5 text-zinc-400" />
                        Properties
                    </Link>
                    <span className="text-zinc-300">•</span>
                    <Link to="/Messages" className="hover:text-zinc-900 flex items-center gap-1.5 transition-colors font-medium">
                        <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                        Support
                    </Link>
                </div>
            </div>
        </div>
    );
}
