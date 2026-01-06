# HBMP Forms Generator - Testing Guide

## Quick Start Checklist

### Step 1: Deploy Apps Script as Web App

1. **Open your Google Sheet** with the Apps Script code
2. **Go to Extensions > Apps Script**
3. **Set Script Properties:**
   - Click the gear icon (Project Settings)
   - Scroll to "Script properties"
   - Click "Add script property"
   - Property: `HBMP_SECRET`
   - Value: `<your-secret-token>` (e.g., `my-secret-token-123`)
   - Click "Save script properties"

4. **Deploy as Web App:**
   - Click "Deploy" > "New deployment"
   - Click the gear icon next to "Select type" > "Web app"
   - Description: `HBMP Forms API`
   - Execute as: `Me`
   - Who has access: `Anyone` (or `Anyone with Google account` for more security)
   - Click "Deploy"
   - **Copy the Web App URL** - you'll need this for React

### Step 2: Set Up React Component

1. **Import the component** in your React app:
   ```jsx
   import HbmpFormsGenerator from './HbmpFormsGenerator';
   
   function App() {
     return <HbmpFormsGenerator />;
   }
   ```

2. **Or use it directly** in your existing React application

### Step 3: Test the Integration

1. **Open your React app** with the `HbmpFormsGenerator` component
2. **Paste the Web App URL** into the "Apps Script Web App URL" field
3. **Enter the secret token** (same value you set in Script Properties)
4. **Click "Validate (Dry Run)"** to test without creating a form
   - Should show statistics (sections, questions, skipped count)
   - Should show any validation errors
5. **Click "Generate Form"** to create the actual form
   - Should show success message
   - Should display Form ID, Edit URL, Published URL
   - Should show statistics

### Step 4: Verify Results

1. **Check FormMeta sheet** - should have updated FormId, EditUrl, PublishedUrl, Version, CreatedAt
2. **Click Edit URL** - should open the form in edit mode
3. **Click Published URL** - should open the form in view/submit mode
4. **Check Form Responses sheet** - responses should appear here when form is submitted

## Troubleshooting

### Error: "Unauthorized"
- **Check:** Secret token matches in both Script Properties and React UI
- **Solution:** Ensure `HBMP_SECRET` in Script Properties matches what you enter in React

### Error: "Server configuration error: HBMP_SECRET not set"
- **Check:** Script Properties has `HBMP_SECRET` property
- **Solution:** Add the property in Project Settings > Script properties

### Error: "No questions found"
- **Check:** Questions sheet exists and has data
- **Solution:** Ensure Questions sheet has at least one row with QuestionText filled

### Error: CORS issues
- **Check:** Web App is deployed with "Anyone" access
- **Solution:** Redeploy with correct access settings

### Form not created but validation works
- **Check:** Dry run vs actual generation
- **Solution:** Make sure you clicked "Generate Form" not "Validate (Dry Run)"

## API Testing with curl (Optional)

Test the API directly without React:

```bash
# Dry Run (Validation Only)
curl -X POST <your-web-app-url> \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generateForm",
    "dryRun": true,
    "secret": "<your-secret-token>"
  }'

# Generate Form
curl -X POST <your-web-app-url> \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generateForm",
    "dryRun": false,
    "secret": "<your-secret-token>"
  }'
```

## Expected Response Format

### Success Response:
```json
{
  "ok": true,
  "message": "Form created successfully",
  "formId": "1abc...",
  "editUrl": "https://docs.google.com/forms/d/.../edit",
  "publishedUrl": "https://docs.google.com/forms/d/.../viewform",
  "version": "2",
  "createdAt": "2026-01-06T12:30:00.000Z",
  "stats": {
    "sectionsCount": 2,
    "questionsCount": 10,
    "skippedCount": 0,
    "errors": []
  }
}
```

### Error Response:
```json
{
  "ok": false,
  "message": "Error message here"
}
```

## Notes

- **Apps Script Limitation:** Custom HTTP headers (like `X-HBMP-SECRET`) are not directly accessible in Apps Script's `doPost`. The secret is sent in the request body as a workaround.
- **Security:** For production, consider using "Anyone with Google account" access instead of "Anyone"
- **Versioning:** Each form generation increments the version number in FormMeta sheet
- **Dry Run:** Use dry run to validate questions before actually creating forms

