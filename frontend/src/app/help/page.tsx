'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  Search,
  Book,
  MessageCircle,
  Mail,
  Phone,
  FileText,
  Video,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Star,
  Clock,
  Users
} from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  views: number;
}

interface Guide {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  type: 'article' | 'video' | 'pdf';
  url: string;
  views: number;
  rating: number;
}

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'How do I submit a new expense?',
      answer: 'To submit a new expense, go to the Expenses section and click "Submit Expense". Fill in the required details including amount, date, category, and description. You can also upload receipts by dragging and dropping files or clicking the upload button.',
      category: 'expenses',
      helpful: 45,
      views: 234
    },
    {
      id: '2',
      question: 'What file formats are supported for receipts?',
      answer: 'We support common image formats (JPG, PNG, GIF) and PDF files. The maximum file size is 10MB per document. For best results, ensure receipts are clear and well-lit.',
      category: 'documents',
      helpful: 32,
      views: 189
    },
    {
      id: '3',
      question: 'How long does expense approval take?',
      answer: 'Approval times vary based on your company\'s workflow settings. Typically, expenses under 1000 PLN are auto-approved if they meet criteria. Higher amounts may require manager approval, which usually takes 1-3 business days.',
      category: 'approvals',
      helpful: 28,
      views: 156
    },
    {
      id: '4',
      question: 'Can I edit an expense after submission?',
      answer: 'You can edit expenses that are still pending approval. Once approved, expenses cannot be modified. If you need to make changes to an approved expense, contact your manager or administrator.',
      category: 'expenses',
      helpful: 22,
      views: 143
    },
    {
      id: '5',
      question: 'How do I generate expense reports?',
      answer: 'Go to the Reports section and select the type of report you need. You can filter by date range, category, or department. Reports can be exported in PDF, Excel, or CSV formats.',
      category: 'reports',
      helpful: 38,
      views: 201
    },
    {
      id: '6',
      question: 'What should I do if OCR extraction is incorrect?',
      answer: 'If the automatic data extraction from your receipt is incorrect, you can manually edit the fields before submitting. The system learns from corrections to improve future accuracy.',
      category: 'documents',
      helpful: 19,
      views: 98
    }
  ];

  const guides: Guide[] = [
    {
      id: '1',
      title: 'Getting Started with ExpenseFlow Pro',
      description: 'Complete guide to setting up your account and submitting your first expense',
      category: 'getting-started',
      duration: '10 min',
      difficulty: 'Beginner',
      type: 'article',
      url: '#',
      views: 1234,
      rating: 4.8
    },
    {
      id: '2',
      title: 'Advanced Expense Management',
      description: 'Learn about bulk operations, custom categories, and workflow automation',
      category: 'expenses',
      duration: '15 min',
      difficulty: 'Advanced',
      type: 'video',
      url: '#',
      views: 567,
      rating: 4.6
    },
    {
      id: '3',
      title: 'Setting Up Approval Workflows',
      description: 'Configure custom approval rules and business logic for your organization',
      category: 'admin',
      duration: '20 min',
      difficulty: 'Intermediate',
      type: 'article',
      url: '#',
      views: 345,
      rating: 4.7
    },
    {
      id: '4',
      title: 'Bank Statement Processing Guide',
      description: 'How to upload and process bank statements for automatic transaction matching',
      category: 'bank-statements',
      duration: '12 min',
      difficulty: 'Intermediate',
      type: 'pdf',
      url: '#',
      views: 289,
      rating: 4.5
    },
    {
      id: '5',
      title: 'Mobile App User Guide',
      description: 'Complete guide to using ExpenseFlow Pro on your mobile device',
      category: 'mobile',
      duration: '8 min',
      difficulty: 'Beginner',
      type: 'video',
      url: '#',
      views: 892,
      rating: 4.9
    }
  ];

  const categories = [
    { id: 'all', name: 'All Categories', count: faqs.length },
    { id: 'expenses', name: 'Expenses', count: faqs.filter(f => f.category === 'expenses').length },
    { id: 'documents', name: 'Documents', count: faqs.filter(f => f.category === 'documents').length },
    { id: 'approvals', name: 'Approvals', count: faqs.filter(f => f.category === 'approvals').length },
    { id: 'reports', name: 'Reports', count: faqs.filter(f => f.category === 'reports').length },
    { id: 'admin', name: 'Administration', count: faqs.filter(f => f.category === 'admin').length }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredGuides = guides.filter(guide => {
    const matchesSearch = guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guide.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'pdf': return <Download className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
            <p className="text-xl text-gray-600 mb-8">
              Find answers to your questions and learn how to make the most of ExpenseFlow Pro
            </p>
            
            {/* Search */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search for help articles, guides, or FAQs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 py-4 text-lg"
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <MessageCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Live Chat</h3>
                <p className="text-gray-600 mb-4">Get instant help from our support team</p>
                <Button className="w-full">Start Chat</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Mail className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Email Support</h3>
                <p className="text-gray-600 mb-4">Send us a detailed message</p>
                <Button variant="outline" className="w-full">Send Email</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Phone className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Phone Support</h3>
                <p className="text-gray-600 mb-4">Call us during business hours</p>
                <Button variant="outline" className="w-full">+48 123 456 789</Button>
              </CardContent>
            </Card>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* FAQs */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <HelpCircle className="w-6 h-6 mr-2" />
                Frequently Asked Questions
              </h2>
              
              <div className="space-y-4">
                {filteredFAQs.map((faq) => (
                  <Card key={faq.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <button
                        onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                        className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50"
                      >
                        <h3 className="font-medium text-gray-900 pr-4">{faq.question}</h3>
                        {expandedFAQ === faq.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      
                      {expandedFAQ === faq.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-6 pb-6"
                        >
                          <p className="text-gray-600 mb-4">{faq.answer}</p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              <span className="flex items-center">
                                <Star className="w-4 h-4 mr-1" />
                                {faq.helpful} helpful
                              </span>
                              <span className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                {faq.views} views
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                👍 Helpful
                              </Button>
                              <Button size="sm" variant="outline">
                                👎 Not helpful
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredFAQs.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQs found</h3>
                    <p className="text-gray-600">Try adjusting your search or category filter</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Guides */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Book className="w-6 h-6 mr-2" />
                User Guides & Tutorials
              </h2>
              
              <div className="space-y-4">
                {filteredGuides.map((guide) => (
                  <Card key={guide.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getTypeIcon(guide.type)}
                            <h3 className="font-semibold text-gray-900">{guide.title}</h3>
                          </div>
                          <p className="text-gray-600 mb-3">{guide.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {guide.duration}
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {guide.views} views
                            </div>
                            <div className="flex items-center">
                              <Star className="w-4 h-4 mr-1 text-yellow-500" />
                              {guide.rating}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col items-end space-y-2">
                          <Badge className={getDifficultyColor(guide.difficulty)}>
                            {guide.difficulty}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Open
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredGuides.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Book className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No guides found</h3>
                    <p className="text-gray-600">Try adjusting your search or category filter</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Still need help?</CardTitle>
              <CardDescription>
                Our support team is here to help you with any questions or issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <Mail className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h4 className="font-medium mb-1">Email Support</h4>
                  <p className="text-sm text-gray-600 mb-2">support@expenseflow.com</p>
                  <p className="text-xs text-gray-500">Response within 24 hours</p>
                </div>
                <div className="text-center">
                  <Phone className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h4 className="font-medium mb-1">Phone Support</h4>
                  <p className="text-sm text-gray-600 mb-2">+48 123 456 789</p>
                  <p className="text-xs text-gray-500">Mon-Fri, 9:00-17:00 CET</p>
                </div>
                <div className="text-center">
                  <MessageCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h4 className="font-medium mb-1">Live Chat</h4>
                  <p className="text-sm text-gray-600 mb-2">Available in app</p>
                  <p className="text-xs text-gray-500">Mon-Fri, 9:00-17:00 CET</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 