'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
  Workflow, 
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  DollarSign,
  ArrowRight,
  Play,
  Pause
} from 'lucide-react';

interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions: {
    type: 'amount' | 'category' | 'user' | 'department';
    operator: 'greater_than' | 'less_than' | 'equals' | 'contains';
    value: string | number;
  }[];
  actions: {
    type: 'require_approval' | 'auto_approve' | 'notify' | 'assign_to';
    target?: string;
    level?: number;
  }[];
  approvers: {
    id: string;
    name: string;
    email: string;
    role: string;
    level: number;
  }[];
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  lastUsed?: string;
}

interface WorkflowStats {
  total: number;
  active: number;
  inactive: number;
  totalApprovals: number;
  pendingApprovals: number;
  averageApprovalTime: number;
}

export default function WorkflowsPage() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowRule | null>(null);

  useEffect(() => {
    fetchWorkflows();
    fetchStats();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('http://localhost:4001/api/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
      // Mock data for demo
      setWorkflows([
        {
          id: '1',
          name: 'High Value Expense Approval',
          description: 'Requires manager approval for expenses over 1000 PLN',
          isActive: true,
          priority: 1,
          conditions: [
            {
              type: 'amount',
              operator: 'greater_than',
              value: 1000
            }
          ],
          actions: [
            {
              type: 'require_approval',
              level: 1
            }
          ],
          approvers: [
            {
              id: '1',
              name: 'John Manager',
              email: 'john.manager@company.com',
              role: 'Manager',
              level: 1
            }
          ],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          usageCount: 45,
          lastUsed: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          name: 'Travel Expense Auto-Approval',
          description: 'Auto-approve travel expenses under 500 PLN with receipt',
          isActive: true,
          priority: 2,
          conditions: [
            {
              type: 'category',
              operator: 'equals',
              value: 'Travel & Transportation'
            },
            {
              type: 'amount',
              operator: 'less_than',
              value: 500
            }
          ],
          actions: [
            {
              type: 'auto_approve'
            }
          ],
          approvers: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          usageCount: 128,
          lastUsed: '2024-01-15T14:20:00Z'
        },
        {
          id: '3',
          name: 'Department Head Approval',
          description: 'Department head approval for expenses over 2000 PLN',
          isActive: true,
          priority: 3,
          conditions: [
            {
              type: 'amount',
              operator: 'greater_than',
              value: 2000
            }
          ],
          actions: [
            {
              type: 'require_approval',
              level: 2
            },
            {
              type: 'notify',
              target: 'department_head'
            }
          ],
          approvers: [
            {
              id: '2',
              name: 'Sarah Director',
              email: 'sarah.director@company.com',
              role: 'Director',
              level: 2
            }
          ],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          usageCount: 23,
          lastUsed: '2024-01-14T16:45:00Z'
        },
        {
          id: '4',
          name: 'Marketing Expense Review',
          description: 'All marketing expenses require marketing manager approval',
          isActive: false,
          priority: 4,
          conditions: [
            {
              type: 'category',
              operator: 'equals',
              value: 'Marketing & Advertising'
            }
          ],
          actions: [
            {
              type: 'require_approval',
              level: 1
            }
          ],
          approvers: [
            {
              id: '3',
              name: 'Mike Marketing',
              email: 'mike.marketing@company.com',
              role: 'Marketing Manager',
              level: 1
            }
          ],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          usageCount: 12,
          lastUsed: '2024-01-10T09:15:00Z'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:4001/api/workflows/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Mock data for demo
      setStats({
        total: 8,
        active: 6,
        inactive: 2,
        totalApprovals: 208,
        pendingApprovals: 15,
        averageApprovalTime: 2.5
      });
    }
  };

  const toggleWorkflowStatus = async (workflowId: string, isActive: boolean) => {
    try {
      const response = await fetch(`http://localhost:4001/api/workflows/${workflowId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setWorkflows(prev => 
          prev.map(workflow => 
            workflow.id === workflowId 
              ? { ...workflow, isActive }
              : workflow
          )
        );
        toast({
          title: "Workflow Updated",
          description: `Workflow has been ${isActive ? 'activated' : 'deactivated'}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update workflow status.",
        variant: "destructive",
      });
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`http://localhost:4001/api/workflows/${workflowId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWorkflows(prev => prev.filter(workflow => workflow.id !== workflowId));
        toast({
          title: "Workflow Deleted",
          description: "Workflow has been deleted successfully.",
        });
        fetchStats();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete workflow.",
        variant: "destructive",
      });
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && workflow.isActive) ||
                         (filterStatus === 'inactive' && !workflow.isActive);
    const matchesType = filterType === 'all' ||
                       (filterType === 'approval' && workflow.actions.some(a => a.type === 'require_approval')) ||
                       (filterType === 'auto' && workflow.actions.some(a => a.type === 'auto_approve'));
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'require_approval': return <CheckCircle className="w-4 h-4" />;
      case 'auto_approve': return <Play className="w-4 h-4" />;
      case 'notify': return <Users className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getConditionText = (condition: any) => {
    const { type, operator, value } = condition;
    const operatorText = {
      'greater_than': '>',
      'less_than': '<',
      'equals': '=',
      'contains': 'contains'
    }[operator];
    
    return `${type} ${operatorText} ${value}`;
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
              <h1 className="text-3xl font-bold text-gray-900">Approval Workflows</h1>
              <p className="text-gray-600 mt-1">Manage approval rules and business workflows</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => fetchWorkflows()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
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
                      <p className="text-sm font-medium text-gray-600">Total Workflows</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <Workflow className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Play className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Approval Time</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.averageApprovalTime}h</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
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
                      placeholder="Search workflows..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="approval">Approval Required</SelectItem>
                      <SelectItem value="auto">Auto Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflows List */}
          <div className="space-y-4">
            {filteredWorkflows.map((workflow) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {workflow.name}
                          </h3>
                          <Badge className={getStatusColor(workflow.isActive)}>
                            {workflow.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">
                            Priority {workflow.priority}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-4">{workflow.description}</p>
                        
                        {/* Conditions */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Conditions:</h4>
                          <div className="flex flex-wrap gap-2">
                            {workflow.conditions.map((condition, index) => (
                              <Badge key={index} variant="secondary">
                                {getConditionText(condition)}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Actions:</h4>
                          <div className="flex flex-wrap gap-2">
                            {workflow.actions.map((action, index) => (
                              <div key={index} className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm">
                                {getActionIcon(action.type)}
                                <span>{action.type.replace('_', ' ')}</span>
                                {action.level && <span>(Level {action.level})</span>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Approvers */}
                        {workflow.approvers.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Approvers:</h4>
                            <div className="flex flex-wrap gap-2">
                              {workflow.approvers.map((approver) => (
                                <div key={approver.id} className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-md">
                                  <Users className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm">{approver.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    L{approver.level}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Usage Stats */}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Used {workflow.usageCount} times</span>
                          {workflow.lastUsed && (
                            <>
                              <span>•</span>
                              <span>Last used: {new Date(workflow.lastUsed).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleWorkflowStatus(workflow.id, !workflow.isActive)}
                        >
                          {workflow.isActive ? (
                            <>
                              <Pause className="w-4 h-4 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteWorkflow(workflow.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredWorkflows.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Create your first workflow to automate approvals'}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
} 