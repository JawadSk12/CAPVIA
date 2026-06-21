import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/common/Button';

export const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="relative mb-8">
                        <h1 className="text-[12rem] font-black text-gray-100 leading-none">404</h1>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Search className="h-20 w-20 text-primary-600 animate-bounce" />
                        </div>
                    </div>
                    
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Lost in orbit?</h2>
                    <p className="text-slate-400 mb-10 leading-relaxed">
                        The page you are looking for doesn't exist or has been moved to another coordinate.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button 
                            variant="outline" 
                            leftIcon={<ArrowLeft className="h-4 w-4" />}
                            onClick={() => navigate(-1)}
                        >
                            Go Back
                        </Button>
                        <Button 
                            variant="primary" 
                            leftIcon={<Home className="h-4 w-4" />}
                            onClick={() => navigate('/')}
                        >
                            Back Home
                        </Button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
