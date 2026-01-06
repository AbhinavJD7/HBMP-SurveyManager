/**
 * Vercel Serverless Function - Google Apps Script Proxy
 * 
 * This function acts as a middleware between the React app and Google Apps Script,
 * solving CORS issues and handling redirects properly.
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  try {
    const { googleScriptUrl, ...requestData } = req.body;

    if (!googleScriptUrl) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Missing googleScriptUrl in request body' 
      });
    }

    // Make request to Google Apps Script
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
      redirect: 'follow', // Automatically follow redirects
    });

    // Get response text first
    const responseText = await response.text();
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      // If not JSON, it might be an HTML redirect page (shouldn't happen with redirect:follow)
      console.error('Non-JSON response:', responseText.substring(0, 200));
      return res.status(500).json({
        ok: false,
        message: 'Google Apps Script returned invalid response',
        error: 'Response is not valid JSON'
      });
    }

    // Return the response from Google Apps Script
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      ok: false,
      message: 'Proxy error: ' + error.message,
      error: error.message
    });
  }
}

