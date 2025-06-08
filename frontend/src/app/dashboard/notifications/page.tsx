'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Bell, 
  BellRing,
  Check,
  X,
  Search,
  Filter,
  RefreshCw,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Info,
  Clock,
  Settings
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  actionUrl?: string;
  actionText?: string;
  priority: 'low' | 'medium' | 'high';
  relatedEntity?: {
    type: string;
    id: string;
    name: string;
  };
}

interface NotificationStats {
  total: number;
  unread: number;
  archived: number;
  today: number;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('http://localhost:4001/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Mock data for demo
      setNotifications([
        {
          id: '1',
          title: 'New Expense Submitted',
          message: 'John Doe submitted a new expense for review: Business Lunch - €45.50',
          type: 'info',
          category: 'expenses',
          isRead: false,
          isArchived: false,
          createdAt: '2024-01-15T10:30:00Z',
          actionUrl: '/dashboard/expenses/123',
          actionText: 'Review Expense',
          priority: 'medium',
          relatedEntity: {
            type: 'expense',
            id: '123',
            name: 'Business Lunch'
          }
        },
        {
          id: '2',
          title: 'Document Processing Complete',
          message: 'Receipt scan completed successfully. All data extracted and categorized.',
          type: 'success',
          category: 'documents',
          isRead: false,
          isArchived: false,
          createdAt: '2024-01-15T09:15:00Z',
          actionUrl: '/dashboard/documents/456',
          actionText: 'View Document',
          priority: 'low',
          relatedEntity: {
            type: 'document',
            id: '456',
            name: 'Receipt_2024_001.pdf'
          }
        },
        {
          id: '3',
          title: 'Bank Statement Upload Failed',
          message: 'Failed to process bank statement. File format not supported.',
          type: 'error',
          category: 'bank-statements',
          isRead: true,
          isArchived: false,
          createdAt: '2024-01-15T08:45:00Z',
          actionUrl: '/dashboard/bank-statements',
          actionText: 'Try Again',
          priority: 'high',
          relatedEntity: {
            type: 'bank-statement',
            id: '789',
            name: 'statement_december.csv'
          }
        },
        {
          id: '4',
          title: 'Monthly Report Ready',
          message: 'Your December 2024 expense report has been generated and is ready for download.',
          type: 'success',
          category: 'reports',
          isRead: true,
          isArchived: false,
          createdAt: '2024-01-14T16:20:00Z',
          actionUrl: '/dashboard/reports/monthly-dec-2024',
          actionText: 'Download Report',
          priority: 'medium',
          relatedEntity: {
            type: 'report',
            id: 'monthly-dec-2024',
            name: 'Monthly Report - December 2024'
          }
        },
        {
          id: '5',
          title: 'Expense Approval Required',
          message: 'Travel expense of €1,250.00 requires manager approval.',
          type: 'warning',
          category: 'approvals',
          isRead: false,
          isArchived: false,
          createdAt: '2024-01-14T14:10:00Z',
          actionUrl: '/dashboard/verification',
          actionText: 'Review & Approve',
          priority: 'high',
          relatedEntity: {
            type: 'expense',
            id: '999',
            name: 'Business Travel - Berlin'
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:4001/api/notifications/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Mock data for demo
      setStats({
        total: 25,
        unread: 8,
        archived: 5,
        today: 12
      });
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('http://localhost:4001/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: notificationIds }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notificationIds.includes(notification.id) 
              ? { ...notification, isRead: true }
              : notification
          )
        );
        toast({
          title: "Notifications Updated",
          description: `${notificationIds.length} notification(s) marked as read.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notifications.",
        variant: "destructive",
      });
    }
  };

  const archiveNotifications = async (notificationIds: string[]) => {
    try {
      const response = await fetch('http://localhost:4001/api/notifications/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: notificationIds }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notificationIds.includes(notification.id) 
              ? { ...notification, isArchived: true }
              : notification
          )
        );
        toast({
          title: "Notifications Archived",
          description: `${notificationIds.length} notification(s) archived.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive notifications.",
        variant: "destructive",
      });
    }
  };

  const deleteNotifications = async (notificationIds: string[]) => {
    try {
      const response = await fetch('http://localhost:4001/api/notifications/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: notificationIds }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.filter(notification => !notificationIds.includes(notification.id))
        );
        toast({
          title: "Notifications Deleted",
          description: `${notificationIds.length} notification(s) deleted.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notifications.",
        variant: "destructive",
      });
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || notification.type === filterType;
    const matchesCategory = filterCategory === 'all' || notification.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'read' && notification.isRead) ||
                         (filterStatus === 'unread' && !notification.isRead) ||
                         (filterStatus === 'archived' && notification.isArchived);
    
    return matchesSearch && matchesType && matchesCategory && matchesStatus;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const selectAll = () => {
    setSelectedNotifications(filteredNotifications.map(n => n.id));
  };

  const clearSelection = () => {
    setSelectedNotifications([]);
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
              <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600 mt-1">Stay updated with your expense management activities</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => fetchNotifications()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
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
                      <p className="text-sm font-medium text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <Bell className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Unread</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.unread}</p>
                    </div>
                    <BellRing className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Archived</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.archived}</p>
                    </div>
                    <Archive className="w-8 h-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Today</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
                    </div>
                    <Clock className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters and Actions */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search notifications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="expenses">Expenses</SelectItem>
                      <SelectItem value="documents">Documents</SelectItem>
                      <SelectItem value="bank-statements">Bank Statements</SelectItem>
                      <SelectItem value="reports">Reports</SelectItem>
                      <SelectItem value="approvals">Approvals</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedNotifications.length > 0 && (
                <div className="flex items-center justify-between mt-4 p-4 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700">
                    {selectedNotifications.length} notification(s) selected
                  </span>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsRead(selectedNotifications)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Mark Read
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => archiveNotifications(selectedNotifications)}
                    >
                      <Archive className="w-4 h-4 mr-1" />
                      Archive
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteNotifications(selectedNotifications)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearSelection}>
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mt-4">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All ({filteredNotifications.length})
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`hover:shadow-md transition-shadow border-l-4 ${getPriorityColor(notification.priority)} ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={() => toggleSelection(notification.id)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-shrink-0 mt-1">
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`text-sm font-medium ${
                              !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                              {!notification.isRead && (
                                <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {notification.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {notification.priority}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(notification.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {notification.actionUrl && (
                              <Button size="sm" variant="outline">
                                {notification.actionText || 'View'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead([notification.id])}
                            >
                              {notification.isRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => archiveNotifications([notification.id])}
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredNotifications.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterType !== 'all' || filterCategory !== 'all' || filterStatus !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'You\'re all caught up! No new notifications.'}
                </p>
                {(searchTerm || filterType !== 'all' || filterCategory !== 'all' || filterStatus !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('all');
                      setFilterCategory('all');
                      setFilterStatus('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
} 