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

  // ✅ IMPORTANT: Use Vercel env variable
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

      // ✅ FIXED: Using deployed backend instead of localhost
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.status === 'error') {
        setError(data.message || "An error occurred during analysis.");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      if (!data.primary_diagnosis) {
        throw new Error("Invalid response from server.");
      }

      setAnalysisResult(data);
      setUploadView(false);

      toast({
        title: "Analysis complete",
        description: "Disease detection completed successfully.",
      });

    } catch (err) {
      console.error('Analysis error:', err);

      let errorMessage = err.message || "Failed to analyze image.";

      if (err.message.includes("Failed to fetch")) {
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

      <div className="min-h-screen py-16">
        <div className="container mx-auto px-4 max-w-6xl">

          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">Disease Detection Analysis</h1>
            <p className="text-gray-600">
              Upload poultry image for AI-based diagnosis
            </p>
          </div>

          <AnimatePresence mode="wait">
            {uploadView ? (
              <motion.div key="upload">

                {error && !loading && (
                  <ErrorAlert 
                    message={error} 
                    onDismiss={() => setError(null)} 
                  />
                )}

                <div className="bg-white p-6 rounded-xl shadow">
                  <ImageUpload
                    onImageSelect={handleImageSelect}
                    onAnalyze={handleAnalyze}
                    onClear={handleClear}
                    selectedImage={uploadedImage}
                    isLoading={loading}
                  />
                </div>

                {loading && (
                  <div className="mt-6 flex justify-center">
                    <LoadingSpinner />
                  </div>
                )}

              </motion.div>
            ) : (
              <motion.div key="results">

                <div className="flex justify-end mb-6">
                  <Button onClick={handleReset}>
                    <RefreshCw className="mr-2" />
                    Analyze Another Image
                  </Button>
                </div>

                <PredictionResult analysisResult={analysisResult} />

                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <ProbabilityDistributionChart 
                    distribution={analysisResult?.distribution} 
                  />
                  <ResultsVisualsSection 
                    originalImageBase64={analysisResult?.original_image_base64}
                    heatmapImageBase64={analysisResult?.heatmap_image_base64}
                  />
                </div>

                {analysisResult?.report && (
                  <div className="mt-6">
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
