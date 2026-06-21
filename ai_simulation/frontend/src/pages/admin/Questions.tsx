import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Filter, 
    Code, 
    FileText, 
    Brain, 
    Bug, 
    Settings,
    ChevronDown,
    MoreVertical,
    Sparkles
} from 'lucide-react';
import { adminApi } from '@/services/api/admin';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Loader } from '@/components/common/Loader';
import { toast } from 'react-hot-toast';
import { Question, QuestionType } from '@/types/test.types';

export const Questions: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<string>('all');

    useEffect(() => {
        loadQuestions();
    }, []);

    const loadQuestions = async () => {
        setIsLoading(true);
        try {
            const response = await adminApi.listQuestions(0, 100);
            setQuestions(response.questions);
        } catch (error) {
            toast.error('Failed to load questions');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAI = async () => {
        const confirmed = window.confirm('Generate a new random set of technical questions using AI?');
        if (!confirmed) return;

        toast.promise(
            adminApi.generateQuestion({
                question_type: QuestionType.CODING,
                role: 'Backend Developer',
                domain: 'Algorithms',
                language: 'python'
            }),
            {
                loading: 'AI is generating a complex task...',
                success: () => {
                    loadQuestions();
                    return 'Question generated successfully!';
                },
                error: 'Generation failed'
            }
        );
    };

    const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             q.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedType === 'all' || q.question_type === selectedType;
        return matchesSearch && matchesType;
    });

    const getTypeIcon = (type: string) => {
        switch (type) {
            case QuestionType.CODING: return <Code className="h-4 w-4" />;
            case QuestionType.DEBUGGING: return <Bug className="h-4 w-4" />;
            case QuestionType.PROBLEM_UNDERSTANDING: return <FileText className="h-4 w-4" />;
            case QuestionType.DECISION_MAKING: return <Brain className="h-4 w-4" />;
            default: return <Settings className="h-4 w-4" />;
        }
    };

    if (isLoading) return <Loader fullScreen text="Loading Question Bank..." />;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
                    <p className="text-gray-500 mt-1">Manage and create technical assessment tasks across all 5 modules.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" leftIcon={<Sparkles className="h-4 w-4" />} onClick={handleGenerateAI}>AI Generate</Button>
                    <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>Manual Create</Button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Input 
                        placeholder="Search questions by title or content..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        leftIcon={<Search className="h-5 w-5 text-gray-400" />}
                    />
                </div>
                <div className="flex gap-4">
                    <select 
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500 min-w-[180px]"
                    >
                        <option value="all">All Task Types</option>
                        <option value={QuestionType.PROBLEM_UNDERSTANDING}>Problem Understanding</option>
                        <option value={QuestionType.CODING}>Execution (Coding)</option>
                        <option value={QuestionType.DECISION_MAKING}>Decision Making</option>
                        <option value={QuestionType.EXPLANATION}>Explanation</option>
                        <option value={QuestionType.DEBUGGING}>Debugging</option>
                    </select>
                </div>
            </div>

            {/* Questions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredQuestions.map(question => (
                    <div key={question.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-2 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
                                question.question_type === QuestionType.CODING ? 'bg-blue-50 text-blue-600' :
                                question.question_type === QuestionType.DEBUGGING ? 'bg-red-50 text-red-600' :
                                'bg-purple-50 text-purple-600'
                            }`}>
                                {getTypeIcon(question.question_type)}
                                {question.question_type.replace('_', ' ')}
                            </div>
                            <button className="text-gray-400 hover:text-gray-600">
                                <MoreVertical className="h-5 w-5" />
                            </button>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">{question.title}</h3>
                        <p className="text-gray-500 text-sm line-clamp-3 mb-6 flex-1">
                            {question.description}
                        </p>
                        <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                            <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
                                <span className="flex items-center gap-1"><Brain className="h-3 w-3" /> {question.difficulty}</span>
                                {question.language && <span className="flex items-center gap-1 uppercase"><Code className="h-3 w-3" /> {question.language}</span>}
                            </div>
                            <Button variant="ghost" size="sm">Edit Task</Button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredQuestions.length === 0 && (
                <div className="text-center py-20">
                    <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No questions found</h3>
                    <p className="text-gray-500 mt-2">Try adjusting your filters or generate new ones using AI.</p>
                </div>
            )}
        </div>
    );
};
