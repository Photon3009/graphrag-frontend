import React, { useState, useEffect, useRef } from 'react';
import { Send, Database, MessageCircle, Trash2, BarChart3, Settings, Upload, Play, Loader2, CheckCircle, AlertCircle, Info, DollarSign, Clock, Zap, TrendingUp, TrendingDown } from 'lucide-react';

const GraphRAGFrontend = () => {
  const [activeTab, setActiveTab] = useState('build');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [graphStats, setGraphStats] = useState(null);
  const [buildText, setBuildText] = useState('');
  const [buildStatus, setBuildStatus] = useState(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [costData, setCostData] = useState(null);
  const [selectedApproach, setSelectedApproach] = useState('comparison'); // 'comparison', 'hybrid', 'graph', 'rag'
  const [clearExisting, setClearExisting] = useState(false);
  const messagesEndRef = useRef(null);

  // No sample texts - users must provide their own data

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load graph stats and cost data on component mount
    loadGraphStats();
    loadCostData();
  }, []);

  const loadGraphStats = async () => {
    try {
      const stats = await getGraphStatsAPI();
      setGraphStats(stats);
    } catch (error) {
      console.error('Error loading graph stats:', error);
      setGraphStats(null);
    }
  };

  const loadCostData = async () => {
    try {
      const costs = await getCostsAPI();
      setCostData(costs);
    } catch (error) {
      console.error('Error loading cost data:', error);
      setCostData(null);
    }
  };

  const buildGraph = async (clearExisting = false) => {
    if (!buildText.trim()) {
      setBuildStatus({ type: 'error', message: 'Please enter text to process' });
      return;
    }

    setIsBuilding(true);
    setBuildStatus(null);

    try {
      if (clearExisting) {
        setBuildStatus({ 
          type: 'info', 
          message: 'Clearing existing graph data...',
          details: null
        });
      }
      
      const response = await buildGraphAPI(buildText, clearExisting);
      
      setBuildStatus({
        type: 'success',
        message: `Graph built successfully! Created ${response.stats.nodes} nodes and ${response.stats.relationships} relationships.`,
        details: response
      });
      
      // Reload graph stats and costs
      await loadGraphStats();
      await loadCostData();
      
    } catch (error) {
      setBuildStatus({
        type: 'error',
        message: `Error building graph: ${error.message}`
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = { role: 'user', content: inputMessage, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      let response;
      
      if (selectedApproach === 'comparison') {
        // Use comparison endpoint to get all three approaches
        response = await comparisonQueryAPI(inputMessage);
      } else {
        // Use specific approach endpoint
        response = await queryGraphAPI(inputMessage, selectedApproach);
      }
      
      const botMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        approach: selectedApproach,
        isComparison: selectedApproach === 'comparison'
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Reload cost data after query
      await loadCostData();
      
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  // API Configuration
  const API_BASE_URL = process.env.API_BASE_URL;

  // API Helper Functions
  const apiCall = async (endpoint, method = 'GET', data = null) => {
    try {
      const config = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to API server. Make sure the Flask API is running on http://localhost:5001');
      }
      throw error;
    }
  };

  // Real API functions
  const buildGraphAPI = async (text, clearExisting) => {
    const result = await apiCall('/graph/build', 'POST', {
      text,
      clear_existing: clearExisting
    });
    return result.result;
  };

  const queryGraphAPI = async (question, approach = 'hybrid') => {
    const result = await apiCall('/graph/query', 'POST', {
      question,
      verbose: false,
      approach: approach
    });
    return result;
  };

  const comparisonQueryAPI = async (question) => {
    const result = await apiCall('/comparison/query', 'POST', {
      question
    });
    return result;
  };

  const getGraphStatsAPI = async () => {
    const result = await apiCall('/graph/stats');
    return result.data;
  };

  const getCostsAPI = async () => {
    const result = await apiCall('/costs/current');
    return result.data;
  };

  const renderComparisonResults = (message) => {
    if (!message.content.results) return null;

    const { results, performance_summary } = message.content;
    
    return (
      <div className="space-y-4">
        {/* Performance Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Performance Summary
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span className="text-gray-700">Fastest:</span>
              <span className="font-medium text-blue-800 capitalize">{performance_summary.fastest}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-green-600" />
              <span className="text-gray-700">Richest Context:</span>
              <span className="font-medium text-green-800 capitalize">{performance_summary.richest_context}</span>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Object.entries(results).map(([key, result]) => (
            <div key={key} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-semibold text-gray-900 text-sm">{result.name}</h5>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{(result.total_time * 1000).toFixed(0)}ms</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Answer:</p>
                  <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded border">
                    {result.answer}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">Context ({result.context_length} chars):</p>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border max-h-32 overflow-y-auto">
                    {result.context}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="font-medium text-blue-800">{(result.retrieval_time * 1000).toFixed(0)}ms</div>
                    <div className="text-blue-600">Retrieval</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="font-medium text-green-800">{(result.answer_time * 1000).toFixed(0)}ms</div>
                    <div className="text-green-600">Generation</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSingleResult = (message) => {
    if (!message.content.answer) return null;
    
    return (
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Answer:</p>
          <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded border">
            {message.content.answer}
          </p>
        </div>
        
        {message.content.context && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Context:</p>
            <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border max-h-32 overflow-y-auto">
              {message.content.context}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">GraphRAG System</h1>
              <p className="text-sm text-gray-500">Build knowledge graphs and query with natural language</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {costData && (
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span>${costData.total_cost.toFixed(4)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span>{costData.total_tokens.toLocaleString()}</span>
                </div>
              </div>
            )}
            
            {graphStats && (
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{graphStats.nodes} Nodes</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{graphStats.relationships} Relationships</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('build')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'build'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload className="inline h-4 w-4 mr-2" />
            Build Graph
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'chat'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageCircle className="inline h-4 w-4 mr-2" />
            Query Graph
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="inline h-4 w-4 mr-2" />
            Statistics
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {/* Build Graph Tab */}
        {activeTab === 'build' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Build Knowledge Graph</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Enter text to extract entities and relationships, then build your knowledge graph
                </p>
              </div>
              
              <div className="p-6">
                {/* Removed sample text selection - users must provide their own text */}
                
                {/* Text Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Text
                  </label>
                  <textarea
                    value={buildText}
                    onChange={(e) => setBuildText(e.target.value)}
                    placeholder="Enter the text you want to process into a knowledge graph..."
                    rows={8}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Build Options */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={clearExisting}
                        onChange={(e) => setClearExisting(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                      />
                      <span className="ml-2 text-sm text-gray-600">Clear existing graph data</span>
                    </label>
                    {clearExisting && (
                      <p className="ml-6 mt-1 text-xs text-orange-600">
                        ⚠️ This will delete all existing entities and relationships before building the new graph
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => buildGraph(clearExisting)}
                    disabled={isBuilding || !buildText.trim()}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBuilding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span>{isBuilding ? 'Building Graph...' : 'Build Graph'}</span>
                  </button>
                </div>

                {/* Build Status */}
                {buildStatus && (
                  <div className={`mt-4 p-4 rounded-lg ${
                    buildStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 
                    buildStatus.type === 'error' ? 'bg-red-50 border border-red-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {buildStatus.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : buildStatus.type === 'error' ? (
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Loader2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0 animate-spin" />
                      )}
                      <div>
                        <p className={`font-medium ${
                          buildStatus.type === 'success' ? 'text-green-800' : 
                          buildStatus.type === 'error' ? 'text-red-800' :
                          'text-blue-800'
                        }`}>
                          {buildStatus.message}
                        </p>
                        {buildStatus.details && buildStatus.type === 'success' && (
                          <div className="mt-2 text-sm text-green-700">
                            <p>• Entities created: {buildStatus.details.entities_created}</p>
                            <p>• Relationships created: {buildStatus.details.relationships_created}</p>
                            {buildStatus.details.entities_failed > 0 && (
                              <p>• Entities failed: {buildStatus.details.entities_failed}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Query Graph Tab */}
        {activeTab === 'chat' && (
          <div className="max-w-6xl mx-auto h-full flex flex-col">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full min-h-[600px]">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Query Knowledge Graph</h2>
                    <p className="text-sm text-gray-600">Ask questions about your knowledge graph in natural language</p>
                  </div>
                  <button
                    onClick={clearMessages}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Clear conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Approach Selection */}
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">Query Approach:</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedApproach('comparison')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                        selectedApproach === 'comparison'
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <TrendingUp className="inline h-3 w-3 mr-1" />
                      Compare All
                    </button>
                    <button
                      onClick={() => setSelectedApproach('hybrid')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                        selectedApproach === 'hybrid'
                          ? 'bg-purple-100 border-purple-300 text-purple-800'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Zap className="inline h-3 w-3 mr-1" />
                      Hybrid
                    </button>
                    <button
                      onClick={() => setSelectedApproach('graph')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                        selectedApproach === 'graph'
                          ? 'bg-green-100 border-green-300 text-green-800'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Database className="inline h-3 w-3 mr-1" />
                      Graph Only
                    </button>
                    <button
                      onClick={() => setSelectedApproach('rag')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                        selectedApproach === 'rag'
                          ? 'bg-orange-100 border-orange-300 text-orange-800'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <MessageCircle className="inline h-3 w-3 mr-1" />
                      RAG Only
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
                    <p className="text-gray-500 mb-4">Ask questions about your knowledge graph</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                      <button
                        onClick={() => setInputMessage("Who is Donald Trump?")}
                        className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-sm"
                      >
                        "Who is Donald Trump?"
                      </button>
                      <button
                        onClick={() => setInputMessage("What companies did Donald Trump own?")}
                        className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-sm"
                      >
                        "What companies did Donald Trump own?"
                      </button>
                      <button
                        onClick={() => setInputMessage("Where did Donald Trump go to school?")}
                        className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-sm"
                      >
                        "Where did Donald Trump go to school?"
                      </button>
                      <button
                        onClick={() => setInputMessage("List all entities in the graph")}
                        className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-sm"
                      >
                        "List all entities in the graph"
                      </button>
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div key={index} className="space-y-2">
                    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-4xl px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : message.error
                          ? 'bg-red-50 text-red-800 border border-red-200'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.content.question || message.content}</p>
                        {message.approach && message.approach !== 'comparison' && (
                          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                            <span className="capitalize">{message.approach} approach</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Show results for assistant messages */}
                    {message.role === 'assistant' && !message.error && (
                      <div className="flex justify-start">
                        <div className="max-w-4xl w-full">
                          {message.isComparison ? (
                            renderComparisonResults(message)
                          ) : (
                            renderSingleResult(message)
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                        <span className="text-gray-600">
                          {selectedApproach === 'comparison' ? 'Comparing approaches...' : 'Thinking...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask a question about your knowledge graph..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Graph Overview */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Graph Overview</h3>
                {graphStats ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Nodes:</span>
                      <span className="font-semibold">{graphStats.nodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Relationships:</span>
                      <span className="font-semibold">{graphStats.relationships}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Graph Density:</span>
                      <span className="font-semibold">
                        {graphStats.nodes > 1 ? ((graphStats.relationships / (graphStats.nodes * (graphStats.nodes - 1))) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No graph data available</p>
                    <p className="text-sm text-gray-400">Build a graph first to see statistics</p>
                  </div>
                )}
              </div>

              {/* Cost Overview */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                  Cost Overview
                </h3>
                {costData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="font-semibold text-green-600">${costData.total_cost.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Tokens:</span>
                      <span className="font-semibold">{costData.total_tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Operations:</span>
                      <span className="font-semibold">{costData.total_operations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Cost/Op:</span>
                      <span className="font-semibold">${costData.average_cost_per_operation.toFixed(4)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No cost data available</p>
                    <p className="text-sm text-gray-400">Run some queries to see cost tracking</p>
                  </div>
                )}
              </div>

              {/* Node Types */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Node Types</h3>
                {graphStats?.entity_types ? (
                  <div className="space-y-2">
                    {graphStats.entity_types
                      .sort((a, b) => b.count - a.count)
                      .map((entityType, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-gray-600">{entityType.labels.join(', ')}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(entityType.count / Math.max(...graphStats.entity_types.map(et => et.count))) * 100}%`
                                }}
                              ></div>
                            </div>
                            <span className="font-semibold text-sm w-8 text-right">{entityType.count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </div>

              {/* Cost Breakdown */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
                {costData?.costs_by_operation ? (
                  <div className="space-y-2">
                    {Object.entries(costData.costs_by_operation)
                      .sort(([,a], [,b]) => b - a)
                      .map(([operation, cost]) => (
                        <div key={operation} className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm capitalize">{operation.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-sm text-green-600">${cost.toFixed(4)}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No cost breakdown available</p>
                )}
              </div>

              {/* Graph Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{graphStats?.nodes || 0}</div>
                    <div className="text-sm text-gray-600">Total Nodes</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{graphStats?.relationships || 0}</div>
                    <div className="text-sm text-gray-600">Total Relationships</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{graphStats?.entity_types?.length || 0}</div>
                    <div className="text-sm text-gray-600">Entity Types</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">${costData?.total_cost?.toFixed(4) || '0.0000'}</div>
                    <div className="text-sm text-gray-600">Total Cost</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GraphRAGFrontend;