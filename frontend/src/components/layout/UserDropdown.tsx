'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Settings, HelpCircle, LogOut, Shield, Bell } from 'lucide-react';
import Link from 'next/link';
import { User as UserType } from '@/types';
import { formatFullName, formatUserRole } from '@/utils/formatters';

interface UserDropdownProps {
  user: UserType;
  onClose: () => void;
  onLogout: () => void;
}

interface MenuItem {
  label: string;
  href?: string;
  icon: any;
  onClick?: () => void;
  divider?: boolean;
  destructive?: boolean;
}

export function UserDropdown({ user, onClose, onLogout }: UserDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const menuItems: MenuItem[] = [
    {
      label: 'Profile',
      href: '/dashboard/profile',
      icon: User,
    },
    {
      label: 'Account Settings',
      href: '/dashboard/settings/account',
      icon: Settings,
    },
    {
      label: 'Notifications',
      href: '/dashboard/notifications',
      icon: Bell,
    },
    {
      label: 'Privacy & Security',
      href: '/dashboard/settings/security',
      icon: Shield,
    },
    {
      label: 'Help Center',
      href: '/help',
      icon: HelpCircle,
      divider: true,
    },
    {
      label: 'Sign Out',
      icon: LogOut,
      onClick: () => {
        onLogout();
        onClose();
      },
      destructive: true,
    },
  ];

  return (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-strong z-50"
    >
      {/* User info header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={formatFullName(user.firstName, user.lastName)}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {formatFullName(user.firstName, user.lastName)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatUserRole(user.role)}
            </p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-2">
        {menuItems.map((item, index) => {
          const IconComponent = item.icon;
          
          return (
            <div key={index}>
              {item.divider && <div className="border-t border-border my-2" />}
              
              {item.href ? (
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center space-x-3 px-4 py-2 text-sm transition-colors
                    ${item.destructive 
                      ? 'text-destructive hover:bg-destructive/10' 
                      : 'hover:bg-muted'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              ) : (
                <button
                  onClick={item.onClick}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors text-left
                    ${item.destructive 
                      ? 'text-destructive hover:bg-destructive/10' 
                      : 'hover:bg-muted'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          <p>ExpenseFlow Pro</p>
          <p>Version 1.0.0</p>
        </div>
      </div>
    </motion.div>
  );
} 