# ExpenseFlow Pro - Frontend

Modern React/Next.js web application for ExpenseFlow Pro, a comprehensive expense management solution designed for Polish businesses.

## 🚀 Features

### Core Features
- **Authentication System** - Login, register, password reset with JWT tokens
- **Responsive Dashboard** - Modern dashboard with statistics and analytics
- **File Upload** - Drag-and-drop file upload with progress tracking
- **OCR Integration** - Automatic receipt/invoice data extraction
- **Form Validation** - React Hook Form with Zod validation
- **State Management** - Redux Toolkit with persistence
- **Dark/Light Theme** - System preference detection and manual toggle
- **Progressive Web App** - Mobile-first PWA capabilities

### Technology Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Redux Toolkit + Redux Persist
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios with interceptors
- **Data Fetching**: TanStack Query (React Query)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **PWA**: next-pwa

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm 9+

### Setup

1. **Clone and navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp env.example .env.local
```

Edit `.env.local` with your configuration:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_JWT_SECRET=your-jwt-secret
# ... other variables
```

4. **Start development server**
```bash
npm run dev
```

Application will be available at `http://localhost:3000`

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Storybook
npm run storybook    # Start Storybook
npm run build-storybook # Build Storybook
```

### Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js 13+ app directory
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # Dashboard pages and layout
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Landing page
│   ├── components/         # Reusable components
│   │   ├── layout/        # Layout components
│   │   ├── providers/     # Context providers
│   │   └── ui/           # UI components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   ├── store/            # Redux store and slices
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── styles/           # Additional styles
├── public/               # Static assets
│   ├── icons/           # PWA icons
│   ├── manifest.json    # PWA manifest
│   └── ...
├── next.config.js       # Next.js configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

### Key Components

#### Authentication
- `src/app/auth/login/page.tsx` - Login form with validation
- `src/app/auth/register/page.tsx` - Registration with password strength
- `src/store/slices/authSlice.ts` - Authentication state management
- `src/services/authService.ts` - Auth API calls with token refresh

#### Dashboard
- `src/app/dashboard/layout.tsx` - Dashboard layout with sidebar
- `src/app/dashboard/page.tsx` - Main dashboard with stats and charts
- `src/components/layout/Sidebar.tsx` - Navigation sidebar
- `src/components/layout/NotificationDropdown.tsx` - Notifications panel

#### File Upload
- `src/components/ui/FileUpload.tsx` - Drag-and-drop file upload
- Progress tracking and preview functionality
- File type and size validation

#### Forms & Validation
- React Hook Form for form state management
- Zod schemas for validation
- Custom form components with error handling

### State Management

Redux Toolkit setup with the following slices:
- `authSlice` - User authentication and profile
- `uiSlice` - UI state (sidebar, modals, etc.)
- `themeSlice` - Dark/light theme preferences
- `expenseSlice` - Expense management
- `documentSlice` - Document management

### Styling & Design System

Custom Tailwind CSS configuration with:
- Extended color palette for brand colors
- Custom animations and transitions
- Responsive breakpoints
- Dark mode support
- Glass effect utilities

### PWA Features

- **Service Worker** - Offline functionality
- **App Manifest** - Install as mobile app
- **App Shortcuts** - Quick actions from home screen
- **Icon Sets** - Multiple icon sizes for different devices

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Frontend app URL | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` |
| `NEXT_PUBLIC_JWT_SECRET` | JWT secret key | - |
| `NEXT_PUBLIC_MAX_FILE_SIZE` | Max file upload size | `10485760` (10MB) |
| `NEXT_PUBLIC_FEATURE_OCR` | Enable OCR features | `true` |

### API Integration

The frontend communicates with the backend via REST API:
- Base URL configured via `NEXT_PUBLIC_API_URL`
- Axios interceptors for authentication
- Automatic token refresh
- Error handling and retry logic

### Theming

Supports three theme modes:
- **Light** - Default light theme
- **Dark** - Dark theme with high contrast
- **System** - Follows system preference

Theme state is persisted and applied on page load.

## 📱 PWA Setup

The app is configured as a Progressive Web App:

1. **Install prompt** appears on supported browsers
2. **Offline support** for core functionality
3. **App shortcuts** for quick actions
4. **Mobile-optimized** interface

To test PWA features:
1. Build the app: `npm run build`
2. Serve locally: `npm run start`
3. Open in Chrome and check "Add to Home Screen"

## 🧪 Testing

### Test Structure
- **Unit tests** for components and utilities
- **Integration tests** for API services
- **E2E tests** with Playwright (optional)

### Running Tests
```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Setup
1. Set production environment variables
2. Configure API endpoints
3. Set up domain and SSL
4. Configure CDN for static assets

### Deployment Options
- **Vercel** - Recommended for Next.js apps
- **Netlify** - Static site hosting
- **Docker** - Containerized deployment
- **Custom Server** - Node.js hosting

## 🔍 Performance

### Optimization Features
- **Code splitting** - Automatic route-based splitting
- **Image optimization** - Next.js Image component
- **Bundle analysis** - Webpack bundle analyzer
- **Lazy loading** - Components and routes
- **Service worker** - Asset caching

### Performance Monitoring
- Web Vitals tracking
- Error boundary implementation
- Performance profiling in development

## 🛡️ Security

### Security Features
- **JWT token management** with automatic refresh
- **CORS configuration** for API requests
- **Input validation** with Zod schemas
- **XSS protection** via Content Security Policy
- **Secure headers** configuration

## 📖 Development Guidelines

### Code Style
- ESLint + Prettier configuration
- TypeScript strict mode
- Consistent naming conventions
- Component composition patterns

### Git Workflow
- Feature branches from `main`
- Conventional commit messages
- Pull request reviews
- Automated CI/CD pipeline

### Component Guidelines
- Functional components with hooks
- TypeScript prop interfaces
- Responsive design patterns
- Accessibility considerations

## 🐛 Troubleshooting

### Common Issues

**Module resolution errors**
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors**
```bash
npm run type-check
```

**Build errors**
```bash
rm -rf .next
npm run build
```

**PWA not working**
- Check manifest.json is served correctly
- Ensure HTTPS in production
- Verify service worker registration

## 📞 Support

For issues and questions:
1. Check the [troubleshooting section](#troubleshooting)
2. Review existing GitHub issues
3. Create a new issue with detailed information
4. Contact the development team

## 📄 License

This project is proprietary software. All rights reserved.

---

**ExpenseFlow Pro Frontend** - Built with ❤️ for modern expense management 