/**
 * Smart Categorization Utilities
 * 
 * Uses NLP and machine learning to suggest expense categories
 */

import nlp from 'compromise';
import stringSimilarity from 'string-similarity';

export interface CategorySuggestion {
  id: string;
  name: string;
  confidence: number;
  reason: string;
}

export interface Category {
  id: string;
  name: string;
  keywords: string[];
  color: string;
  icon: string;
}

// Common expense category keywords
const categoryKeywords: Record<string, string[]> = {
  'meals': [
    'restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'food', 'meal',
    'mcdonalds', 'kfc', 'pizza', 'sushi', 'bar', 'pub', 'starbucks', 'dining',
    'catering', 'delivery', 'takeout', 'bistro', 'grill', 'kitchen', 'eating',
    'restauracja', 'kawiarnia', 'jedzenie', 'posiłek', 'śniadanie', 'obiad', 'kolacja'
  ],
  'travel': [
    'hotel', 'flight', 'train', 'bus', 'taxi', 'uber', 'lyft', 'rental', 'car',
    'gas', 'fuel', 'petrol', 'parking', 'toll', 'airport', 'airline', 'accommodation',
    'booking', 'reservation', 'transport', 'journey', 'trip', 'travel',
    'hotel', 'lot', 'pkp', 'paliwo', 'benzynA', 'parking', 'podróż', 'transport'
  ],
  'office': [
    'office', 'supplies', 'paper', 'pen', 'pencil', 'stapler', 'folder', 'notebook',
    'printer', 'ink', 'toner', 'desk', 'chair', 'computer', 'laptop', 'mouse',
    'keyboard', 'monitor', 'software', 'license', 'subscription', 'stationary',
    'biuro', 'papier', 'długopis', 'drukarka', 'komputer', 'oprogramowanie'
  ],
  'marketing': [
    'advertising', 'marketing', 'promotion', 'campaign', 'social', 'facebook',
    'google', 'ads', 'adwords', 'linkedin', 'twitter', 'instagram', 'website',
    'domain', 'hosting', 'design', 'graphics', 'printing', 'brochure', 'flyer',
    'reklama', 'promocja', 'kampania', 'strona', 'grafika', 'druk'
  ],
  'professional': [
    'consulting', 'lawyer', 'legal', 'accounting', 'audit', 'conference', 'seminar',
    'training', 'course', 'certification', 'membership', 'subscription', 'professional',
    'service', 'meeting', 'workshop', 'education', 'learning',
    'konsultant', 'prawnik', 'księgowy', 'konferencja', 'szkolenie', 'kurs'
  ],
  'utilities': [
    'electricity', 'gas', 'water', 'internet', 'phone', 'mobile', 'utilities',
    'bill', 'invoice', 'payment', 'service', 'maintenance', 'repair',
    'prąd', 'gaz', 'woda', 'internet', 'telefon', 'rachunek', 'naprawa'
  ],
  'equipment': [
    'equipment', 'hardware', 'tools', 'machinery', 'device', 'instrument',
    'camera', 'tablet', 'smartphone', 'headphones', 'speakers', 'cables',
    'sprzęt', 'narzędzia', 'urządzenie', 'kamera', 'tablet', 'słuchawki'
  ],
  'healthcare': [
    'doctor', 'medical', 'health', 'pharmacy', 'medicine', 'hospital', 'clinic',
    'dental', 'insurance', 'wellness', 'fitness', 'gym', 'therapy',
    'lekarz', 'apteka', 'szpital', 'klinika', 'ubezpieczenie', 'fitness'
  ]
};

// Polish-specific merchant patterns
const polishMerchantPatterns: Record<string, string> = {
  'żabka': 'meals',
  'biedronka': 'office',
  'lidl': 'office',
  'tesco': 'office',
  'carrefour': 'office',
  'media markt': 'equipment',
  'rtv euro agd': 'equipment',
  'allegro': 'office',
  'poczta polska': 'office',
  'orlen': 'travel',
  'bp': 'travel',
  'shell': 'travel',
  'lotos': 'travel',
  'pkp': 'travel',
  'lot': 'travel',
};

export const generateSmartCategories = async (
  merchantName: string,
  availableCategories: Category[]
): Promise<CategorySuggestion[]> => {
  const suggestions: CategorySuggestion[] = [];
  
  if (!merchantName) {
    return suggestions;
  }

  const normalizedMerchant = merchantName.toLowerCase().trim();
  
  // 1. Check Polish merchant patterns first
  for (const [pattern, categoryType] of Object.entries(polishMerchantPatterns)) {
    if (normalizedMerchant.includes(pattern)) {
      const category = findCategoryByType(availableCategories, categoryType);
      if (category) {
        suggestions.push({
          id: category.id,
          name: category.name,
          confidence: 0.9,
          reason: `Known merchant pattern: ${pattern}`,
        });
      }
    }
  }

  // 2. NLP-based keyword extraction
  const doc = nlp(merchantName);
  const nouns = doc.nouns().out('array');
  const adjectives = doc.adjectives().out('array');
  const words = [...nouns, ...adjectives, ...merchantName.split(/\s+/)];

  // 3. Match against category keywords
  for (const [categoryType, keywords] of Object.entries(categoryKeywords)) {
    let maxSimilarity = 0;
    let bestMatch = '';

    for (const word of words) {
      for (const keyword of keywords) {
        const similarity = stringSimilarity.compareTwoStrings(
          word.toLowerCase(),
          keyword.toLowerCase()
        );
        
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          bestMatch = keyword;
        }
      }
    }

    if (maxSimilarity > 0.6) {
      const category = findCategoryByType(availableCategories, categoryType);
      if (category && !suggestions.find(s => s.id === category.id)) {
        suggestions.push({
          id: category.id,
          name: category.name,
          confidence: maxSimilarity,
          reason: `Keyword match: "${bestMatch}"`,
        });
      }
    }
  }

  // 4. Direct category name similarity
  for (const category of availableCategories) {
    const similarity = stringSimilarity.compareTwoStrings(
      normalizedMerchant,
      category.name.toLowerCase()
    );

    if (similarity > 0.5 && !suggestions.find(s => s.id === category.id)) {
      suggestions.push({
        id: category.id,
        name: category.name,
        confidence: similarity,
        reason: `Category name similarity`,
      });
    }
  }

  // 5. Sort by confidence and return top suggestions
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
};

const findCategoryByType = (categories: Category[], type: string): Category | undefined => {
  // Map category types to common category names
  const typeMap: Record<string, string[]> = {
    'meals': ['meals', 'food', 'dining', 'restaurant', 'jedzenie'],
    'travel': ['travel', 'transport', 'podróże', 'transport'],
    'office': ['office', 'supplies', 'biuro', 'materiały'],
    'marketing': ['marketing', 'advertising', 'reklama'],
    'professional': ['professional', 'consulting', 'usługi'],
    'utilities': ['utilities', 'bills', 'rachunki'],
    'equipment': ['equipment', 'hardware', 'sprzęt'],
    'healthcare': ['health', 'medical', 'zdrowie'],
  };

  const searchTerms = typeMap[type] || [type];
  
  for (const category of categories) {
    for (const term of searchTerms) {
      if (category.name.toLowerCase().includes(term)) {
        return category;
      }
    }
  }

  return undefined;
};

// Analyze expense description for better categorization
export const analyzeExpenseDescription = (description: string): {
  suggestedCategory: string;
  confidence: number;
  extractedEntities: string[];
} => {
  const doc = nlp(description);
  
  // Extract entities
  const entities = [
    ...doc.people().out('array'),
    ...doc.places().out('array'),
    ...doc.organizations().out('array'),
    ...doc.nouns().out('array'),
  ];

  // Look for expense-related patterns
  const patterns = {
    business_meal: /\b(lunch|dinner|meeting|client|business)\b/i,
    travel_expense: /\b(flight|hotel|taxi|uber|travel|trip)\b/i,
    office_supply: /\b(office|supplies|paper|pen|computer|software)\b/i,
    conference: /\b(conference|seminar|training|workshop|event)\b/i,
    utilities: /\b(electric|gas|water|internet|phone|utilities)\b/i,
  };

  let bestMatch = '';
  let maxConfidence = 0;

  for (const [category, pattern] of Object.entries(patterns)) {
    const matches = description.match(pattern);
    if (matches) {
      const confidence = matches.length / description.split(' ').length;
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        bestMatch = category;
      }
    }
  }

  return {
    suggestedCategory: bestMatch,
    confidence: maxConfidence,
    extractedEntities: [...new Set(entities)], // Remove duplicates
  };
};

// Learn from user's categorization choices
export const learnFromUserChoice = (
  merchantName: string,
  selectedCategoryId: string,
  availableCategories: Category[]
): void => {
  try {
    // Store user preferences in localStorage for future suggestions
    const userPreferences = JSON.parse(
      localStorage.getItem('expenseCategorizationPreferences') || '{}'
    );

    const normalizedMerchant = merchantName.toLowerCase().trim();
    userPreferences[normalizedMerchant] = selectedCategoryId;

    localStorage.setItem(
      'expenseCategorizationPreferences',
      JSON.stringify(userPreferences)
    );
  } catch (error) {
    console.error('Error saving user categorization preference:', error);
  }
};

// Get user's historical categorization preferences
export const getUserPreferences = (): Record<string, string> => {
  try {
    return JSON.parse(
      localStorage.getItem('expenseCategorizationPreferences') || '{}'
    );
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return {};
  }
};

// Enhanced categorization with user preferences
export const generateEnhancedCategories = async (
  merchantName: string,
  availableCategories: Category[]
): Promise<CategorySuggestion[]> => {
  const suggestions = await generateSmartCategories(merchantName, availableCategories);
  const userPreferences = getUserPreferences();
  
  const normalizedMerchant = merchantName.toLowerCase().trim();
  
  // Check if user has a preference for this merchant
  if (userPreferences[normalizedMerchant]) {
    const preferredCategory = availableCategories.find(
      cat => cat.id === userPreferences[normalizedMerchant]
    );
    
    if (preferredCategory) {
      // Add user preference as highest confidence suggestion
      suggestions.unshift({
        id: preferredCategory.id,
        name: preferredCategory.name,
        confidence: 1.0,
        reason: 'Based on your previous choices',
      });
    }
  }

  return suggestions;
}; 