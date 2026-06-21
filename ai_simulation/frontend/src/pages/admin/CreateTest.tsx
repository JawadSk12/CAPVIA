import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, 
    ArrowRight, 
    ArrowLeft, 
    Mail, 
    User, 
    Briefcase, 
    Globe, 
    Code,
    Sparkles,
    CheckCircle
} from 'lucide-react';
import { adminApi } from '@/services/api/admin';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { toast } from 'react-hot-toast';

export const CreateTest: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        candidate_name: '',
        candidate_email: '',
        role: 'Full Stack Developer',
        domain: 'E-commerce',
        language: 'python'
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const session = await adminApi.generateTestSession(formData);
            toast.success('Test session generated successfully!');
            navigate(`/admin/dashboard`);
        } catch (error) {
            toast.error('Failed to generate test session');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-10 px-6">
            {/* Stepper */}
            <div className="flex items-center justify-between mb-12">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center group">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold transition-all ${
                            step === s ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 
                            step > s ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                        }`}>
                            {step > s ? <CheckCircle className="h-6 w-6" /> : s}
                        </div>
                        {s < 3 && (
                            <div className={`w-20 md:w-32 h-1 mx-2 rounded ${step > s ? 'bg-green-500' : 'bg-gray-100'}`}></div>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-8 md:p-12 overflow-hidden relative">
                {/* Decoration */}
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Plus className="h-32 w-32" />
                </div>

                {step === 1 && (
                    <motion_div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Candidate Info</h2>
                        <p className="text-gray-500 mb-8">Tell us who will be taking the assessment.</p>
                        
                        <div className="space-y-6">
                            <Input 
                                label="Full Name"
                                placeholder="e.g. John Doe"
                                value={formData.candidate_name}
                                onChange={(e) => handleInputChange('candidate_name', e.target.value)}
                                leftIcon={<User className="h-5 w-5 text-gray-400" />}
                            />
                            <Input 
                                label="Email Address"
                                type="email"
                                placeholder="john@example.com"
                                value={formData.candidate_email}
                                onChange={(e) => handleInputChange('candidate_email', e.target.value)}
                                leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
                            />
                        </div>

                        <div className="mt-10 flex justify-end">
                            <Button 
                                variant="primary" 
                                size="lg" 
                                disabled={!formData.candidate_name || !formData.candidate_email}
                                onClick={handleNext}
                                rightIcon={<ArrowRight className="h-5 w-5" />}
                            >
                                Next Step
                            </Button>
                        </div>
                    </motion_div>
                )}

                {step === 2 && (
                    <motion_div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Assessment Context</h2>
                        <p className="text-gray-500 mb-8">Define the technical focus for this simulation.</p>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1">Target Role</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {['Full Stack Developer', 'Backend Engineer', 'Frontend Developer', 'Data Engineer'].map(r => (
                                        <button 
                                            key={r}
                                            onClick={() => handleInputChange('role', r)}
                                            className={`p-4 text-left rounded-xl border-2 transition-all ${
                                                formData.role === r ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-50 bg-gray-50 text-gray-600 hover:border-gray-200'
                                            }`}
                                        >
                                            <div className="font-bold">{r}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Input 
                                label="Specific Domain"
                                placeholder="e.g. FinTech, E-commerce, AI"
                                value={formData.domain}
                                onChange={(e) => handleInputChange('domain', e.target.value)}
                                leftIcon={<Globe className="h-5 w-5 text-gray-400" />}
                            />
                        </div>

                        <div className="mt-10 flex justify-between">
                            <Button variant="ghost" size="lg" onClick={handleBack} leftIcon={<ArrowLeft className="h-5 w-5" />}>Back</Button>
                            <Button variant="primary" size="lg" onClick={handleNext} rightIcon={<ArrowRight className="h-5 w-5" />}>Next Step</Button>
                        </div>
                    </motion_div>
                )}

                {step === 3 && (
                    <motion_div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Final Touches</h2>
                        <p className="text-gray-500 mb-8">Choose the primary programming language.</p>
                        
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                {['python', 'javascript', 'java'].map(lang => (
                                    <button 
                                        key={lang}
                                        onClick={() => handleInputChange('language', lang)}
                                        className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3 ${
                                            formData.language === lang ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-50 bg-gray-50 text-gray-600 hover:border-gray-200'
                                        }`}
                                    >
                                        <Code className="h-8 w-8" />
                                        <span className="font-bold capitalize">{lang}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 mt-8">
                                <div className="flex gap-4">
                                    <Sparkles className="h-6 w-6 text-blue-600 shrink-0" />
                                    <p className="text-sm text-blue-800 leading-relaxed">
                                        Our AI will generate a unique 5-module assessment tailored for a <strong>{formData.role}</strong> specializing in <strong>{formData.domain}</strong> using <strong>{formData.language}</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 flex justify-between">
                            <Button variant="ghost" size="lg" onClick={handleBack} leftIcon={<ArrowLeft className="h-5 w-5" />}>Back</Button>
                            <Button 
                                variant="primary" 
                                size="lg" 
                                isLoading={isSubmitting}
                                onClick={handleSubmit}
                                rightIcon={<Plus className="h-5 w-5" />}
                            >
                                Generate Test
                            </Button>
                        </div>
                    </motion_div>
                )}
            </div>
        </div>
    );
};

// Simple motion shim since I can't use real motion tag easily in text replacement without import
const motion_div: React.FC<{children: React.ReactNode, initial: any, animate: any}> = ({children}) => <div>{children}</div>;
