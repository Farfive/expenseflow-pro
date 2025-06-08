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
  Tag, 
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Settings,
  TrendingUp,
  DollarSign,
  Percent,
  MoreVertical
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  parentId?: string;
  isActive: boolean;
  isDefault: boolean;
  taxDeductible: boolean;
  requiresReceipt: boolean;
  maxAmount?: number;
  createdAt: string;
  updatedAt: string;
  expenseCount: number;
  totalAmount: number;
  subcategories?: Category[];
}

interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  withSubcategories: number;
  totalExpenses: number;
  totalAmount: number;
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'tag',
    parentId: '',
    isActive: true,
    taxDeductible: false,
    requiresReceipt: true,
    maxAmount: ''
  });

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:4001/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Mock data for demo
      setCategories([
        {
          id: '1',
          name: 'Travel & Transportation',
          description: 'Business travel, flights, hotels, car rentals',
          color: '#3B82F6',
          icon: 'plane',
          isActive: true,
          isDefault: true,
          taxDeductible: true,
          requiresReceipt: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          expenseCount: 45,
          totalAmount: 12500.50,
          subcategories: [
            {
              id: '1a',
              name: 'Flights',
              description: 'Airline tickets and fees',
              color: '#3B82F6',
              icon: 'plane',
              parentId: '1',
              isActive: true,
              isDefault: false,
              taxDeductible: true,
              requiresReceipt: true,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              expenseCount: 15,
              totalAmount: 8500.00
            },
            {
              id: '1b',
              name: 'Hotels',
              description: 'Accommodation expenses',
              color: '#3B82F6',
              icon: 'bed',
              parentId: '1',
              isActive: true,
              isDefault: false,
              taxDeductible: true,
              requiresReceipt: true,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              expenseCount: 20,
              totalAmount: 3200.50
            }
          ]
        },
        {
          id: '2',
          name: 'Meals & Entertainment',
          description: 'Business meals, client entertainment',
          color: '#10B981',
          icon: 'utensils',
          isActive: true,
          isDefault: true,
          taxDeductible: true,
          requiresReceipt: true,
          maxAmount: 500,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          expenseCount: 32,
          totalAmount: 2850.75
        },
        {
          id: '3',
          name: 'Office Supplies',
          description: 'Stationery, equipment, software',
          color: '#F59E0B',
          icon: 'briefcase',
          isActive: true,
          isDefault: true,
          taxDeductible: true,
          requiresReceipt: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          expenseCount: 28,
          totalAmount: 1450.25
        },
        {
          id: '4',
          name: 'Marketing & Advertising',
          description: 'Promotional materials, advertising costs',
          color: '#EF4444',
          icon: 'megaphone',
          isActive: true,
          isDefault: false,
          taxDeductible: true,
          requiresReceipt: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          expenseCount: 12,
          totalAmount: 3200.00
        },
        {
          id: '5',
          name: 'Training & Education',
          description: 'Courses, conferences, certifications',
          color: '#8B5CF6',
          icon: 'graduation-cap',
          isActive: false,
          isDefault: false,
          taxDeductible: true,
          requiresReceipt: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          expenseCount: 8,
          totalAmount: 1800.00
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:4001/api/categories/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Mock data for demo
      setStats({
        total: 15,
        active: 12,
        inactive: 3,
        withSubcategories: 4,
        totalExpenses: 125,
        totalAmount: 21801.50
      });
    }
  };

  const createCategory = async () => {
    try {
      const response = await fetch('http://localhost:4001/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCategory,
          maxAmount: newCategory.maxAmount ? parseFloat(newCategory.maxAmount) : null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(prev => [...prev, data]);
        setIsCreateDialogOpen(false);
        setNewCategory({
          name: '',
          description: '',
          color: '#3B82F6',
          icon: 'tag',
          parentId: '',
          isActive: true,
          taxDeductible: false,
          requiresReceipt: true,
          maxAmount: ''
        });
        toast({
          title: "Category Created",
          description: "New category has been created successfully.",
        });
        fetchStats();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create category.",
        variant: "destructive",
      });
    }
  };

  const updateCategory = async (categoryId: string, updates: Partial<Category>) => {
    try {
      const response = await fetch(`http://localhost:4001/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setCategories(prev => 
          prev.map(category => 
            category.id === categoryId 
              ? { ...category, ...updates }
              : category
          )
        );
        toast({
          title: "Category Updated",
          description: "Category has been updated successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update category.",
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`http://localhost:4001/api/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCategories(prev => prev.filter(category => category.id !== categoryId));
        toast({
          title: "Category Deleted",
          description: "Category has been deleted successfully.",
        });
        fetchStats();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category.",
        variant: "destructive",
      });
    }
  };

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && category.isActive) ||
                         (filterStatus === 'inactive' && !category.isActive);
    const matchesType = filterType === 'all' ||
                       (filterType === 'parent' && !category.parentId) ||
                       (filterType === 'subcategory' && category.parentId) ||
                       (filterType === 'default' && category.isDefault);
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
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
              <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
              <p className="text-gray-600 mt-1">Manage expense categories and subcategories</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => fetchCategories()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Category</DialogTitle>
                    <DialogDescription>
                      Add a new expense category to organize your expenses.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Category Name</Label>
                      <Input
                        id="name"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Travel & Transportation"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newCategory.description}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of this category"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="color">Color</Label>
                        <Input
                          id="color"
                          type="color"
                          value={newCategory.color}
                          onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxAmount">Max Amount (optional)</Label>
                        <Input
                          id="maxAmount"
                          type="number"
                          value={newCategory.maxAmount}
                          onChange={(e) => setNewCategory(prev => ({ ...prev, maxAmount: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="taxDeductible"
                          checked={newCategory.taxDeductible}
                          onChange={(e) => setNewCategory(prev => ({ ...prev, taxDeductible: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <Label htmlFor="taxDeductible">Tax Deductible</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="requiresReceipt"
                          checked={newCategory.requiresReceipt}
                          onChange={(e) => setNewCategory(prev => ({ ...prev, requiresReceipt: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <Label htmlFor="requiresReceipt">Requires Receipt</Label>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createCategory}>
                        Create Category
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Categories</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <Tag className="w-8 h-8 text-blue-600" />
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
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalExpenses}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.totalAmount.toLocaleString()} PLN
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-600" />
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
                      placeholder="Search categories..."
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
                      <SelectItem value="parent">Parent Categories</SelectItem>
                      <SelectItem value="subcategory">Subcategories</SelectItem>
                      <SelectItem value="default">Default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categories List */}
          <div className="space-y-4">
            {filteredCategories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: category.color }}
                        >
                          <Tag className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {category.name}
                            </h3>
                            {category.isDefault && (
                              <Badge variant="outline">Default</Badge>
                            )}
                            {category.parentId && (
                              <Badge variant="secondary">Subcategory</Badge>
                            )}
                          </div>
                          <p className="text-gray-600 mt-1">{category.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>{category.expenseCount} expenses</span>
                            <span>•</span>
                            <span>{category.totalAmount.toLocaleString()} PLN</span>
                            {category.maxAmount && (
                              <>
                                <span>•</span>
                                <span>Max: {category.maxAmount.toLocaleString()} PLN</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge className={getStatusColor(category.isActive)}>
                              {category.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {category.taxDeductible && (
                              <Badge variant="outline">Tax Deductible</Badge>
                            )}
                            {category.requiresReceipt && (
                              <Badge variant="outline">Receipt Required</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
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
                          onClick={() => updateCategory(category.id, { isActive: !category.isActive })}
                        >
                          {category.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        {!category.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCategory(category.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Subcategories */}
                    {category.subcategories && category.subcategories.length > 0 && (
                      <div className="mt-4 pl-16">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Subcategories:</h4>
                        <div className="space-y-2">
                          {category.subcategories.map((subcategory) => (
                            <div key={subcategory.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div 
                                  className="w-8 h-8 rounded-md flex items-center justify-center text-white"
                                  style={{ backgroundColor: subcategory.color }}
                                >
                                  <Tag className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{subcategory.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {subcategory.expenseCount} expenses • {subcategory.totalAmount.toLocaleString()} PLN
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button variant="ghost" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Create your first category to organize expenses'}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Category
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
} 