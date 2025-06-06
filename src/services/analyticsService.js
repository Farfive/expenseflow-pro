const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AnalyticsService {
  
  /**
   * Get comprehensive expense analytics for a company
   */
  async getExpenseAnalytics(companyId, dateFrom, dateTo, filters = {}) {
    try {
      const whereClause = {
        companyId,
        date: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo)
        },
        status: 'APPROVED'
      };

      // Apply additional filters
      if (filters.category) whereClause.category = filters.category;
      if (filters.vendor) whereClause.vendor = { contains: filters.vendor, mode: 'insensitive' };
      if (filters.employeeId) whereClause.employeeId = filters.employeeId;
      if (filters.projectId) whereClause.projectId = filters.projectId;

      // Get all expenses for the period
      const expenses = await prisma.expense.findMany({
        where: whereClause,
        include: {
          employee: {
            select: { name: true, email: true, department: true }
          },
          project: {
            select: { name: true, code: true }
          }
        }
      });

      return {
        expenses,
        summary: await this.calculateExpenseSummary(expenses),
        trends: await this.calculateExpenseTrends(companyId, dateFrom, dateTo, filters),
        categoryBreakdown: await this.getCategoryBreakdown(expenses),
        vendorAnalysis: await this.getVendorAnalysis(expenses),
        budgetTracking: await this.getBudgetTracking(companyId, dateFrom, dateTo),
        taxDeductible: await this.getTaxDeductibleAnalysis(expenses),
        departmentAnalysis: await this.getDepartmentAnalysis(expenses),
        projectAnalysis: await this.getProjectAnalysis(expenses)
      };

    } catch (error) {
      console.error('Error getting expense analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate expense summary metrics
   */
  async calculateExpenseSummary(expenses) {
    const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const totalTransactions = expenses.length;
    const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
    
    const categoryCounts = {};
    const vendorCounts = {};
    const employeeCounts = {};

    expenses.forEach(expense => {
      categoryCounts[expense.category] = (categoryCounts[expense.category] || 0) + 1;
      vendorCounts[expense.vendor] = (vendorCounts[expense.vendor] || 0) + 1;
      employeeCounts[expense.employeeId] = (employeeCounts[expense.employeeId] || 0) + 1;
    });

    return {
      totalAmount,
      totalTransactions,
      averageAmount,
      uniqueCategories: Object.keys(categoryCounts).length,
      uniqueVendors: Object.keys(vendorCounts).length,
      uniqueEmployees: Object.keys(employeeCounts).length,
      topCategory: Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b, ''),
      topVendor: Object.keys(vendorCounts).reduce((a, b) => vendorCounts[a] > vendorCounts[b] ? a : b, ''),
      mostActiveEmployee: Object.keys(employeeCounts).reduce((a, b) => employeeCounts[a] > employeeCounts[b] ? a : b, '')
    };
  }

  /**
   * Calculate expense trends over time
   */
  async calculateExpenseTrends(companyId, dateFrom, dateTo, filters = {}) {
    try {
      const whereClause = {
        companyId,
        date: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo)
        },
        status: 'APPROVED'
      };

      if (filters.category) whereClause.category = filters.category;
      if (filters.vendor) whereClause.vendor = { contains: filters.vendor, mode: 'insensitive' };

      // Group by day, week, or month based on date range
      const daysDiff = Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24));
      const grouping = daysDiff <= 31 ? 'day' : daysDiff <= 365 ? 'week' : 'month';

      const expenses = await prisma.expense.findMany({
        where: whereClause,
        orderBy: { date: 'asc' }
      });

      const trendsData = this.groupExpensesByPeriod(expenses, grouping);
      
      return {
        grouping,
        data: trendsData,
        growth: this.calculateGrowthRates(trendsData),
        seasonality: this.calculateSeasonality(trendsData)
      };

    } catch (error) {
      console.error('Error calculating expense trends:', error);
      throw error;
    }
  }

  /**
   * Get category breakdown analysis
   */
  async getCategoryBreakdown(expenses) {
    const categoryData = {};
    
    expenses.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      if (!categoryData[category]) {
        categoryData[category] = {
          amount: 0,
          count: 0,
          percentage: 0,
          averageAmount: 0,
          taxDeductible: 0
        };
      }
      
      categoryData[category].amount += parseFloat(expense.amount);
      categoryData[category].count += 1;
      if (expense.isTaxDeductible) {
        categoryData[category].taxDeductible += parseFloat(expense.amount);
      }
    });

    const totalAmount = Object.values(categoryData).reduce((sum, cat) => sum + cat.amount, 0);
    
    // Calculate percentages and averages
    Object.values(categoryData).forEach(category => {
      category.percentage = totalAmount > 0 ? (category.amount / totalAmount) * 100 : 0;
      category.averageAmount = category.count > 0 ? category.amount / category.count : 0;
    });

    return Object.entries(categoryData)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get vendor spending analysis
   */
  async getVendorAnalysis(expenses) {
    const vendorData = {};
    
    expenses.forEach(expense => {
      const vendor = expense.vendor || 'Unknown Vendor';
      if (!vendorData[vendor]) {
        vendorData[vendor] = {
          amount: 0,
          count: 0,
          averageAmount: 0,
          categories: new Set(),
          lastTransaction: null,
          frequency: 0
        };
      }
      
      vendorData[vendor].amount += parseFloat(expense.amount);
      vendorData[vendor].count += 1;
      vendorData[vendor].categories.add(expense.category);
      
      if (!vendorData[vendor].lastTransaction || 
          new Date(expense.date) > new Date(vendorData[vendor].lastTransaction)) {
        vendorData[vendor].lastTransaction = expense.date;
      }
    });

    // Calculate frequency and convert Set to Array
    const dateRange = this.getDateRangeDays(expenses);
    Object.values(vendorData).forEach(vendor => {
      vendor.averageAmount = vendor.count > 0 ? vendor.amount / vendor.count : 0;
      vendor.frequency = dateRange > 0 ? vendor.count / (dateRange / 30) : 0; // transactions per month
      vendor.categories = Array.from(vendor.categories);
    });

    return Object.entries(vendorData)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 50); // Top 50 vendors
  }

  /**
   * Get budget tracking analysis
   */
  async getBudgetTracking(companyId, dateFrom, dateTo) {
    try {
      // Get actual expenses by category
      const expenses = await prisma.expense.findMany({
        where: {
          companyId,
          date: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo)
          },
          status: 'APPROVED'
        }
      });

      const expensesByCategory = {};
      expenses.forEach(expense => {
        const category = expense.category || 'Uncategorized';
        expensesByCategory[category] = (expensesByCategory[category] || 0) + parseFloat(expense.amount);
      });

      // Mock budget data for now
      const mockBudgets = [
        { category: 'Office Supplies', amount: 5000 },
        { category: 'Travel', amount: 15000 },
        { category: 'Meals & Entertainment', amount: 8000 },
        { category: 'Software', amount: 12000 }
      ];

      const budgetTracking = mockBudgets.map(budget => {
        const actualSpend = expensesByCategory[budget.category] || 0;
        const budgetAmount = budget.amount;
        const utilization = budgetAmount > 0 ? (actualSpend / budgetAmount) * 100 : 0;
        const variance = actualSpend - budgetAmount;
        const status = utilization > 100 ? 'over' : utilization > 80 ? 'warning' : 'under';

        return {
          category: budget.category,
          budgetAmount,
          actualSpend,
          utilization,
          variance,
          status
        };
      });

      return {
        budgets: budgetTracking,
        totalBudget: mockBudgets.reduce((sum, b) => sum + b.amount, 0),
        totalActual: Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0),
        overBudgetCategories: budgetTracking.filter(b => b.status === 'over').length,
        warningCategories: budgetTracking.filter(b => b.status === 'warning').length
      };

    } catch (error) {
      console.error('Error getting budget tracking:', error);
      return { budgets: [], totalBudget: 0, totalActual: 0, overBudgetCategories: 0, warningCategories: 0 };
    }
  }

  /**
   * Get tax-deductible expense analysis
   */
  async getTaxDeductibleAnalysis(expenses) {
    const taxDeductibleExpenses = expenses.filter(exp => exp.isTaxDeductible);
    const nonTaxDeductibleExpenses = expenses.filter(exp => !exp.isTaxDeductible);
    
    const taxDeductibleAmount = taxDeductibleExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const nonTaxDeductibleAmount = nonTaxDeductibleExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const totalAmount = taxDeductibleAmount + nonTaxDeductibleAmount;
    
    const categoryBreakdown = {};
    taxDeductibleExpenses.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + parseFloat(expense.amount);
    });

    return {
      taxDeductibleAmount,
      nonTaxDeductibleAmount,
      totalAmount,
      taxDeductiblePercentage: totalAmount > 0 ? (taxDeductibleAmount / totalAmount) * 100 : 0,
      taxDeductibleCount: taxDeductibleExpenses.length,
      nonTaxDeductibleCount: nonTaxDeductibleExpenses.length,
      categoryBreakdown: Object.entries(categoryBreakdown)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      estimatedTaxSavings: taxDeductibleAmount * 0.25 // Assuming 25% tax rate
    };
  }

  /**
   * Get department analysis
   */
  async getDepartmentAnalysis(expenses) {
    const departmentData = {};
    
    expenses.forEach(expense => {
      const department = expense.employee?.department || 'Unknown Department';
      if (!departmentData[department]) {
        departmentData[department] = {
          amount: 0,
          count: 0,
          employees: new Set(),
          categories: new Set()
        };
      }
      
      departmentData[department].amount += parseFloat(expense.amount);
      departmentData[department].count += 1;
      departmentData[department].employees.add(expense.employeeId);
      departmentData[department].categories.add(expense.category);
    });

    return Object.entries(departmentData)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        employeeCount: data.employees.size,
        categoryCount: data.categories.size,
        averagePerEmployee: data.employees.size > 0 ? data.amount / data.employees.size : 0,
        averagePerTransaction: data.count > 0 ? data.amount / data.count : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get project analysis
   */
  async getProjectAnalysis(expenses) {
    const projectData = {};
    
    expenses.forEach(expense => {
      if (expense.projectId) {
        const projectName = expense.project?.name || `Project ${expense.projectId}`;
        if (!projectData[projectName]) {
          projectData[projectName] = {
            amount: 0,
            count: 0,
            categories: new Set(),
            employees: new Set()
          };
        }
        
        projectData[projectName].amount += parseFloat(expense.amount);
        projectData[projectName].count += 1;
        projectData[projectName].categories.add(expense.category);
        projectData[projectName].employees.add(expense.employeeId);
      }
    });

    return Object.entries(projectData)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        categoryCount: data.categories.size,
        employeeCount: data.employees.size,
        averagePerTransaction: data.count > 0 ? data.amount / data.count : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get KPI metrics for dashboard widgets
   */
  async getKPIMetrics(companyId, dateFrom, dateTo) {
    try {
      const analytics = await this.getExpenseAnalytics(companyId, dateFrom, dateTo);
      
      // Get previous period for comparison
      const periodDays = Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24));
      const previousStart = new Date(new Date(dateFrom).getTime() - (periodDays * 24 * 60 * 60 * 1000));
      const previousEnd = new Date(dateFrom);
      
      const previousAnalytics = await this.getExpenseAnalytics(companyId, previousStart, previousEnd);

      return {
        totalSpend: {
          value: analytics.summary.totalAmount,
          change: this.calculateGrowth(analytics.summary.totalAmount, previousAnalytics.summary.totalAmount),
          trend: 'up'
        },
        transactionCount: {
          value: analytics.summary.totalTransactions,
          change: this.calculateGrowth(analytics.summary.totalTransactions, previousAnalytics.summary.totalTransactions),
          trend: 'up'
        },
        averageTransaction: {
          value: analytics.summary.averageAmount,
          change: this.calculateGrowth(analytics.summary.averageAmount, previousAnalytics.summary.averageAmount),
          trend: 'neutral'
        },
        taxDeductible: {
          value: analytics.taxDeductible.taxDeductibleAmount,
          percentage: analytics.taxDeductible.taxDeductiblePercentage,
          savings: analytics.taxDeductible.estimatedTaxSavings
        },
        budgetUtilization: {
          value: analytics.budgetTracking.totalActual,
          budget: analytics.budgetTracking.totalBudget,
          utilization: analytics.budgetTracking.totalBudget > 0 ? 
            (analytics.budgetTracking.totalActual / analytics.budgetTracking.totalBudget) * 100 : 0
        },
        topCategory: analytics.categoryBreakdown[0] || { name: 'N/A', amount: 0 },
        topVendor: analytics.vendorAnalysis[0] || { name: 'N/A', amount: 0 }
      };

    } catch (error) {
      console.error('Error getting KPI metrics:', error);
      throw error;
    }
  }

  // Helper methods

  groupExpensesByPeriod(expenses, grouping) {
    const groups = {};
    
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      let key;
      
      switch (grouping) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!groups[key]) {
        groups[key] = { amount: 0, count: 0, date: key };
      }
      
      groups[key].amount += parseFloat(expense.amount);
      groups[key].count += 1;
    });
    
    return Object.values(groups).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  calculateGrowthRates(trendsData) {
    if (trendsData.length < 2) return [];
    
    return trendsData.slice(1).map((current, index) => {
      const previous = trendsData[index];
      return {
        date: current.date,
        growthRate: previous.amount > 0 ? ((current.amount - previous.amount) / previous.amount) * 100 : 0
      };
    });
  }

  calculateSeasonality(trendsData) {
    const monthlyData = {};
    
    trendsData.forEach(data => {
      const month = new Date(data.date).getMonth();
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(data.amount);
    });
    
    return Object.entries(monthlyData).map(([month, amounts]) => ({
      month: parseInt(month),
      averageAmount: amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length,
      variance: this.calculateVariance(amounts)
    }));
  }

  calculateGrowth(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  getDateRangeDays(expenses) {
    if (expenses.length === 0) return 0;
    
    const dates = expenses.map(exp => new Date(exp.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    return Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
  }
}

module.exports = AnalyticsService; 