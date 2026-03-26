import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast.js';
import { Button } from '@/components/ui/button';
import ImageUpload from '@/components/ImageUpload.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import PredictionResult from '@/components/PredictionResult.jsx';
import ProbabilityDistributionChart from '@/components/ProbabilityDistributionChart.jsx';
import ResultsVisualsSection from '@/components/ResultsVisualsSection.jsx';
import MarkdownRenderer from '@/components/MarkdownRenderer.jsx';
import ErrorAlert from '@/components/ErrorAlert.jsx';
import { RefreshCw, Info, Sparkles, AlertTriangle } from 'lucide-react';

const PredictPage = () => {
  const [uploadView, setUploadView] = useState(true);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { toast } = useToast();

  const handleImageSelect = (imageData) => {
    setUploadedImage(imageData);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!uploadedImage) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', uploadedImage.file);

      // ✅ FIXED: using deployed backend URL from environment variable
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.status === 'error') {
        setError(data.message || "An error occurred during analysis.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
      }
      
      if (!data.primary_diagnosis) {
        throw new Error("Invalid response format from server. Missing primary_diagnosis.");
      }

      setAnalysisResult(data);
      setUploadView(false);

      toast({
        title: "Analysis complete",
        description: "Disease detection completed successfully.",
      });
    } catch (err) {
      console.error('Analysis error:', err);
      
      let errorMessage = err.message || 'Failed to analyze image. Please check your server connection.';
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        errorMessage = 'Network error: Could not connect to the deployed server. Please try again.';
      }

      setError(errorMessage);
      
      toast({
        title: "Analysis failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUploadedImage(null);
    setError(null);
  };

  const handleReset = () => {
    setUploadView(true);
    setUploadedImage(null);
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <>
      <Helmet>
        <title>Predict - Poultry Disease Detection System</title>
        <meta 
          name="description" 
          content="AI-powered poultry disease classification system using deep learning to detect healthy birds and common diseases." 
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 bg-size-200 animate-gradient-pulse py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 drop-shadow-sm">Disease Detection Analysis</h1>
            <p className="text-gray-600 max-w-2xl mx-auto text-xl font-medium">
              Upload a clear image of the poultry to receive an instant AI-powered diagnostic assessment and actionable recommendations.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {uploadView ? (
              <motion.div
                key="upload-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-10"
              >
                {error && !loading && (
                  <ErrorAlert 
                    message={error} 
                    onDismiss={() => setError(null)} 
                  />
                )}

                <div className="bg-white rounded-[2.5rem] p-2 md:p-4 border border-gray-200 shadow-2xl">
                  <ImageUpload
                    onImageSelect={handleImageSelect}
                    onAnalyze={handleAnalyze}
                    onClear={handleClear}
                    selectedImage={uploadedImage}
                    isLoading={loading}
                  />
                </div>

                {loading && (
                  <div className="bg-white rounded-[2.5rem] p-12 border border-gray-200 shadow-xl flex justify-center">
                    <LoadingSpinner />
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="results-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col gap-10"
              >
                <div className="flex justify-end">
                  <Button onClick={handleReset}>
                    <RefreshCw className="w-5 h-5 mr-3" />
                    Analyze Another Image
                  </Button>
                </div>

                <PredictionResult analysisResult={analysisResult} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default PredictPage;
