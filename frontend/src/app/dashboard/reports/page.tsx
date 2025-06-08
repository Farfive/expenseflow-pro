'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  PieChart,
  BarChart3,
  Filter,
  Search,
  RefreshCw,
  Eye,
  Share,
  Settings
} from 'lucide-react';

interface ReportData {
  id: string;
  name: string;
  type: string;
  description: string;
  dateRange: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
  lastGenerated: string;
  format: string;
}

interface ReportStats {
  totalReports: number;
  monthlyExpenses: number;
  pendingReports: number;
  averageAmount: number;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('http://localhost:4001/api/reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      // Mock data for demo
      setReports([
        {
          id: '1',
          name: 'Monthly Expense Report - December 2024',
          type: 'monthly',
          description: 'Comprehensive monthly expense breakdown',
          dateRange: '2024-12-01 to 2024-12-31',
          totalAmount: 15420.50,
          currency: 'PLN',
          status: 'completed',
          createdAt: '2024-12-01T10:00:00Z',
          lastGenerated: '2024-12-31T23:59:00Z',
          format: 'PDF'
        },
        {
          id: '2',
          name: 'Quarterly Business Travel Report - Q4 2024',
          type: 'quarterly',
          description: 'Travel expenses for Q4 2024',
          dateRange: '2024-10-01 to 2024-12-31',
          totalAmount: 8750.25,
          currency: 'PLN',
          status: 'completed',
          createdAt: '2024-10-01T09:00:00Z',
          lastGenerated: '2024-12-31T18:30:00Z',
          format: 'Excel'
        },
        {
          id: '3',
          name: 'Department Expense Summary - Finance',
          type: 'department',
          description: 'Finance department expense analysis',
          dateRange: '2024-01-01 to 2024-12-31',
          totalAmount: 45230.75,
          currency: 'PLN',
          status: 'generating',
          createdAt: '2024-01-01T08:00:00Z',
          lastGenerated: '2024-12-15T14:20:00Z',
          format: 'PDF'
        },
        {
          id: '4',
          name: 'Tax Deduction Report - 2024',
          type: 'tax',
          description: 'VAT and tax deductible expenses',
          dateRange: '2024-01-01 to 2024-12-31',
          totalAmount: 12890.40,
          currency: 'PLN',
          status: 'pending',
          createdAt: '2024-01-01T07:00:00Z',
          lastGenerated: '2024-11-30T16:45:00Z',
          format: 'CSV'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:4001/api/reports/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Mock data for demo
      setStats({
        totalReports: 24,
        monthlyExpenses: 15420.50,
        pendingReports: 3,
        averageAmount: 8750.25
      });
    }
  };

  const generateReport = async (reportId: string) => {
    setGenerating(reportId);
    try {
      const response = await fetch(`http://localhost:4001/api/reports/${reportId}/generate`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Report Generated",
          description: "The report has been successfully generated.",
        });
        fetchReports();
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(null);
    }
  };

  const downloadReport = async (reportId: string, format: string) => {
    try {
      const response = await fetch(`http://localhost:4001/api/reports/${reportId}/download?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.${format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Download Started",
          description: "Your report download has started.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || report.type === filterType;
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'monthly': return <Calendar className="w-4 h-4" />;
      case 'quarterly': return <BarChart3 className="w-4 h-4" />;
      case 'department': return <PieChart className="w-4 h-4" />;
      case 'tax': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
              <p className="text-gray-600 mt-1">Generate and manage expense reports</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => fetchReports()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                New Report
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Reports</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalReports}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.monthlyExpenses.toLocaleString()} PLN
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Reports</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.pendingReports}</p>
                    </div>
                    <RefreshCw className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Average Amount</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.averageAmount.toLocaleString()} PLN
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search reports..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Report Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="tax">Tax</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="generating">Generating</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reports List */}
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {getTypeIcon(report.type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {report.name}
                          </h3>
                          <p className="text-gray-600 mb-2">{report.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{report.dateRange}</span>
                            <span>•</span>
                            <span>{report.totalAmount.toLocaleString()} {report.currency}</span>
                            <span>•</span>
                            <span>Format: {report.format}</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge className={getStatusColor(report.status)}>
                              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {report.status === 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadReport(report.id, report.format)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Share className="w-4 h-4 mr-1" />
                              Share
                            </Button>
                          </>
                        )}
                        {(report.status === 'pending' || report.status === 'failed') && (
                          <Button
                            size="sm"
                            onClick={() => generateReport(report.id)}
                            disabled={generating === report.id}
                          >
                            {generating === report.id ? (
                              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <FileText className="w-4 h-4 mr-1" />
                            )}
                            {generating === report.id ? 'Generating...' : 'Generate'}
                          </Button>
                        )}
                        {report.status === 'generating' && (
                          <div className="flex items-center space-x-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                            <span className="text-sm text-blue-600">Generating...</span>
                          </div>
                        )}
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredReports.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Create your first report to get started'}
                </p>
                <Button>
                  <FileText className="w-4 h-4 mr-2" />
                  Create New Report
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
} 