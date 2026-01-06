# HBMP Forms Generator

A React application that generates Google Forms from a Question Bank stored in Google Sheets via Google Apps Script API.

## Features

- ✅ Generate Google Forms from Question Bank spreadsheet
- ✅ Validate questions before form creation (Dry Run mode)
- ✅ Support for multiple question types (MCQ, Checkbox, Dropdown, Text, Paragraph)
- ✅ Configurable respondent details section (Name, Email, Phone, Branch, etc.)
- ✅ Automatic form response collection
- ✅ Secure authentication with secret token
- ✅ Clean, modern UI

## Prerequisites

1. **Google Apps Script Backend**: You need the `Code.gs` script deployed as a Web App in Google Apps Script
2. **Google Sheet**: A spreadsheet with the following sheets:
   - `FormMeta` - Form metadata
   - `RespondentDetails` - Respondent information fields
   - `Questions` - Question bank

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Google Apps Script

1. Open your Google Sheet
2. Go to **Extensions > Apps Script**
3. Paste the `Code.gs` code
4. Set Script Property:
   - Go to **Project Settings** (⚙️ icon)
   - Scroll to **Script Properties**
   - Add: Key = `HBMP_SECRET`, Value = `YourSecretToken` (e.g., `MySecrectToken#123`)
5. Deploy as Web App:
   - Click **Deploy > New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**
   - Copy the Web App URL (ends with `/exec`)

### 3. Run Locally

```bash
npm start
```

App will open at [http://localhost:3000](http://localhost:3000)

**Note**: When running locally, CORS errors may occur. The app will automatically try to use a proxy. For production use, deploy to Vercel/Netlify.

## Deployment

### Deploy to Vercel (Recommended)

#### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### Option 2: GitHub + Vercel Web UI

1. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/hbmp-forms-app.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com)
3. Click **New Project**
4. Import your GitHub repository
5. Click **Deploy**

### Other Platforms

- **Netlify**: `npm run build` then drag & drop `build/` folder
- **GitHub Pages**: Configure `package.json` with homepage and use `gh-pages` package

## Usage

1. Open the deployed app
2. Enter your **Google Apps Script Web App URL**
3. Enter your **Secret Token**
4. Click **Validate (Dry Run)** to test without creating a form
5. Click **Generate Form** to create the actual Google Form

### Validate (Dry Run)

Tests your setup without creating a form. Returns:
- ✅ Number of sections
- ✅ Number of questions
- ✅ Any validation errors

### Generate Form

Creates the actual Google Form and returns:
- 📝 Form ID
- 🔗 Edit URL (to modify the form)
- 🌐 Published URL (to share with respondents)

## Google Sheet Structure

### FormMeta Sheet
| Key | Value |
|-----|-------|
| FormTitle | Your Form Title |
| FormDescription | Your Form Description |
| FormId | (auto-filled) |
| FormEditUrl | (auto-filled) |
| FormPublishedUrl | (auto-filled) |

### RespondentDetails Sheet
| FieldName | Type | Required | Order | Option1 | Option2 | Option3 | Option4 |
|-----------|------|----------|-------|---------|---------|---------|---------|
| Name | TEXT | TRUE | 1 | | | | |
| Email | TEXT | TRUE | 2 | | | | |
| Branch | DROPDOWN | TRUE | 3 | CSE | ECE | ME | CE |

### Questions Sheet
| Section | Order | QuestionText | Type | Required | Option1 | Option2 | Option3 | Option4 | Option5 |
|---------|-------|--------------|------|----------|---------|---------|---------|---------|---------|
| General | 1 | What is your age? | TEXT | TRUE | | | | | |
| Technical | 2 | Select programming languages | CHECKBOX | TRUE | Python | Java | C++ | JavaScript | |

**Supported Question Types:**
- `TEXT` - Short text answer
- `PARAGRAPH` - Long text answer
- `MCQ` - Multiple choice (single answer)
- `CHECKBOX` - Checkboxes (multiple answers)
- `DROPDOWN` - Dropdown list

## Security

- The secret token is sent in the request body (not in URL)
- All communication is over HTTPS
- Google Apps Script handles authentication
- Ensure your secret token is kept private

## Troubleshooting

### CORS Errors (localhost)
- Expected when testing locally
- App will automatically try proxy fallbacks
- Deploy to production (Vercel) to avoid CORS issues

### "Unauthorized" Error
- Check that your secret token matches the one in Google Apps Script Properties
- Ensure there are no extra spaces

### "FormMeta sheet not found"
- Verify your Google Sheet has the required sheets
- Check sheet names are exactly: `FormMeta`, `RespondentDetails`, `Questions`

### 405 Error / Redirect Issues
- Ensure Web App deployment is active
- Settings must be: Execute as **Me**, Who has access: **Anyone**
- Try creating a new deployment

## Tech Stack

- **Frontend**: React 19
- **Backend**: Google Apps Script
- **Deployment**: Vercel (recommended)
- **APIs**: Google Forms API, Google Sheets API

## Project Structure

```
hbmp-forms-app/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── favicon.ico
├── src/
│   ├── App.js              # Main app component
│   ├── App.css             # App styles
│   ├── HbmpFormsGenerator.jsx  # Forms generator component
│   ├── index.js            # Entry point
│   └── index.css           # Global styles
├── package.json
└── README.md
```

## License

MIT

## Support

For issues or questions, please check:
1. Google Apps Script deployment settings
2. Sheet structure matches the required format
3. Secret token is correct
4. Web App URL is the `/exec` URL, not the redirect URL

---

**Made with ❤️ for HBMP Survey Management**
