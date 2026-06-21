import React, { useState, useEffect } from 'react';
import { Search, Eye, Download, AlertTriangle } from 'lucide-react';
import { adminApi } from '@/services/api/admin';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Loader } from '@/components/common/Loader';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Session } from '@/types/test.types';

export const ManageCandidates: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [searchTerm, filterStatus, sessions]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.listSessions(0, 100);
      setSessions(response.sessions);
      setFilteredSessions(response.sessions);
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const filterSessions = () => {
    let filtered = sessions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (session) =>
          session.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          session.candidate_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          session.session_token.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((session) => session.status === filterStatus);
    }

    setFilteredSessions(filtered);
  };

  const handleViewReport = (sessionId: number) => {
    navigate(`/admin/reports/${sessionId}`);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      created: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      terminated: 'bg-orange-100 text-orange-700',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.created}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getRiskBadge = (risk: string | null) => {
    if (!risk) return null;

    const styles = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[risk as keyof typeof styles]}`}>
        {risk} risk
      </span>
    );
  };

  if (isLoading) {
    return <Loader fullScreen text="Loading candidates..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manage Candidates</h1>
        <p className="text-gray-600 mt-1">View and manage candidate test sessions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Search by name, email, or session ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-5 w-5 text-gray-400" />}
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Statuses</option>
            <option value="created">Created</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredSessions.length} of {sessions.length} sessions
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {session.candidate_name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">{session.candidate_email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{session.test_name}</div>
                    <div className="text-xs text-gray-500">
                      {session.role_being_tested || 'Not specified'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(session.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {session.total_score ? `${parseFloat(session.total_score).toFixed(1)}%` : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getRiskBadge(session.cheating_risk_level)}
                      {session.has_suspicious_activity === 'true' && (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(session.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="px-2 py-1 bg-gray-100 rounded text-primary-700 font-mono text-sm font-bold">
                      {session.access_code || session.session_token.substring(0, 8).toUpperCase()}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      {session.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewReport(session.id)}
                          leftIcon={<Eye className="h-4 w-4" />}
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSessions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No sessions found</p>
          </div>
        )}
      </div>
    </div>
  );
};