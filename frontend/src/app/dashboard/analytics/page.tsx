'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  PieChart,
  Activity,
  Target,
  AlertCircle,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalExpenses: number;
    totalAmount: number;
    averageExpense: number;
    monthlyGrowth: number;
    pendingApprovals: number;
    topCategory: string;
  };
  monthlyTrends: {
    month: string;
    amount: number;
    count: number;
    growth: number;
  }[];
  categoryBreakdown: {
    category: string;
    amount: number;
    percentage: number;
    count: number;
    color: string;
  }[];
  departmentSpending: {
    department: string;
    amount: number;
    budget: number;
    utilization: number;
    employees: number;
  }[];
  topSpenders: {
    name: string;
    amount: number;
    expenses: number;
    department: string;
  }[];
  insights: {
    id: string;
    type: 'warning' | 'info' | 'success';
    title: string;
    description: string;
    action?: string;
  }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('last_30_days');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, selectedDepartment]);

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch(`http://localhost:4001/api/analytics?timeRange=${timeRange}&department=${selectedDepartment}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Mock data for demo
      setData({
        overview: {
          totalExpenses: 1247,
          totalAmount: 125430.50,
          averageExpense: 100.58,
          monthlyGrowth: 12.5,
          pendingApprovals: 23,
          topCategory: 'Travel & Transportation'
        },
        monthlyTrends: [
          { month: 'Oct 2023', amount: 98500, count: 890, growth: 8.2 },
          { month: 'Nov 2023', amount: 105200, count: 945, growth: 6.8 },
          { month: 'Dec 2023', amount: 118300, count: 1120, growth: 12.4 },
          { month: 'Jan 2024', amount: 125430, count: 1247, growth: 6.0 }
        ],
        categoryBreakdown: [
          { category: 'Travel & Transportation', amount: 45200, percentage: 36, count: 234, color: '#3B82F6' },
          { category: 'Meals & Entertainment', amount: 28500, percentage: 23, count: 456, color: '#10B981' },
          { category: 'Office Supplies', amount: 18700, percentage: 15, count: 189, color: '#F59E0B' },
          { category: 'Marketing & Advertising', amount: 15800, percentage: 13, count: 67, color: '#EF4444' },
          { category: 'Training & Education', amount: 10200, percentage: 8, count: 45, color: '#8B5CF6' },
          { category: 'Other', amount: 7030, percentage: 5, count: 256, color: '#6B7280' }
        ],
        departmentSpending: [
          { department: 'Sales', amount: 45600, budget: 50000, utilization: 91.2, employees: 12 },
          { department: 'Marketing', amount: 32400, budget: 40000, utilization: 81.0, employees: 8 },
          { department: 'Engineering', amount: 28900, budget: 35000, utilization: 82.6, employees: 15 },
          { department: 'Finance', amount: 12300, budget: 15000, utilization: 82.0, employees: 5 },
          { department: 'HR', amount: 6230, budget: 10000, utilization: 62.3, employees: 3 }
        ],
        topSpenders: [
          { name: 'John Doe', amount: 8450, expenses: 23, department: 'Sales' },
          { name: 'Jane Smith', amount: 7200, expenses: 18, department: 'Marketing' },
          { name: 'Mike Johnson', amount: 6800, expenses: 15, department: 'Engineering' },
          { name: 'Sarah Wilson', amount: 5900, expenses: 12, department: 'Sales' },
          { name: 'Tom Brown', amount: 5200, expenses: 14, department: 'Marketing' }
        ],
        insights: [
          {
            id: '1',
            type: 'warning',
            title: 'Budget Alert: Sales Department',
            description: 'Sales department has used 91% of their monthly budget with 5 days remaining.',
            action: 'Review pending expenses'
          },
          {
            id: '2',
            type: 'info',
            title: 'Travel Expenses Trending Up',
            description: 'Travel expenses increased by 15% compared to last month.',
            action: 'View travel report'
          },
          {
            id: '3',
            type: 'success',
            title: 'Approval Efficiency Improved',
            description: 'Average approval time decreased to 2.1 hours this month.',
            action: 'View workflow metrics'
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(amount);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'success': return <TrendingUp className="w-5 h-5 text-green-600" />;
      default: return <Activity className="w-5 h-5 text-blue-600" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'success': return 'border-green-200 bg-green-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-600">Unable to load analytics data</p>
        </div>
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
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Insights and trends for expense management</p>
            </div>
            <div className="flex space-x-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7_days">Last 7 days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 days</SelectItem>
                  <SelectItem value="last_90_days">Last 90 days</SelectItem>
                  <SelectItem value="last_year">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => fetchAnalyticsData()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">{data.overview.totalExpenses}</p>
                    <p className="text-sm text-green-600 flex items-center mt-1">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      +{data.overview.monthlyGrowth}% from last month
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(data.overview.totalAmount)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Avg: {formatCurrency(data.overview.averageExpense)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                    <p className="text-2xl font-bold text-gray-900">{data.overview.pendingApprovals}</p>
                    <p className="text-sm text-yellow-600 mt-1">
                      Requires attention
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Top Category</p>
                    <p className="text-2xl font-bold text-gray-900">{data.overview.topCategory}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Most expenses
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Monthly Trends
                </CardTitle>
                <CardDescription>Expense amounts and counts over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.monthlyTrends.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{trend.month}</p>
                        <p className="text-sm text-gray-600">{trend.count} expenses</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(trend.amount)}</p>
                        <p className={`text-sm flex items-center ${trend.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trend.growth >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                          {Math.abs(trend.growth)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  Category Breakdown
                </CardTitle>
                <CardDescription>Expenses by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.categoryBreakdown.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <div>
                          <p className="font-medium">{category.category}</p>
                          <p className="text-sm text-gray-600">{category.count} expenses</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(category.amount)}</p>
                        <p className="text-sm text-gray-600">{category.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Spending */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Department Spending
              </CardTitle>
              <CardDescription>Budget utilization by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.departmentSpending.map((dept, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{dept.department}</h4>
                        <p className="text-sm text-gray-600">{dept.employees} employees</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(dept.amount)}</p>
                        <p className="text-sm text-gray-600">of {formatCurrency(dept.budget)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${dept.utilization > 90 ? 'bg-red-500' : dept.utilization > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(dept.utilization, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-sm text-gray-600">{dept.utilization.toFixed(1)}% utilized</span>
                      <Badge variant={dept.utilization > 90 ? 'destructive' : dept.utilization > 75 ? 'secondary' : 'default'}>
                        {dept.utilization > 90 ? 'Over Budget' : dept.utilization > 75 ? 'High Usage' : 'On Track'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Spenders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Top Spenders
                </CardTitle>
                <CardDescription>Employees with highest expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topSpenders.map((spender, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{spender.name}</p>
                        <p className="text-sm text-gray-600">{spender.department} • {spender.expenses} expenses</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(spender.amount)}</p>
                        <Badge variant="outline">#{index + 1}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Key Insights
                </CardTitle>
                <CardDescription>Important observations and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.insights.map((insight) => (
                    <div key={insight.id} className={`p-4 border rounded-lg ${getInsightColor(insight.type)}`}>
                      <div className="flex items-start space-x-3">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{insight.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                          {insight.action && (
                            <Button variant="link" className="p-0 h-auto mt-2 text-sm">
                              {insight.action} →
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 