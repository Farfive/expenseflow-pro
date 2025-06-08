'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  LayoutDashboard,
  Receipt,
  Upload,
  FileText,
  BarChart3,
  Users,
  Settings,
  CreditCard,
  FolderOpen,
  CheckSquare,
  Bell,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Building2,
  Plug
} from 'lucide-react';
import { RootState } from '@/store';
import { UserRole, Permission } from '@/types';

interface MenuItem {
  name: string;
  href: string;
  icon: any;
  permissions?: Permission[];
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Expenses',
    href: '/dashboard/expenses',
    icon: Receipt,
    children: [
      {
        name: 'All Expenses',
        href: '/dashboard/expenses',
        icon: Receipt,
        permissions: [Permission.VIEW_OWN_EXPENSES, Permission.VIEW_ALL_EXPENSES],
      },
      {
        name: 'Submit Expense',
        href: '/dashboard/expenses/new',
        icon: Upload,
        permissions: [Permission.CREATE_EXPENSE],
      },
      {
        name: 'Pending Approval',
        href: '/dashboard/expenses/pending',
        icon: CheckSquare,
        permissions: [Permission.APPROVE_EXPENSES],
      },
    ],
  },
  {
    name: 'Documents',
    href: '/dashboard/documents',
    icon: FileText,
    children: [
      {
        name: 'All Documents',
        href: '/dashboard/documents',
        icon: FolderOpen,
        permissions: [Permission.VIEW_ALL_DOCUMENTS],
      },
      {
        name: 'Upload Documents',
        href: '/dashboard/documents/upload',
        icon: Upload,
        permissions: [Permission.UPLOAD_DOCUMENTS],
      },
    ],
  },
  {
    name: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    permissions: [Permission.VIEW_REPORTS],
    children: [
      {
        name: 'Expense Reports',
        href: '/dashboard/reports/expenses',
        icon: Receipt,
        permissions: [Permission.VIEW_REPORTS],
      },
      {
        name: 'Analytics',
        href: '/dashboard/reports/analytics',
        icon: BarChart3,
        permissions: [Permission.VIEW_REPORTS],
      },
    ],
  },
  {
    name: 'Categories',
    href: '/dashboard/categories',
    icon: CreditCard,
    permissions: [Permission.MANAGE_CATEGORIES],
  },
  {
    name: 'Bank Statements',
    href: '/dashboard/bank-statements',
    icon: CreditCard,
    permissions: [Permission.VIEW_ALL_DOCUMENTS],
    children: [
      {
        name: 'All Statements',
        href: '/dashboard/bank-statements',
        icon: FileText,
        permissions: [Permission.VIEW_ALL_DOCUMENTS],
      },
      {
        name: 'Upload Statement',
        href: '/dashboard/bank-statements?tab=upload',
        icon: Upload,
        permissions: [Permission.UPLOAD_DOCUMENTS],
      },
      {
        name: 'Analytics',
        href: '/dashboard/bank-statements?tab=analytics',
        icon: BarChart3,
        permissions: [Permission.VIEW_REPORTS],
      },
    ],
  },
  {
    name: 'Team',
    href: '/dashboard/team',
    icon: Users,
    permissions: [Permission.VIEW_ALL_USERS],
    children: [
      {
        name: 'All Users',
        href: '/dashboard/team',
        icon: Users,
        permissions: [Permission.VIEW_ALL_USERS],
      },
      {
        name: 'Roles & Permissions',
        href: '/dashboard/team/roles',
        icon: CheckSquare,
        permissions: [Permission.MANAGE_USERS],
      },
    ],
  },
  {
    name: 'Workflows',
    href: '/dashboard/workflows',
    icon: CheckSquare,
    permissions: [Permission.MANAGE_APPROVAL_WORKFLOWS],
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    children: [
      {
        name: 'General Settings',
        href: '/dashboard/settings',
        icon: Settings,
      },
      {
        name: 'Company Settings',
        href: '/dashboard/settings/company',
        icon: Building2,
        permissions: [Permission.VIEW_COMPANY_SETTINGS],
      },
      {
        name: 'Integrations',
        href: '/dashboard/settings/integrations',
        icon: Plug,
        permissions: [Permission.MANAGE_COMPANY],
      },
    ],
  },
];

const helpItems: MenuItem[] = [
  {
    name: 'Profile',
    href: '/dashboard/profile',
    icon: Users,
  },
  {
    name: 'Help Center',
    href: '/help',
    icon: HelpCircle,
  },
  {
    name: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
  },
];

interface SidebarItemProps {
  item: MenuItem;
  level?: number;
  userPermissions: Permission[];
}

function SidebarItem({ item, level = 0, userPermissions }: SidebarItemProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const hasChildren = item.children && item.children.length > 0;
  
  // Check if user has permission to view this item
  const hasPermission = !item.permissions || 
    item.permissions.some(permission => userPermissions.includes(permission));
  
  if (!hasPermission) {
    return null;
  }

  const IconComponent = item.icon;
  const indentClass = level > 0 ? 'ml-6' : '';

  return (
    <div className={indentClass}>
      {hasChildren ? (
        <div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`
              w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${isActive 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            <div className="flex items-center space-x-3">
              <IconComponent className="w-5 h-5" />
              <span>{item.name}</span>
            </div>
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-4 h-4" />
            </motion.div>
          </button>
          
          <motion.div
            initial={false}
            animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1">
              {item.children?.map((child) => (
                <SidebarItem
                  key={child.href}
                  item={child}
                  level={level + 1}
                  userPermissions={userPermissions}
                />
              ))}
            </div>
          </motion.div>
        </div>
      ) : (
        <Link
          href={item.href}
          className={`
            flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${isActive 
              ? 'bg-primary text-primary-foreground' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }
          `}
        >
          <IconComponent className="w-5 h-5" />
          <span>{item.name}</span>
        </Link>
      )}
    </div>
  );
}

export function Sidebar() {
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Get user permissions based on role
  const getUserPermissions = (role: UserRole): Permission[] => {
    switch (role) {
      case UserRole.ADMIN:
        return Object.values(Permission);
      case UserRole.MANAGER:
        return [
          Permission.VIEW_ALL_EXPENSES,
          Permission.VIEW_ALL_USERS,
          Permission.APPROVE_EXPENSES,
          Permission.VIEW_REPORTS,
          Permission.EXPORT_REPORTS,
          Permission.VIEW_ALL_DOCUMENTS,
          Permission.UPLOAD_DOCUMENTS,
          Permission.CREATE_EXPENSE,
          Permission.VIEW_OWN_EXPENSES,
          Permission.EDIT_OWN_EXPENSES,
          Permission.DELETE_OWN_EXPENSES,
          Permission.MANAGE_CATEGORIES,
          Permission.VIEW_COMPANY_SETTINGS,
        ];
      case UserRole.ACCOUNTANT:
        return [
          Permission.VIEW_ALL_EXPENSES,
          Permission.EDIT_ALL_EXPENSES,
          Permission.VIEW_REPORTS,
          Permission.EXPORT_REPORTS,
          Permission.VIEW_ALL_DOCUMENTS,
          Permission.UPLOAD_DOCUMENTS,
          Permission.CREATE_EXPENSE,
          Permission.VIEW_OWN_EXPENSES,
          Permission.EDIT_OWN_EXPENSES,
          Permission.DELETE_OWN_EXPENSES,
          Permission.MANAGE_CATEGORIES,
        ];
      case UserRole.EMPLOYEE:
        return [
          Permission.CREATE_EXPENSE,
          Permission.VIEW_OWN_EXPENSES,
          Permission.EDIT_OWN_EXPENSES,
          Permission.DELETE_OWN_EXPENSES,
          Permission.UPLOAD_DOCUMENTS,
        ];
      default:
        return [];
    }
  };

  const userPermissions = user ? getUserPermissions(user.role) : [];

  return (
    <div className="w-64 bg-card border-r border-border h-full flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">E</span>
          </div>
          <span className="text-xl font-bold">ExpenseFlow</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {/* Main menu items */}
        <div className="space-y-1">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              userPermissions={userPermissions}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border my-4" />

        {/* Help items */}
        <div className="space-y-1">
          {helpItems.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              userPermissions={userPermissions}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          <p>ExpenseFlow Pro v1.0</p>
          <p>&copy; 2024 All rights reserved</p>
        </div>
      </div>
    </div>
  );
} 