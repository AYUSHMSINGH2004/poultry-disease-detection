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

  // ✅ GET API URL FROM ENV
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

      const response = await fetch(`${API_BASE_URL}/analyze`, {
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
        throw new Error(data.message || `Server error`);
      }

      if (!data.primary_diagnosis) {
        throw new Error("Invalid response format from server.");
      }

      setAnalysisResult(data);
      setUploadView(false);

      toast({
        title: "Analysis complete",
        description: "Disease detection completed successfully.",
      });

    } catch (err) {
      console.error('Analysis error:', err);

      let errorMessage = err.message || 'Failed to analyze image.';

      if (err.name === 'TypeError') {
        errorMessage = `Cannot connect to backend: ${API_BASE_URL}`;
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
          content="AI-powered poultry disease classification system using deep learning."
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-6xl">

          {/* HEADER */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6">
              Disease Detection Analysis
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto text-xl font-medium">
              Upload poultry image for AI diagnosis
            </p>
          </div>

          <AnimatePresence mode="wait">
            {uploadView ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-10"
              >
                {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

                <div className="bg-white rounded-3xl p-4 shadow-xl">
                  <ImageUpload
                    onImageSelect={handleImageSelect}
                    onAnalyze={handleAnalyze}
                    onClear={handleClear}
                    selectedImage={uploadedImage}
                    isLoading={loading}
                  />
                </div>

                {loading && (
                  <div className="bg-white rounded-3xl p-12 shadow-xl flex justify-center">
                    <LoadingSpinner />
                  </div>
                )}

              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-10"
              >
                <div className="flex justify-end">
                  <Button onClick={handleReset}>
                    <RefreshCw className="mr-2" />
                    Analyze Another
                  </Button>
                </div>

                <PredictionResult analysisResult={analysisResult} />

                <div className="flex gap-6">
                  <ProbabilityDistributionChart
                    distribution={analysisResult?.distribution}
                  />

                  <ResultsVisualsSection
                    originalImageBase64={analysisResult?.original_image_base64}
                    heatmapImageBase64={analysisResult?.heatmap_image_base64}
                  />
                </div>

                {analysisResult?.report && (
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-8 rounded-3xl">
                    <h3 className="text-2xl font-bold mb-4">
                      <Sparkles className="inline mr-2" />
                      AI Diagnostic Report
                    </h3>
                    <MarkdownRenderer markdown={analysisResult.report} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default PredictPage;
