import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { testApi } from '@/services/api/test';
import { useTestStore } from '@/store/testStore';

export const TestAccess: React.FC = () => {
    const navigate = useNavigate();
    const setSession = useTestStore(s => s.setSession);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return toast.error('Please enter your access code');
        setLoading(true);
        try {
            const session = await testApi.accessSession(code.toUpperCase().trim());
            setSession(session);
            toast.success('Access granted!');
            navigate('/test/instructions');
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Invalid access code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-6">
                        <KeyRound className="h-8 w-8 text-violet-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Enter Access Code</h1>
                    <p className="text-gray-400 mt-2">Your recruiter will have provided an 8-character code.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <input
                        type="text"
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                        placeholder="e.g. ABCD1234"
                        maxLength={10}
                        className="w-full bg-gray-900 border border-gray-800 text-white text-center text-2xl font-bold tracking-widest rounded-2xl px-4 py-5 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 placeholder-gray-700 uppercase transition-all"
                    />
                    <button
                        type="submit"
                        disabled={loading || !code.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all"
                    >
                        {loading
                            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <><span>Access Simulation</span><ArrowRight className="h-4 w-4" /></>
                        }
                    </button>
                </form>

                <p className="text-center text-xs text-gray-600 mt-8">
                    Having trouble? Contact your recruiter for a new access code.
                </p>
            </div>
        </div>
    );
};