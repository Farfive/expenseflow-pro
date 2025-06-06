'use client';

/**
 * Transaction Matching Dashboard
 * 
 * Main dashboard for intelligent transaction matching system with
 * review interface, statistics, and reconciliation features.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  PlayCircle,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  RefreshCw,
  AlertTriangle,
  Target,
  Zap,
  BarChart3,
} from 'lucide-react';

interface MatchingStatistics {
  autoReconciliationRate: number;
  totalReconciliationRate: number;
  averageConfidence: number;
  amountReconciliationRate: number;
  totalMatches: number;
  approvedMatches: number;
  rejectedMatches: number;
  pendingMatches: number;
  unmatchedTransactions: number;
  unmatchedExpenses: number;
}

interface PendingMatch {
  id: string;
  transaction: {
    id: string;
    date: string;
    amount: number;
    description: string;
    merchant?: string;
  };
  expense: {
    id: string;
    transactionDate: string;
    amount: number;
    title: string;
    merchantName?: string;
  };
  confidenceScore: number;
  matchStrategy: string;
  amountScore: number;
  dateScore: number;
  vendorScore: number;
  status: string;
  createdAt: string;
}

const MatchingDashboard: React.FC = () => {
  const [statistics, setStatistics] = useState<MatchingStatistics | null>(null);
  const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningMatch, setRunningMatch] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<PendingMatch | null>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [userConfidence, setUserConfidence] = useState<number>(0.8);
  const { toast } = useToast();

  // Chart colors
  const chartColors = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    secondary: '#6b7280'
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get company ID from context/props
      const companyId = 'company-id-placeholder'; // Replace with actual company ID
      
      const [statsResponse, matchesResponse] = await Promise.all([
        fetch(`/api/transaction-matching/statistics?companyId=${companyId}`),
        fetch(`/api/transaction-matching/pending-reviews?companyId=${companyId}&limit=50`)
      ]);

      if (statsResponse.ok && matchesResponse.ok) {
        const statsData = await statsResponse.json();
        const matchesData = await matchesResponse.json();
        
        setStatistics(statsData.data);
        setPendingMatches(matchesData.data);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const runMatching = async () => {
    try {
      setRunningMatch(true);
      
      const response = await fetch('/api/transaction-matching/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: 'company-id-placeholder', // Replace with actual company ID
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: 'Success',
          description: `Matching completed! Found ${result.data.matches.length} new matches.`,
        });
        
        // Reload dashboard data
        await loadDashboardData();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to run transaction matching',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error running matching:', error);
      toast({
        title: 'Error',
        description: 'Failed to run transaction matching',
        variant: 'destructive',
      });
    } finally {
      setRunningMatch(false);
    }
  };

  const approveMatch = async (matchId: string) => {
    try {
      const response = await fetch('/api/transaction-matching/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId,
          userConfidence,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Match approved successfully',
        });
        
        // Remove from pending matches
        setPendingMatches(prev => prev.filter(match => match.id !== matchId));
        setReviewDialog(false);
        setSelectedMatch(null);
        
        // Reload statistics
        await loadDashboardData();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to approve match',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error approving match:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve match',
        variant: 'destructive',
      });
    }
  };

  const rejectMatch = async (matchId: string) => {
    try {
      const response = await fetch('/api/transaction-matching/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId,
          reason: rejectionReason,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Match rejected successfully',
        });
        
        // Remove from pending matches
        setPendingMatches(prev => prev.filter(match => match.id !== matchId));
        setReviewDialog(false);
        setSelectedMatch(null);
        setRejectionReason('');
        
        // Reload statistics
        await loadDashboardData();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to reject match',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error rejecting match:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject match',
        variant: 'destructive',
      });
    }
  };

  const generateReport = async () => {
    try {
      const response = await fetch('/api/transaction-matching/reconciliation-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: 'company-id-placeholder', // Replace with actual company ID
          reportType: 'MONTHLY',
          format: 'EXCEL',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: 'Success',
          description: 'Reconciliation report generated successfully',
        });
        
        // Download report if file path is provided
        if (result.data.reportPath) {
          window.open(`/api/files/download?path=${result.data.reportPath}`, '_blank');
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to generate report',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: 'secondary', label: 'Pending' },
      MANUAL_REVIEW: { variant: 'warning', label: 'Review Required' },
      APPROVED: { variant: 'success', label: 'Approved' },
      REJECTED: { variant: 'destructive', label: 'Rejected' },
      AUTO_APPROVED: { variant: 'success', label: 'Auto-Approved' },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const chartData = statistics ? [
    { name: 'Auto-Matched', value: statistics.autoReconciliationRate, color: chartColors.success },
    { name: 'Manual Review', value: 100 - statistics.autoReconciliationRate, color: chartColors.warning },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Transaction Matching</h1>
          <p className="text-gray-600">Intelligent reconciliation dashboard</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={runMatching} disabled={runningMatch}>
            <PlayCircle className="h-4 w-4 mr-2" />
            {runningMatch ? 'Running...' : 'Run Matching'}
          </Button>
          <Button onClick={generateReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto-Reconciliation Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.autoReconciliationRate.toFixed(1)}%</div>
              <Progress value={statistics.autoReconciliationRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Target: 85%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Confidence</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(statistics.averageConfidence * 100).toFixed(1)}%</div>
              <Progress value={statistics.averageConfidence * 100} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                ML prediction accuracy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.pendingMatches}</div>
              <p className="text-xs text-muted-foreground">
                Require manual review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unmatched Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.unmatchedTransactions + statistics.unmatchedExpenses}
              </div>
              <p className="text-xs text-muted-foreground">
                {statistics.unmatchedTransactions} transactions, {statistics.unmatchedExpenses} expenses
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Reviews ({pendingMatches.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="unmatched">Unmatched Items</TabsTrigger>
        </TabsList>

        {/* Pending Reviews Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Match Reviews</CardTitle>
              <CardDescription>
                Matches requiring manual review and approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingMatches.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">All caught up!</h3>
                  <p className="text-gray-600">No pending matches require review.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Expense</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingMatches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              ${Math.abs(match.transaction.amount).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {match.transaction.description}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(match.transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              ${Math.abs(match.expense.amount).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {match.expense.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {match.expense.merchantName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${getConfidenceColor(match.confidenceScore)}`}>
                            {(match.confidenceScore * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            A:{(match.amountScore * 100).toFixed(0)}% 
                            D:{(match.dateScore * 100).toFixed(0)}% 
                            V:{(match.vendorScore * 100).toFixed(0)}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {match.matchStrategy}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(match.status)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMatch(match);
                              setReviewDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {statistics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Reconciliation Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Match Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Approved</span>
                      <span className="font-medium">{statistics.approvedMatches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending</span>
                      <span className="font-medium">{statistics.pendingMatches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rejected</span>
                      <span className="font-medium">{statistics.rejectedMatches}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Unmatched Items Tab */}
        <TabsContent value="unmatched" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Unmatched Transactions</CardTitle>
                <CardDescription>
                  Bank transactions without matching expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {statistics?.unmatchedTransactions || 0} unmatched transactions
                </p>
                {/* Add table or list of unmatched transactions */}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Unmatched Expenses</CardTitle>
                <CardDescription>
                  Expense records without matching transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {statistics?.unmatchedExpenses || 0} unmatched expenses
                </p>
                {/* Add table or list of unmatched expenses */}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Review Transaction Match</DialogTitle>
            <DialogDescription>
              Verify this proposed match and provide feedback
            </DialogDescription>
          </DialogHeader>
          
          {selectedMatch && (
            <div className="grid grid-cols-2 gap-6">
              {/* Transaction Details */}
              <div className="space-y-4">
                <h3 className="font-semibold">Bank Transaction</h3>
                <div className="space-y-2">
                  <div>
                    <Label>Amount</Label>
                    <div className="font-medium text-lg">
                      ${Math.abs(selectedMatch.transaction.amount).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <div>{new Date(selectedMatch.transaction.date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <div>{selectedMatch.transaction.description}</div>
                  </div>
                  {selectedMatch.transaction.merchant && (
                    <div>
                      <Label>Merchant</Label>
                      <div>{selectedMatch.transaction.merchant}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expense Details */}
              <div className="space-y-4">
                <h3 className="font-semibold">Expense Record</h3>
                <div className="space-y-2">
                  <div>
                    <Label>Amount</Label>
                    <div className="font-medium text-lg">
                      ${Math.abs(selectedMatch.expense.amount).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <div>{new Date(selectedMatch.expense.transactionDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <div>{selectedMatch.expense.title}</div>
                  </div>
                  {selectedMatch.expense.merchantName && (
                    <div>
                      <Label>Merchant</Label>
                      <div>{selectedMatch.expense.merchantName}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Match Scores */}
              <div className="col-span-2 space-y-4">
                <h3 className="font-semibold">Match Analysis</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Overall Confidence</Label>
                    <div className={`text-lg font-medium ${getConfidenceColor(selectedMatch.confidenceScore)}`}>
                      {(selectedMatch.confidenceScore * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <Label>Amount Score</Label>
                    <div className={`font-medium ${getConfidenceColor(selectedMatch.amountScore)}`}>
                      {(selectedMatch.amountScore * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <Label>Date Score</Label>
                    <div className={`font-medium ${getConfidenceColor(selectedMatch.dateScore)}`}>
                      {(selectedMatch.dateScore * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <Label>Vendor Score</Label>
                    <div className={`font-medium ${getConfidenceColor(selectedMatch.vendorScore)}`}>
                      {(selectedMatch.vendorScore * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Your Confidence (Optional)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={userConfidence}
                      onChange={(e) => setUserConfidence(parseFloat(e.target.value))}
                      placeholder="0.8"
                    />
                  </div>

                  <div>
                    <Label>Rejection Reason (if rejecting)</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a reason if rejecting this match..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedMatch && rejectMatch(selectedMatch.id)}
              disabled={!rejectionReason}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => selectedMatch && approveMatch(selectedMatch.id)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchingDashboard; 