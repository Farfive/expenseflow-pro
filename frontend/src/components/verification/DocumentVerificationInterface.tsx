'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Save, 
  Undo, 
  Redo, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Check, 
  AlertTriangle, 
  FileText,
  Eye,
  Keyboard,
  Lightbulb,
  History,
  Copy,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface ExtractedField {
  id: string;
  label: string;
  value: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fieldType: 'amount' | 'date' | 'vendor' | 'description' | 'category' | 'other';
  required: boolean;
  suggestions?: string[];
  validationRules?: ValidationRule[];
}

interface ValidationRule {
  type: 'required' | 'format' | 'range' | 'pattern';
  message: string;
  value?: any;
}

interface DocumentData {
  id: string;
  fileName: string;
  fileUrl: string;
  documentType: 'receipt' | 'invoice' | 'bank_statement' | 'other';
  extractedFields: ExtractedField[];
  qualityScore: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  template?: DocumentTemplate;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  fields: Partial<ExtractedField>[];
  rules: ValidationRule[];
}

interface HistoryState {
  timestamp: number;
  action: string;
  fields: ExtractedField[];
}

interface Props {
  document: DocumentData;
  onSave: (document: DocumentData) => Promise<void>;
  onNext?: () => void;
  onPrevious?: () => void;
  templates?: DocumentTemplate[];
  similarDocuments?: DocumentData[];
}

export default function DocumentVerificationInterface({ 
  document, 
  onSave, 
  onNext, 
  onPrevious,
  templates = [],
  similarDocuments = []
}: Props) {
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>(document.extractedFields);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showConfidence, setShowConfidence] = useState(true);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [showHistory, setShowHistory] = useState(false);
  
  const imageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Add to history
  const addToHistory = useCallback((action: string, fields: ExtractedField[]) => {
    const newHistoryState: HistoryState = {
      timestamp: Date.now(),
      action,
      fields: JSON.parse(JSON.stringify(fields))
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newHistoryState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo/Redo functionality
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setExtractedFields(history[historyIndex - 1].fields);
      toast.success('Undone');
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setExtractedFields(history[historyIndex + 1].fields);
      toast.success('Redone');
    }
  }, [history, historyIndex]);

  // Update field value
  const updateField = useCallback((fieldId: string, newValue: string) => {
    const updatedFields = extractedFields.map(field =>
      field.id === fieldId ? { ...field, value: newValue } : field
    );
    
    setExtractedFields(updatedFields);
    addToHistory(`Updated field: ${extractedFields.find(f => f.id === fieldId)?.label}`, updatedFields);
    
    // Validate field
    validateField(fieldId, newValue);
  }, [extractedFields, addToHistory]);

  // Field validation
  const validateField = useCallback((fieldId: string, value: string) => {
    const field = extractedFields.find(f => f.id === fieldId);
    if (!field) return;

    const errors: string[] = [];
    
    field.validationRules?.forEach(rule => {
      switch (rule.type) {
        case 'required':
          if (!value || value.trim() === '') {
            errors.push(rule.message);
          }
          break;
        case 'format':
          if (rule.value && !new RegExp(rule.value).test(value)) {
            errors.push(rule.message);
          }
          break;
        case 'range':
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && rule.value) {
            const { min, max } = rule.value;
            if ((min !== undefined && numValue < min) || (max !== undefined && numValue > max)) {
              errors.push(rule.message);
            }
          }
          break;
      }
    });

    setValidationErrors(prev => ({
      ...prev,
      [fieldId]: errors
    }));
  }, [extractedFields]);

  // Get suggestions for field
  const getSuggestions = useCallback(async (fieldId: string, value: string) => {
    try {
      const response = await fetch('/api/verification/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldId,
          value,
          documentType: document.documentType,
          similarDocuments: similarDocuments.map(d => d.id)
        })
      });
      
      if (response.ok) {
        const { suggestions: newSuggestions } = await response.json();
        setSuggestions(prev => ({
          ...prev,
          [fieldId]: newSuggestions
        }));
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  }, [document.documentType, similarDocuments]);

  // Batch update selected fields
  const batchUpdate = useCallback((value: string) => {
    const updatedFields = extractedFields.map(field =>
      selectedFields.has(field.id) ? { ...field, value } : field
    );
    
    setExtractedFields(updatedFields);
    addToHistory(`Batch updated ${selectedFields.size} fields`, updatedFields);
    setBatchMode(false);
    setSelectedFields(new Set());
    toast.success(`Updated ${selectedFields.size} fields`);
  }, [extractedFields, selectedFields, addToHistory]);

  // Apply template
  const applyTemplate = useCallback((template: DocumentTemplate) => {
    const updatedFields = extractedFields.map(field => {
      const templateField = template.fields.find(tf => tf.label === field.label);
      return templateField ? { ...field, ...templateField } : field;
    });
    
    setExtractedFields(updatedFields);
    addToHistory(`Applied template: ${template.name}`, updatedFields);
    toast.success(`Applied template: ${template.name}`);
  }, [extractedFields, addToHistory]);

  // Copy from similar document
  const copyFromSimilar = useCallback((sourceDoc: DocumentData) => {
    const updatedFields = extractedFields.map(field => {
      const sourceField = sourceDoc.extractedFields.find(sf => sf.label === field.label);
      return sourceField ? { ...field, value: sourceField.value } : field;
    });
    
    setExtractedFields(updatedFields);
    addToHistory(`Copied from: ${sourceDoc.fileName}`, updatedFields);
    toast.success(`Copied data from ${sourceDoc.fileName}`);
  }, [extractedFields, addToHistory]);

  // Save document
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updatedDocument = {
        ...document,
        extractedFields,
        qualityScore: calculateQualityScore(extractedFields, validationErrors)
      };
      
      await onSave(updatedDocument);
      toast.success('Document saved successfully');
    } catch (error) {
      toast.error('Failed to save document');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }, [document, extractedFields, validationErrors, onSave]);

  // Calculate quality score
  const calculateQualityScore = useCallback((fields: ExtractedField[], errors: Record<string, string[]>) => {
    const totalFields = fields.length;
    const completedFields = fields.filter(f => f.value && f.value.trim() !== '').length;
    const errorCount = Object.values(errors).flat().length;
    const averageConfidence = fields.reduce((acc, field) => acc + field.confidence, 0) / totalFields;
    
    const completionScore = (completedFields / totalFields) * 0.4;
    const errorScore = Math.max(0, (totalFields - errorCount) / totalFields) * 0.3;
    const confidenceScore = averageConfidence * 0.3;
    
    return Math.round((completionScore + errorScore + confidenceScore) * 100);
  }, []);

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500';
    if (confidence >= 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get confidence label
  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  // Navigate to next/previous field
  const navigateField = useCallback((direction: 'next' | 'prev') => {
    const currentIndex = extractedFields.findIndex(f => f.id === selectedField);
    let nextIndex;
    
    if (direction === 'next') {
      nextIndex = currentIndex < extractedFields.length - 1 ? currentIndex + 1 : 0;
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : extractedFields.length - 1;
    }
    
    setSelectedField(extractedFields[nextIndex].id);
  }, [extractedFields, selectedField]);

  // Keyboard shortcuts
  useHotkeys('ctrl+s', (e) => {
    e.preventDefault();
    handleSave();
  });

  useHotkeys('ctrl+z', (e) => {
    e.preventDefault();
    undo();
  });

  useHotkeys('ctrl+y', (e) => {
    e.preventDefault();
    redo();
  });

  useHotkeys('ctrl+shift+k', (e) => {
    e.preventDefault();
    setShowKeyboardShortcuts(!showKeyboardShortcuts);
  });

  useHotkeys('ctrl+b', (e) => {
    e.preventDefault();
    setBatchMode(!batchMode);
  });

  useHotkeys('escape', () => {
    setSelectedField(null);
    setBatchMode(false);
    setSelectedFields(new Set());
  });

  useHotkeys('tab', (e) => {
    e.preventDefault();
    navigateField('next');
  });

  useHotkeys('shift+tab', (e) => {
    e.preventDefault();
    navigateField('prev');
  });

  // Initialize history
  useEffect(() => {
    if (history.length === 0) {
      addToHistory('Initial state', extractedFields);
    }
  }, [addToHistory, extractedFields, history.length]);

  const qualityScore = calculateQualityScore(extractedFields, validationErrors);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!onPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div>
            <h1 className="text-xl font-semibold">{document.fileName}</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Badge variant="outline">{document.documentType}</Badge>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  qualityScore >= 80 ? 'bg-green-500' : 
                  qualityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span>Quality: {qualityScore}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4" />
            History
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
          >
            <Keyboard className="h-4 w-4" />
            Shortcuts
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={historyIndex <= 0}
          >
            <Undo className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!onNext}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quality Score Bar */}
      <div className="bg-white border-b px-6 py-2">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">Quality Score:</span>
          <div className="flex-1">
            <Progress value={qualityScore} className="h-2" />
          </div>
          <span className="text-sm text-gray-600">{qualityScore}%</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Document View */}
        <div className="flex-1 bg-white border-r">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(zoom * 1.2)}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(zoom / 1.2)}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRotation((rotation + 90) % 360)}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-500">{Math.round(zoom * 100)}%</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showConfidence}
                  onChange={(e) => setShowConfidence(e.target.checked)}
                  className="rounded"
                />
                <span>Show Confidence</span>
              </label>
            </div>
          </div>
          
          <div className="relative overflow-auto h-full" ref={imageRef}>
            <div className="relative">
              <img
                src={document.fileUrl}
                alt={document.fileName}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center'
                }}
                className="max-w-none mx-auto"
              />
              
              {/* Bounding boxes overlay */}
              {showConfidence && extractedFields.map(field => (
                field.boundingBox && (
                  <div
                    key={field.id}
                    className={`absolute border-2 cursor-pointer transition-all ${
                      selectedField === field.id
                        ? 'border-blue-500 bg-blue-100 bg-opacity-30'
                        : 'border-yellow-400 hover:border-blue-400'
                    }`}
                    style={{
                      left: field.boundingBox.x * zoom,
                      top: field.boundingBox.y * zoom,
                      width: field.boundingBox.width * zoom,
                      height: field.boundingBox.height * zoom,
                      transform: `rotate(${rotation}deg)`
                    }}
                    onClick={() => setSelectedField(field.id)}
                  >
                    {showConfidence && (
                      <div className="absolute -top-6 left-0 bg-white rounded px-1 text-xs shadow">
                        <div className={`inline-block w-2 h-2 rounded-full mr-1 ${getConfidenceColor(field.confidence)}`}></div>
                        {Math.round(field.confidence * 100)}%
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Data Panel */}
        <div className="w-96 bg-white overflow-y-auto">
          <Tabs defaultValue="fields" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="fields">Fields</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="similar">Similar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="fields" className="p-4 space-y-4">
              {batchMode && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Batch Edit Mode</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-600 mb-2">
                      {selectedFields.size} fields selected
                    </p>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Enter value for all selected fields"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            batchUpdate(e.currentTarget.value);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => setBatchMode(false)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="space-y-3">
                {extractedFields.map((field) => (
                  <Card 
                    key={field.id}
                    className={`transition-all cursor-pointer ${
                      selectedField === field.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:border-gray-300'
                    } ${
                      selectedFields.has(field.id) ? 'ring-2 ring-blue-200' : ''
                    }`}
                    onClick={() => {
                      if (batchMode) {
                        const newSelected = new Set(selectedFields);
                        if (newSelected.has(field.id)) {
                          newSelected.delete(field.id);
                        } else {
                          newSelected.add(field.id);
                        }
                        setSelectedFields(newSelected);
                      } else {
                        setSelectedField(field.id);
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        
                        <div className="flex items-center space-x-2">
                          {batchMode && (
                            <input
                              type="checkbox"
                              checked={selectedFields.has(field.id)}
                              onChange={() => {}}
                              className="rounded"
                            />
                          )}
                          
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getConfidenceColor(field.confidence)} text-white`}
                          >
                            {getConfidenceLabel(field.confidence)}
                          </Badge>
                        </div>
                      </div>
                      
                      <Input
                        value={field.value}
                        onChange={(e) => updateField(field.id, e.target.value)}
                        onFocus={() => {
                          setSelectedField(field.id);
                          getSuggestions(field.id, field.value);
                        }}
                        className={`text-sm ${
                          validationErrors[field.id]?.length 
                            ? 'border-red-500 focus:border-red-500' 
                            : ''
                        }`}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                      
                      {validationErrors[field.id]?.map((error, index) => (
                        <p key={index} className="text-xs text-red-500 mt-1 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {error}
                        </p>
                      ))}
                      
                      {suggestions[field.id]?.length > 0 && selectedField === field.id && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-500 flex items-center">
                            <Lightbulb className="h-3 w-3 mr-1" />
                            Suggestions:
                          </p>
                          {suggestions[field.id].slice(0, 3).map((suggestion, index) => (
                            <button
                              key={index}
                              className="block w-full text-left text-xs bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                              onClick={() => updateField(field.id, suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>Confidence: {Math.round(field.confidence * 100)}%</span>
                        {field.fieldType && (
                          <Badge variant="secondary" className="text-xs">
                            {field.fieldType}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBatchMode(!batchMode)}
                  className="flex-1"
                >
                  {batchMode ? 'Exit Batch' : 'Batch Edit'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFields(new Set(extractedFields.map(f => f.id)))}
                  disabled={!batchMode}
                  className="flex-1"
                >
                  Select All
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="templates" className="p-4 space-y-4">
              <div className="space-y-2">
                {templates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:border-blue-300">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          <p className="text-xs text-gray-500">
                            {template.description || `${template.fields.length} fields`}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => applyTemplate(template)}
                        >
                          Apply
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {templates.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No templates available</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="similar" className="p-4 space-y-4">
              <div className="space-y-2">
                {similarDocuments.map((doc) => (
                  <Card key={doc.id} className="cursor-pointer hover:border-blue-300">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{doc.fileName}</h4>
                          <p className="text-xs text-gray-500">
                            Quality: {doc.qualityScore}% • {doc.documentType}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyFromSimilar(doc)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {similarDocuments.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Copy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No similar documents found</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="fixed right-4 top-20 w-80 bg-white border rounded-lg shadow-lg z-40 max-h-96 overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Edit History</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(false)}
              >
                ×
              </Button>
            </div>
          </div>
          <div className="p-2">
            {history.map((item, index) => (
              <div
                key={index}
                className={`p-2 rounded mb-1 text-sm cursor-pointer ${
                  index === historyIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
                onClick={() => {
                  setHistoryIndex(index);
                  setExtractedFields(item.fields);
                }}
              >
                <div className="font-medium">{item.action}</div>
                <div className="text-xs text-gray-500">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Keyboard className="h-5 w-5 mr-2" />
                Keyboard Shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>Save:</span>
                <code className="bg-gray-100 px-1 rounded">Ctrl+S</code>
                
                <span>Undo:</span>
                <code className="bg-gray-100 px-1 rounded">Ctrl+Z</code>
                
                <span>Redo:</span>
                <code className="bg-gray-100 px-1 rounded">Ctrl+Y</code>
                
                <span>Batch Mode:</span>
                <code className="bg-gray-100 px-1 rounded">Ctrl+B</code>
                
                <span>Next Field:</span>
                <code className="bg-gray-100 px-1 rounded">Tab</code>
                
                <span>Previous Field:</span>
                <code className="bg-gray-100 px-1 rounded">Shift+Tab</code>
                
                <span>Cancel:</span>
                <code className="bg-gray-100 px-1 rounded">Escape</code>
                
                <span>This Help:</span>
                <code className="bg-gray-100 px-1 rounded">Ctrl+Shift+K</code>
              </div>
              
              <Button 
                onClick={() => setShowKeyboardShortcuts(false)}
                className="w-full"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 