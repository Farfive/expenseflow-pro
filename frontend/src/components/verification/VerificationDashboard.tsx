'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Search,
  Filter,
  Download,
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface DocumentQueueItem {
  id: string;
  fileName: string;
  documentType: 'receipt' | 'invoice' | 'bank_statement' | 'other';
  uploadedAt: string;
  qualityScore: number;
  status: 'pending' | 'in_review' | 'completed' | 'rejected';
  confidence: number;
  extractedFields: number;
  completedFields: number;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high';
  fileUrl: string;
}

interface QueueStats {
  total: number;
  pending: number;
  inReview: number;
  completed: number;
  rejected: number;
  averageQuality: number;
  processingTime: number;
}

interface VerificationDashboardProps {
  companyId: string;
}

export default function VerificationDashboard({ companyId }: VerificationDashboardProps) {
  const [documents, setDocuments] = useState<DocumentQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    inReview: 0,
    completed: 0,
    rejected: 0,
    averageQuality: 0,
    processingTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('uploadedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const router = useRouter();

  useEffect(() => {
    fetchVerificationQueue();
  }, [companyId, statusFilter, typeFilter, sortBy, sortOrder]);

  const fetchVerificationQueue = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        status: statusFilter !== 'all' ? statusFilter : '',
        documentType: typeFilter !== 'all' ? typeFilter : '',
        sortBy,
        sortOrder,
        search: searchTerm
      });

      const response = await fetch(`/api/verification/queue?${params}`);
      if (!response.ok) throw new Error('Failed to fetch verification queue');
      
      const data = await response.json();
      setDocuments(data.documents);
      setStats(data.stats);
      
    } catch (error) {
      console.error('Error fetching verification queue:', error);
      toast.error('Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = (documentId: string) => {
    router.push(`/dashboard/verification/${documentId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'in_review': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.documentType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.documentType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Verification</h1>
          <p className="text-gray-600">Review and verify extracted document data</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/verification/templates')}>
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Quality</p>
                <p className={`text-2xl font-bold ${getQualityColor(stats.averageQuality)}`}>
                  {stats.averageQuality}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_review">In Review</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="receipt">Receipts</option>
                <option value="invoice">Invoices</option>
                <option value="bank_statement">Bank Statements</option>
                <option value="other">Other</option>
              </select>
              
              <select
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('_');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="uploadedAt_desc">Newest First</option>
                <option value="uploadedAt_asc">Oldest First</option>
                <option value="qualityScore_desc">Quality (High)</option>
                <option value="qualityScore_asc">Quality (Low)</option>
                <option value="priority_desc">Priority (High)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Documents Queue ({filteredDocuments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={`border rounded-lg p-4 transition-all hover:shadow-md ${getPriorityColor(doc.priority)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium">{doc.fileName}</h3>
                        <Badge variant="outline">{doc.documentType}</Badge>
                        <Badge className={`text-white ${getStatusColor(doc.status)}`}>
                          {doc.status.replace('_', ' ')}
                        </Badge>
                        {doc.priority === 'high' && (
                          <Badge variant="destructive">High Priority</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Quality Score:</span>
                          <span className={`ml-1 font-bold ${getQualityColor(doc.qualityScore)}`}>
                            {doc.qualityScore}%
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Confidence:</span>
                          <span className="ml-1">{Math.round(doc.confidence * 100)}%</span>
                        </div>
                        <div>
                          <span className="font-medium">Fields:</span>
                          <span className="ml-1">{doc.completedFields}/{doc.extractedFields}</span>
                        </div>
                        <div>
                          <span className="font-medium">Uploaded:</span>
                          <span className="ml-1">
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      {doc.assignedTo && (
                        <div className="mt-2 flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-1" />
                          Assigned to: {doc.assignedTo}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.fileUrl, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleVerifyDocument(doc.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                  
                  {/* Progress bar for completion */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Completion Progress</span>
                      <span>{Math.round((doc.completedFields / doc.extractedFields) * 100)}%</span>
                    </div>
                    <Progress 
                      value={(doc.completedFields / doc.extractedFields) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Processing Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Documents Today</span>
                <span className="font-bold">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Avg Processing Time</span>
                <span className="font-bold">{stats.processingTime}min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto-Extraction Rate</span>
                <span className="font-bold text-green-600">87%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Review Required</span>
                <span className="font-bold text-yellow-600">13%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Common Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Low Quality Images</span>
                <Badge variant="outline">8 docs</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Missing Required Fields</span>
                <Badge variant="outline">5 docs</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Vendor Not Recognized</span>
                <Badge variant="outline">3 docs</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Date Format Issues</span>
                <Badge variant="outline">2 docs</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 