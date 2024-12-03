//had to recommit
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Script from 'next/script';

interface LatexResult {
  correctedText: string;
}

interface TextSegment {
  text: string;
  changed: boolean;
}

const LatexFixer = () => {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<LatexResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Helper function to identify LaTeX differences
  const findLatexDifferences = (original: string, corrected: string): [TextSegment[], TextSegment[]] => {
    const latexPatterns = [
      /\\{2,}\{/g,     
      /\\{2,}\}/g,     
      /\\{2,}\[/g,     
      /\\{2,}\]/g,     
      /\\{2,}\\/g      
    ];

    let originalSegments: TextSegment[] = [{text: original, changed: false}];
    let correctedSegments: TextSegment[] = [{text: corrected, changed: false}];

    latexPatterns.forEach(pattern => {
      originalSegments = originalSegments.flatMap(segment => {
        if (!segment.changed) {
          const parts = segment.text.split(pattern);
          const matches = segment.text.match(pattern) || [];
          const result: TextSegment[] = [];
          
          parts.forEach((part, index) => {
            if (part) result.push({text: part, changed: false});
            if (index < matches.length) {
              result.push({text: matches[index], changed: true});
            }
          });
          
          return result;
        }
        return [segment];
      });

      correctedSegments = correctedSegments.flatMap(segment => {
        if (!segment.changed) {
          const parts = segment.text.split(/\\[{\}\[\]\\]/g);
          const matches = segment.text.match(/\\[{\}\[\]\\]/g) || [];
          const result: TextSegment[] = [];
          
          parts.forEach((part, index) => {
            if (part) result.push({text: part, changed: false});
            if (index < matches.length) {
              result.push({text: matches[index], changed: true});
            }
          });
          
          return result;
        }
        return [segment];
      });
    });

    return [originalSegments, correctedSegments];
  };

  // Effect to trigger MathJax rendering when result changes
  useEffect(() => {
    if (result && (window as any).MathJax) {
      (window as any).MathJax.typesetPromise?.();
    }
  }, [result]);

  const copyToClipboard = async () => {
    if (result) {
      await navigator.clipboard.writeText(result.correctedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fixLatex = async () => {
    if (!inputText.trim()) {
      setError('Please provide the input text');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/fix-latex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inputText: inputText.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fix LaTeX');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error fixing LaTeX:', error);
      setError('An error occurred while fixing the LaTeX. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const [originalSegments, correctedSegments] = result 
    ? findLatexDifferences(inputText, result.correctedText)
    : [[], []];
  return (
    <>
      {/* MathJax Script */}
      <Script
        id="mathjax-config"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.MathJax = {
              tex: {
                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                processEscapes: true,
              },
              options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
              }
            };
          `,
        }}
      />
      <Script
        id="mathjax-script"
        src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
        strategy="beforeInteractive"
      />

      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src="/kepler-logo.png"
              alt="Kepler Logo"
              width={1600}
              height={642}
              className="object-contain w-auto h-36"
              priority
            />
          </div>

          {/* Title */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Kepler RLHF LaTeX Generation Tool</h1>
            <p className="text-lg text-gray-300">
              Write out your plain text formula like f(x) = 3(x^0.5)*5 - 7x^2 and receive a LaTeX version of it.
            </p>
          </div>

          {/* Input Section */}
          <div className="bg-gray-700 rounded-lg p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Input Text
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter your plain text to generate a LaTeX version..."
                className="w-full h-32 bg-gray-800 text-white rounded-lg p-4 border-none focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none font-mono"
              />
            </div>
            
            <button
              onClick={fixLatex}
              disabled={loading}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg flex items-center justify-center transition-colors ${
                loading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin text-xl">⟳</span>
                  Getting LaTeX...
                </span>
              ) : (
                'Get LaTeX'
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-500 text-center">
              {error}
            </div>
          )}
          
          {/* Results Section */}
          {result && (
            <div className="bg-gray-900 rounded-lg p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Original Text */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Original Text:</h3>
                  <pre className="whitespace-pre-wrap bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono">
                    {originalSegments.map((segment, i) => (
                      <span 
                        key={i}
                        className={segment.changed ? "bg-red-500/20 text-red-400" : "text-gray-300"}
                      >
                        {segment.text}
                      </span>
                    ))}
                  </pre>
                </div>

                {/* Corrected Text with Copy Button */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Corrected Text:</h3>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
                    >
                      {copied ? (
                        <span className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          Copied!
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          📋
                          Copy fixed text
                        </span>
                      )}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono">
                    {correctedSegments.map((segment, i) => (
                      <span 
                        key={i}
                        className={segment.changed ? "bg-green-500/20 text-green-400" : "text-gray-300"}
                      >
                        {segment.text}
                      </span>
                    ))}
                  </pre>
                </div>
              </div>

              {/* LaTeX Preview Section */}
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold">LaTeX Preview:</h3>
                <div className="bg-gray-800 p-6 rounded-lg overflow-x-auto">
                  <div className="text-gray-200 leading-relaxed">
                    {result.correctedText}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LatexFixer;