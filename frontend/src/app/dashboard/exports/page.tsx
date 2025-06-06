'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Download, Clock, FileText, Settings, Play, Pause, Trash2, Plus, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ExportJob {
  exportId: string;
  format: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  recordCount?: number;
  fileName?: string;
  fileSize?: number;
  startTime: string;
  endTime?: string;
  options: any;
}

interface ScheduledExport {
  taskId: string;
  name: string;
  schedule: string;
  format: string;
  enabled: boolean;
  lastRunAt?: string;
  lastRunStatus?: string;
  nextRunAt?: string;
  exportConfig: any;
}

interface ExportTemplate {
  id: string;
  name: string;
  software: string;
  format: string;
  description: string;
}

export default function ExportsPage() {
  const [activeExports, setActiveExports] = useState<ExportJob[]>([]);
  const [scheduledExports, setScheduledExports] = useState<ScheduledExport[]>([]);
  const [exportHistory, setExportHistory] = useState<any[]>([]);
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Export form state
  const [exportForm, setExportForm] = useState({
    format: 'csv',
    template: '',
    period: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date()
    },
    dataType: 'expenses',
    filters: {},
    options: {}
  });

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    schedule: '0 0 * * 1', // Weekly on Monday
    enabled: true,
    exportConfig: {}
  });

  // Custom template form state
  const [customTemplateForm, setCustomTemplateForm] = useState({
    name: '',
    description: '',
    templateSource: '',
    outputFormat: 'csv',
    category: 'custom'
  });

  const [selectedTab, setSelectedTab] = useState('create');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchActiveExports, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchActiveExports(),
      fetchScheduledExports(),
      fetchExportHistory(),
      fetchTemplates()
    ]);
  };

  const fetchActiveExports = async () => {
    try {
      const response = await fetch('/api/v1/exports/active');
      const data = await response.json();
      if (data.success) {
        setActiveExports(data.data);
      }
    } catch (error) {
      console.error('Error fetching active exports:', error);
    }
  };

  const fetchScheduledExports = async () => {
    try {
      const response = await fetch('/api/v1/exports/scheduled');
      const data = await response.json();
      if (data.success) {
        setScheduledExports(data.data);
      }
    } catch (error) {
      console.error('Error fetching scheduled exports:', error);
    }
  };

  const fetchExportHistory = async () => {
    try {
      const response = await fetch('/api/v1/exports/history?limit=20');
      const data = await response.json();
      if (data.success) {
        setExportHistory(data.data.exports);
      }
    } catch (error) {
      console.error('Error fetching export history:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/v1/exports/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleCreateExport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/exports/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportForm),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Export started successfully!');
        fetchActiveExports();
      } else {
        toast.error(`Export failed: ${data.error}`);
      }
    } catch (error) {
      toast.error('Failed to create export');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickExport = async (template: string) => {
    setLoading(true);
    try {
      const endpoint = `/api/v1/exports/${template}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period: exportForm.period
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`${template} export started successfully!`);
        fetchActiveExports();
      } else {
        toast.error(`Export failed: ${data.error}`);
      }
    } catch (error) {
      toast.error('Failed to create export');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleExport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/exports/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...scheduleForm,
          exportConfig: exportForm
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Export scheduled successfully!');
        fetchScheduledExports();
        setScheduleForm({
          name: '',
          schedule: '0 0 * * 1',
          enabled: true,
          exportConfig: {}
        });
      } else {
        toast.error(`Failed to schedule export: ${data.error}`);
      }
    } catch (error) {
      toast.error('Failed to schedule export');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExport = async (exportId: string) => {
    try {
      const response = await fetch(`/api/v1/exports/download/${exportId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('content-disposition')?.split('filename=')[1] || 'export.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast.error('Failed to download export');
      }
    } catch (error) {
      toast.error('Failed to download export');
    }
  };

  const handleCancelExport = async (exportId: string) => {
    try {
      const response = await fetch(`/api/v1/exports/cancel/${exportId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Export cancelled successfully');
        fetchActiveExports();
      } else {
        toast.error('Failed to cancel export');
      }
    } catch (error) {
      toast.error('Failed to cancel export');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500';
      case 'PROCESSING': return 'bg-blue-500';
      case 'FAILED': return 'bg-red-500';
      case 'CANCELLED': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Export Center</h1>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="create">Create Export</TabsTrigger>
          <TabsTrigger value="active">Active ({activeExports.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({scheduledExports.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Create Export Tab */}
        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Export Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-500" />
                  QuickBooks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Export expenses in QuickBooks CSV format
                </p>
                <Button 
                  onClick={() => handleQuickExport('quickbooks')}
                  disabled={loading}
                  className="w-full"
                >
                  Export to QuickBooks
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-500" />
                  Xero
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Export bank transactions for Xero
                </p>
                <Button 
                  onClick={() => handleQuickExport('xero')}
                  disabled={loading}
                  className="w-full"
                >
                  Export to Xero
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-purple-500" />
                  Sage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Export in Sage XML format
                </p>
                <Button 
                  onClick={() => handleQuickExport('sage')}
                  disabled={loading}
                  className="w-full"
                >
                  Export to Sage
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Custom Export Form */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select 
                    value={exportForm.format} 
                    onValueChange={(value) => setExportForm({...exportForm, format: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                      <SelectItem value="pdf">PDF Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select 
                    value={exportForm.template} 
                    onValueChange={(value) => setExportForm({...exportForm, template: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Default</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !exportForm.period.start && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {exportForm.period.start ? format(exportForm.period.start, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={exportForm.period.start}
                        onSelect={(date) => date && setExportForm({
                          ...exportForm, 
                          period: {...exportForm.period, start: date}
                        })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !exportForm.period.end && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {exportForm.period.end ? format(exportForm.period.end, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={exportForm.period.end}
                        onSelect={(date) => date && setExportForm({
                          ...exportForm, 
                          period: {...exportForm.period, end: date}
                        })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={handleScheduleExport} disabled={loading}>
                  <Clock className="w-4 h-4 mr-2" />
                  Schedule Export
                </Button>
                <Button onClick={handleCreateExport} disabled={loading}>
                  <Download className="w-4 h-4 mr-2" />
                  {loading ? 'Creating...' : 'Create Export'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Exports Tab */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Exports</CardTitle>
            </CardHeader>
            <CardContent>
              {activeExports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No active exports
                </div>
              ) : (
                <div className="space-y-4">
                  {activeExports.map((job) => (
                    <div key={job.exportId} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{job.format.toUpperCase()} Export</h3>
                          <p className="text-sm text-gray-600">
                            Started: {format(new Date(job.startTime), "PPp")}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                          {job.status === 'PROCESSING' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelExport(job.exportId)}
                            >
                              Cancel
                            </Button>
                          )}
                          {job.status === 'COMPLETED' && job.fileName && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadExport(job.exportId)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {job.status === 'PROCESSING' && (
                        <div className="space-y-2">
                          <Progress value={job.progress} className="w-full" />
                          <p className="text-sm text-gray-600">{job.progress}% complete</p>
                        </div>
                      )}
                      {job.status === 'COMPLETED' && (
                        <div className="text-sm text-gray-600">
                          {job.recordCount} records • {job.fileSize && formatFileSize(job.fileSize)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Exports Tab */}
        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Scheduled Exports
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Schedule
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scheduledExports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No scheduled exports
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduledExports.map((schedule) => (
                    <div key={schedule.taskId} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{schedule.name}</h3>
                          <p className="text-sm text-gray-600">
                            Schedule: {schedule.schedule} • Format: {schedule.format.toUpperCase()}
                          </p>
                          {schedule.lastRunAt && (
                            <p className="text-sm text-gray-600">
                              Last run: {format(new Date(schedule.lastRunAt), "PPp")} • 
                              Status: {schedule.lastRunStatus}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={schedule.enabled ? "default" : "secondary"}>
                            {schedule.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                          <Button variant="outline" size="sm">
                            {schedule.enabled ? <Pause /> : <Play />}
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
            </CardHeader>
            <CardContent>
              {exportHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No export history
                </div>
              ) : (
                <div className="space-y-4">
                  {exportHistory.map((export_item) => (
                    <div key={export_item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{export_item.format.toUpperCase()} Export</h3>
                          <p className="text-sm text-gray-600">
                            {format(new Date(export_item.createdAt), "PPp")}
                          </p>
                          <p className="text-sm text-gray-600">
                            {export_item.recordCount} records • {export_item.fileSize && formatFileSize(export_item.fileSize)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadExport(export_item.exportId)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Export Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">{template.format.toUpperCase()}</Badge>
                        <Badge variant="secondary">{template.software}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 