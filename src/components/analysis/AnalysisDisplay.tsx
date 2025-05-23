import React, { useState } from 'react';
import { Copy, Check, FileText, Search, TrendingUp, Eye, ExternalLink } from 'lucide-react';
import { AnalysisDisplayTab, WebSource, AnalysisMetric } from '../../types/analysis';

interface AnalysisDisplayProps {
  tabs: AnalysisDisplayTab[];
  sources?: WebSource[];
  searchQueries?: string[];
  metrics?: AnalysisMetric[];
  className?: string;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
  tabs, 
  sources = [], 
  searchQueries = [], 
  metrics = [],
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState(tabs.length > 0 ? tabs[0].id : '');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const handleCopy = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemId);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Tab Navigation */}
      {tabs.length > 1 && (
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 p-1">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {IconComponent && <IconComponent className="w-4 h-4" />}
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Content Area */}
      <div className="p-6">
        {/* Metrics Section */}
        {metrics.length > 0 && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                    <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
                    {metric.description && (
                      <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
                    )}
                  </div>
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Tab Content */}
        {activeTabContent && (
          <div className="prose prose-sm max-w-none">
            {activeTabContent.content}
          </div>
        )}

        {/* Search Queries Section */}
        {searchQueries.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-800">Query Pencarian</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchQueries.map((query, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {query}
                  </span>
                  <button
                    onClick={() => handleCopy(query, `query-${index}`)}
                    className="p-1 hover:bg-blue-100 rounded transition-colors duration-200"
                    title="Salin query"
                  >
                    {copiedItem === `query-${index}` ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-blue-600" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sources Section */}
        {sources.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-800">Sumber Referensi</h3>
            </div>
            <div className="space-y-3">
              {sources.map((source, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow duration-200">
                  <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <a
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline break-words"
                        >
                          {source.title}
                        </a>
                        <p className="text-xs text-gray-500 mt-1 break-all">
                          {source.uri}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(source.uri, `source-${index}`)}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors duration-200"
                          title="Salin URL"
                        >
                          {copiedItem === `source-${index}` ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-600" />
                          )}
                        </button>
                        <a
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors duration-200"
                          title="Buka di tab baru"
                        >
                          <Eye className="w-3 h-3 text-gray-600" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisDisplay; 