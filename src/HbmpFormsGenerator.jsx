/**
 * HBMP Forms Generator - React Component
 * 
 * This component provides a UI to trigger Google Form generation via the Apps Script Web App API.
 * 
 * USAGE:
 * 1. Import this component in your React app
 * 2. Set the Apps Script Web App URL and secret token
 * 3. Click "Validate (Dry Run)" to test without creating a form
 * 4. Click "Generate Form" to create the actual form
 * 
 * REQUIREMENTS:
 * - React (hooks: useState)
 * - No external dependencies (uses native fetch API)
 */

import React, { useState } from 'react';

// Hardcoded Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjqaSUtxeZeGEdbyA-k1RdE51cOKG0eDLlZM4J1p3DhvX8mwbxSDEnTngBKR18c4hn/exec';

const HbmpFormsGenerator = () => {
    const [secretToken, setSecretToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    /**
     * Calls the Apps Script Web App API
     */
    const callAPI = async (dryRun = false) => {
        // Validate inputs
        if (!secretToken.trim()) {
            setError('Please enter the secret token');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const apiUrl = GOOGLE_SCRIPT_URL;

            // Request payload
            const payload = {
                action: 'generateForm',
                dryRun: dryRun,
                secret: secretToken,
            };

            let response;
            let data;

            // Use Vercel API proxy for production, direct connection for localhost
            if (isLocalhost) {
                // Localhost: try direct connection (will likely fail with CORS)
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                data = await response.json();
            } else {
                // Production (Vercel): use serverless function proxy
                response = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        googleScriptUrl: apiUrl,
                        ...payload
                    }),
                });
                data = await response.json();
            }

            if (!response.ok || (data && !data.ok)) {
                throw new Error(data?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            setResult(data);
        } catch (err) {
            setError(err.message || 'Failed to call API');
            console.error('API Error:', err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle dry run (validation only)
     */
    const handleDryRun = () => {
        callAPI(true);
    };

    /**
     * Handle form generation
     */
    const handleGenerate = () => {
        callAPI(false);
    };

    /**
     * Clear results
     */
    const handleClear = () => {
        setSecretToken('');
        setResult(null);
        setError(null);
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>HBMP Forms Generator</h2>

            <div style={styles.form}>
                <div style={styles.field}>
                    <label style={styles.label}>
                        Secret Token:
                    </label>
                    <input
                        type="password"
                        value={secretToken}
                        onChange={(e) => setSecretToken(e.target.value)}
                        placeholder="Enter your secret token"
                        style={styles.input}
                        disabled={loading}
                        autoFocus
                    />
                </div>

                <div style={styles.buttonGroup}>
                    <button
                        onClick={handleDryRun}
                        disabled={loading}
                        style={{ ...styles.button, ...styles.buttonSecondary }}
                    >
                        {loading ? 'Validating...' : 'Validate (Dry Run)'}
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        style={{ ...styles.button, ...styles.buttonPrimary }}
                    >
                        {loading ? 'Generating...' : 'Generate Form'}
                    </button>
                    {(result || error) && (
                        <button
                            onClick={handleClear}
                            style={{ ...styles.button, ...styles.buttonClear }}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div style={styles.errorPanel}>
                    <h3 style={styles.errorTitle}>Error</h3>
                    <p style={styles.errorMessage}>{error}</p>
                </div>
            )}

            {/* Result Display */}
            {result && (
                <div style={styles.resultPanel}>
                    <h3 style={styles.resultTitle}>
                        {result.ok ? '✅ Success' : '❌ Failed'}
                    </h3>
                    <p style={styles.message}>{result.message}</p>

                    {result.ok && !result.dryRun && (
                        <div style={styles.formInfo}>
                            <div style={styles.infoRow}>
                                <strong>Form ID:</strong> {result.formId || 'N/A'}
                            </div>
                            <div style={styles.infoRow}>
                                <strong>Version:</strong> {result.version || 'N/A'}
                            </div>
                            <div style={styles.infoRow}>
                                <strong>Created At:</strong> {result.createdAt || 'N/A'}
                            </div>
                            {result.editUrl && (
                                <div style={styles.infoRow}>
                                    <strong>Edit URL:</strong>{' '}
                                    <a
                                        href={result.editUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={styles.link}
                                    >
                                        {result.editUrl}
                                    </a>
                                </div>
                            )}
                            {result.publishedUrl && (
                                <div style={styles.infoRow}>
                                    <strong>Published URL:</strong>{' '}
                                    <a
                                        href={result.publishedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={styles.link}
                                    >
                                        {result.publishedUrl}
                                    </a>
                                </div>
                            )}
                            {result.spreadsheetUrl && (
                                <div style={styles.infoRow}>
                                    <strong>Response Spreadsheet:</strong>{' '}
                                    <a
                                        href={result.spreadsheetUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={styles.link}
                                    >
                                        {result.spreadsheetUrl}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {result.stats && (
                        <div style={styles.stats}>
                            <h4 style={styles.statsTitle}>Statistics</h4>
                            <div style={styles.statsGrid}>
                                <div style={styles.statItem}>
                                    <strong>Sections:</strong> {result.stats.sectionsCount || 0}
                                </div>
                                <div style={styles.statItem}>
                                    <strong>Questions:</strong> {result.stats.questionsCount || 0}
                                </div>
                                <div style={styles.statItem}>
                                    <strong>Skipped:</strong> {result.stats.skippedCount || 0}
                                </div>
                            </div>
                        </div>
                    )}

                    {result.stats && result.stats.errors && result.stats.errors.length > 0 && (
                        <div style={styles.errors}>
                            <h4 style={styles.errorsTitle}>Validation Errors</h4>
                            <ul style={styles.errorsList}>
                                {result.stats.errors.map((err, index) => (
                                    <li key={index} style={styles.errorItem}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Styles
const styles = {
    container: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    title: {
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '20px',
        color: '#333',
    },
    form: {
        backgroundColor: '#f9f9f9',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
    },
    field: {
        marginBottom: '15px',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: '500',
        color: '#555',
    },
    input: {
        width: '100%',
        padding: '10px',
        fontSize: '14px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
    },
    buttonGroup: {
        display: 'flex',
        gap: '10px',
        marginTop: '20px',
    },
    button: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '500',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    buttonPrimary: {
        backgroundColor: '#4285f4',
        color: 'white',
    },
    buttonSecondary: {
        backgroundColor: '#34a853',
        color: 'white',
    },
    buttonClear: {
        backgroundColor: '#ea4335',
        color: 'white',
    },
    errorPanel: {
        backgroundColor: '#fce8e6',
        border: '1px solid #ea4335',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
    },
    errorTitle: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#ea4335',
        marginBottom: '10px',
    },
    errorMessage: {
        color: '#c5221f',
        margin: 0,
    },
    resultPanel: {
        backgroundColor: '#e8f5e9',
        border: '1px solid #34a853',
        borderRadius: '8px',
        padding: '20px',
    },
    resultTitle: {
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '10px',
        color: '#333',
    },
    message: {
        fontSize: '16px',
        marginBottom: '15px',
        color: '#555',
    },
    formInfo: {
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '4px',
        marginBottom: '15px',
    },
    infoRow: {
        marginBottom: '10px',
        fontSize: '14px',
        color: '#333',
    },
    link: {
        color: '#4285f4',
        textDecoration: 'none',
        wordBreak: 'break-all',
    },
    stats: {
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '4px',
        marginBottom: '15px',
    },
    statsTitle: {
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '10px',
        color: '#333',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
    },
    statItem: {
        fontSize: '14px',
        color: '#555',
    },
    errors: {
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '4px',
        padding: '15px',
        marginTop: '15px',
    },
    errorsTitle: {
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '10px',
        color: '#856404',
    },
    errorsList: {
        margin: 0,
        paddingLeft: '20px',
    },
    errorItem: {
        fontSize: '14px',
        color: '#856404',
        marginBottom: '5px',
    },
};

export default HbmpFormsGenerator;

