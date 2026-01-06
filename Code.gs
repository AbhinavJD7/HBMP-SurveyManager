/**
 * HBMP Survey Manager - Google Apps Script
 * 
 * PURPOSE:
 * This script manages a Question Bank in Google Sheets and automatically generates
 * Google Forms with questions and options. It handles form creation, response collection,
 * and metadata tracking.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire code into Code.gs
 * 4. Save the project
 * 5. Refresh your Google Sheet - you should see "HBMP Forms" menu appear
 * 
 * REQUIRED SHEET STRUCTURE:
 * 
 * Sheet: "FormMeta"
 *   Columns: Key | Value
 *   Required rows:
 *     - FormTitle | <your form title>
 *     - FormDescription | <your form description>
 *     - FormId | (auto-filled)
 *     - FormEditUrl | (auto-filled)
 *     - FormPublishedUrl | (auto-filled)
 *     - Version | (auto-filled)
 *     - CreatedAt | (auto-filled)
 *     - ResponseSpreadsheetId | (auto-filled)
 *     - ResponseSheetName | (auto-filled)
 * 
 * Sheet: "RespondentDetails"
 *   Columns:
 *     - FieldName | Type | Required | Order | Option1 | Option2 | Option3 | Option4 | Option5
 *   
 *   Supported Types:
 *     - TEXT: Short text answer (e.g., Name, Phone Number)
 *     - PARAGRAPH: Long text answer
 *     - DROPDOWN: Dropdown list (e.g., Branch selection)
 *   
 *   Notes:
 *     - Order: Numeric value for sorting fields (respondent details appear first)
 *     - Required: TRUE/FALSE (case-insensitive)
 *     - For DROPDOWN type, provide options in Option1, Option2, etc.
 *     - Example rows:
 *       - Name | TEXT | TRUE | 1 | | | | |
 *       - Email | TEXT | TRUE | 2 | | | | |
 *       - Phone Number | TEXT | TRUE | 3 | | | | |
 *       - Branch | DROPDOWN | TRUE | 4 | CSE | ECE | ME | CE |
 * 
 * Sheet: "Questions"
 *   Columns:
 *     - QuestionId | Section | Order | Type | QuestionText | Required | Option1 | Option2 | Option3 | Option4 | Option5 | GoToSectionOnOption
 *   
 *   Supported Types:
 *     - MCQ: Multiple choice (single answer)
 *     - CHECKBOX: Multiple selection
 *     - DROPDOWN: Dropdown list
 *     - TEXT: Short text answer
 *     - PARAGRAPH: Long text answer
 *   
 *   Notes:
 *     - Order: Numeric value for sorting questions
 *     - Section: Creates page breaks when provided
 *     - Required: TRUE/FALSE (case-insensitive)
 *     - For TEXT/PARAGRAPH types, Option columns are ignored
 *     - For MCQ/CHECKBOX/DROPDOWN, at least one option is required
 * 
 * USAGE:
 * 1. Fill in FormMeta sheet with FormTitle and FormDescription
 * 2. (Optional) Add respondent detail fields to RespondentDetails sheet (Name, Email, Phone, Branch, etc.)
 * 3. Add questions to Questions sheet
 * 4. Use menu: HBMP Forms > Generate NEW Google Form
 * 5. Form metadata will be written back to FormMeta sheet
 * 6. Use menu to open the form for editing or viewing
 * 
 * NOTE: Respondent details will appear at the beginning of the form before survey questions.
 * 
 * ============================================================================
 * WEB APP API DEPLOYMENT INSTRUCTIONS:
 * ============================================================================
 * 
 * 1. SET SCRIPT PROPERTIES (for security):
 *    - In Apps Script editor, go to Project Settings (gear icon)
 *    - Scroll to "Script properties"
 *    - Click "Add script property"
 *    - Property: HBMP_SECRET
 *    - Value: <your-secret-token> (e.g., "my-secret-token-123")
 *    - Click "Save script properties"
 * 
 * 2. DEPLOY AS WEB APP:
 *    - Click "Deploy" > "New deployment"
 *    - Click the gear icon next to "Select type" > "Web app"
 *    - Description: "HBMP Forms API"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (or "Anyone with Google account" for more security)
 *    - Click "Deploy"
 *    - Copy the "Web app URL" - you'll need this for React
 * 
 * 3. TEST THE API:
 *    - Use the React UI component or test with curl:
 *      curl -X POST <web-app-url> \
 *        -H "Content-Type: application/json" \
 *        -H "X-HBMP-SECRET: <your-secret>" \
 *        -d '{"action":"generateForm","dryRun":true}'
 * 
 * ============================================================================
 * API ENDPOINTS:
 * ============================================================================
 * 
 * POST / (doPost)
 *   Action: generateForm
 *   Headers:
 *     - Content-Type: application/json
 *   Body (JSON):
 *     {
 *       "action": "generateForm",
 *       "dryRun": false,  // optional, if true: validate only, don't create form
 *       "secret": "<secret-token>",  // REQUIRED: must match HBMP_SECRET in Script Properties
 *       "spreadsheetId": "..." // optional, ignored if script is bound to sheet
 *     }
 *   Note: Apps Script doesn't expose custom HTTP headers in doPost, so secret is sent in body
 *   Response (JSON):
 *     {
 *       "ok": true/false,
 *       "message": "...",
 *       "formId": "...",
 *       "editUrl": "...",
 *       "publishedUrl": "...",
 *       "version": "...",
 *       "createdAt": "...",
 *       "stats": {
 *         "sectionsCount": 0,
 *         "questionsCount": 0,
 *         "skippedCount": 0,
 *         "errors": []
 *       }
 *     }
 */

/**
 * Main function to set up the custom menu when the spreadsheet opens
 */
function onOpen() {
  addMenu();
}

/**
 * Creates the custom menu "HBMP Forms" with options
 */
function addMenu() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('HBMP Forms')
    .addItem('Generate NEW Google Form', 'generateNewForm')
    .addSeparator()
    .addItem('Open Form (Edit)', 'openFormEdit')
    .addItem('Open Form (Published)', 'openFormPublished')
    .addToUi();
}

/**
 * Main function to generate a new Google Form
 */
function generateNewForm() {
  try {
    // Ensure required sheets exist
    ensureSheetsExist();
    
    // Read metadata
    var meta = readMeta();
    
    // Read respondent details
    var respondentDetails = readRespondentDetails();
    
    // Read questions
    var questions = readQuestions();
    
    if (questions.length === 0) {
      SpreadsheetApp.getUi().alert('Error', 'No questions found in Questions sheet. Please add questions first.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // Build the form
    var formData = buildForm(meta, respondentDetails, questions);
    
    // Write metadata back
    writeMeta(formData);
    
    SpreadsheetApp.getUi().alert('Success', 
      'Form created successfully!\n\n' +
      'Form ID: ' + formData.formId + '\n' +
      'Edit URL: ' + formData.editUrl + '\n' +
      'Published URL: ' + formData.publishedUrl,
      SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    Logger.log('Error in generateNewForm: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error', 'Failed to generate form: ' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Ensures that FormMeta, RespondentDetails, and Questions sheets exist with proper structure
 */
function ensureSheetsExist() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Check/Create FormMeta sheet
  var metaSheet = spreadsheet.getSheetByName('FormMeta');
  if (!metaSheet) {
    metaSheet = spreadsheet.insertSheet('FormMeta');
    metaSheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
    
    // Set default values
    var defaultMeta = [
      ['FormTitle', 'HBMP Survey Form'],
      ['FormDescription', 'Survey form generated from Question Bank'],
      ['FormId', ''],
      ['FormEditUrl', ''],
      ['FormPublishedUrl', ''],
      ['Version', '1'],
      ['CreatedAt', ''],
      ['ResponseSpreadsheetId', ''],
      ['ResponseSheetName', '']
    ];
    metaSheet.getRange(2, 1, defaultMeta.length, 2).setValues(defaultMeta);
  }
  
  // Check/Create RespondentDetails sheet
  var respondentSheet = spreadsheet.getSheetByName('RespondentDetails');
  if (!respondentSheet) {
    respondentSheet = spreadsheet.insertSheet('RespondentDetails');
    var respondentHeaders = [
      ['FieldName', 'Type', 'Required', 'Order', 'Option1', 'Option2', 'Option3', 'Option4', 'Option5']
    ];
    respondentSheet.getRange(1, 1, 1, respondentHeaders[0].length).setValues(respondentHeaders);
    
    // Add default respondent detail fields
    var defaultRespondentFields = [
      ['Name', 'TEXT', 'TRUE', '1', '', '', '', '', ''],
      ['Email', 'TEXT', 'TRUE', '2', '', '', '', '', ''],
      ['Phone Number', 'TEXT', 'TRUE', '3', '', '', '', '', ''],
      ['Branch', 'DROPDOWN', 'TRUE', '4', 'CSE', 'ECE', 'ME', 'CE', 'EE']
    ];
    respondentSheet.getRange(2, 1, defaultRespondentFields.length, defaultRespondentFields[0].length).setValues(defaultRespondentFields);
  }
  
  // Check/Create Questions sheet
  var questionsSheet = spreadsheet.getSheetByName('Questions');
  if (!questionsSheet) {
    questionsSheet = spreadsheet.insertSheet('Questions');
    var headers = [
      ['QuestionId', 'Section', 'Order', 'Type', 'QuestionText', 'Required', 
       'Option1', 'Option2', 'Option3', 'Option4', 'Option5', 'GoToSectionOnOption']
    ];
    questionsSheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  }
}

/**
 * Reads metadata from FormMeta sheet
 * Returns an object with metadata values
 */
function readMeta() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var metaSheet = spreadsheet.getSheetByName('FormMeta');
  
  if (!metaSheet) {
    throw new Error('FormMeta sheet not found');
  }
  
  var data = metaSheet.getDataRange().getValues();
  var meta = {
    formTitle: 'HBMP Survey Form',
    formDescription: 'Survey form generated from Question Bank',
    version: '1',
    createdAt: ''
  };
  
  // Skip header row
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    var value = data[i][1];
    
    if (key && value !== undefined && value !== '') {
      switch (key) {
        case 'FormTitle':
          meta.formTitle = value.toString();
          break;
        case 'FormDescription':
          meta.formDescription = value.toString();
          break;
        case 'Version':
          meta.version = value.toString();
          break;
      }
    }
  }
  
  return meta;
}

/**
 * Reads respondent details from RespondentDetails sheet
 * Returns an array of respondent detail objects, sorted by Order
 */
function readRespondentDetails() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var respondentSheet = spreadsheet.getSheetByName('RespondentDetails');
  
  if (!respondentSheet) {
    // If sheet doesn't exist, return empty array (optional feature)
    return [];
  }
  
  var data = respondentSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return [];
  }
  
  var respondentFields = [];
  
  // Parse header row to find column indices
  var headers = data[0];
  var colIndices = {};
  for (var h = 0; h < headers.length; h++) {
    colIndices[headers[h]] = h;
  }
  
  // Process respondent detail rows
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var fieldName = row[colIndices['FieldName']];
    
    // Skip rows with empty field name
    if (!fieldName || fieldName.toString().trim() === '') {
      continue;
    }
    
    var field = {
      fieldName: fieldName.toString().trim(),
      type: (row[colIndices['Type']] || 'TEXT').toString().toUpperCase(),
      required: (row[colIndices['Required']] || '').toString().toUpperCase() === 'TRUE',
      order: parseFloat(row[colIndices['Order']]) || 0,
      options: []
    };
    
    // Collect options for DROPDOWN type
    if (field.type === 'DROPDOWN') {
      for (var optNum = 1; optNum <= 5; optNum++) {
        var optionCol = 'Option' + optNum;
        var optionValue = row[colIndices[optionCol]];
        if (optionValue && optionValue.toString().trim() !== '') {
          field.options.push(optionValue.toString().trim());
        }
      }
      
      // Validate that at least one option exists for DROPDOWN
      if (field.options.length === 0) {
        Logger.log('Warning: Respondent field "' + field.fieldName + '" has type DROPDOWN but no options. Skipping.');
        continue;
      }
    }
    
    respondentFields.push(field);
  }
  
  // Sort by Order (numerically)
  respondentFields.sort(function(a, b) {
    return a.order - b.order;
  });
  
  return respondentFields;
}

/**
 * Reads questions from Questions sheet
 * Returns an array of question objects, sorted by Section then Order
 */
function readQuestions() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var questionsSheet = spreadsheet.getSheetByName('Questions');
  
  if (!questionsSheet) {
    throw new Error('Questions sheet not found');
  }
  
  var data = questionsSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return [];
  }
  
  var questions = [];
  
  // Parse header row to find column indices
  var headers = data[0];
  var colIndices = {};
  for (var h = 0; h < headers.length; h++) {
    colIndices[headers[h]] = h;
  }
  
  // Process question rows
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var questionText = row[colIndices['QuestionText']];
    
    // Skip rows with empty question text
    if (!questionText || questionText.toString().trim() === '') {
      continue;
    }
    
    var question = {
      questionId: row[colIndices['QuestionId']] || '',
      section: row[colIndices['Section']] || '',
      order: parseFloat(row[colIndices['Order']]) || 0,
      type: (row[colIndices['Type']] || '').toString().toUpperCase(),
      questionText: questionText.toString(),
      required: (row[colIndices['Required']] || '').toString().toUpperCase() === 'TRUE',
      options: [],
      goToSectionOnOption: row[colIndices['GoToSectionOnOption']] || ''
    };
    
    // Collect options for MCQ, CHECKBOX, DROPDOWN types
    if (question.type === 'MCQ' || question.type === 'CHECKBOX' || question.type === 'DROPDOWN') {
      for (var optNum = 1; optNum <= 5; optNum++) {
        var optionCol = 'Option' + optNum;
        var optionValue = row[colIndices[optionCol]];
        if (optionValue && optionValue.toString().trim() !== '') {
          question.options.push(optionValue.toString().trim());
        }
      }
      
      // Validate that at least one option exists
      if (question.options.length === 0) {
        Logger.log('Warning: Question "' + question.questionText + '" has type ' + question.type + ' but no options. Skipping.');
        continue;
      }
    }
    
    questions.push(question);
  }
  
  // Sort by Section (alphabetically) then Order (numerically)
  questions.sort(function(a, b) {
    if (a.section !== b.section) {
      if (a.section === '') return 1;
      if (b.section === '') return -1;
      return a.section.localeCompare(b.section);
    }
    return a.order - b.order;
  });
  
  return questions;
}

/**
 * Builds a new Google Form from metadata, respondent details, and questions
 * Returns an object with form data including IDs and URLs
 */
function buildForm(meta, respondentDetails, questions) {
  // Create a new form
  var form = FormApp.create(meta.formTitle);
  form.setDescription(meta.formDescription);
  
  // Set up response collection in the current spreadsheet
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var responseSheet = form.setAcceptingResponses(true)
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setPublishingSummary(false)
    .setShowLinkToRespondAgain(false);
  
  // Link form to current spreadsheet
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  
  // Add respondent details section first (if any)
  if (respondentDetails && respondentDetails.length > 0) {
    // Add a page break for respondent details section
    form.addPageBreakItem()
      .setTitle('Respondent Information')
      .setHelpText('Please provide your details before proceeding to the survey questions.');
    
    // Add each respondent detail field
    for (var rd = 0; rd < respondentDetails.length; rd++) {
      var field = respondentDetails[rd];
      var item = null;
      
      switch (field.type) {
        case 'TEXT':
          item = form.addTextItem();
          item.setTitle(field.fieldName);
          if (field.required) {
            item.setRequired(true);
          }
          break;
          
        case 'PARAGRAPH':
          item = form.addParagraphTextItem();
          item.setTitle(field.fieldName);
          if (field.required) {
            item.setRequired(true);
          }
          break;
          
        case 'DROPDOWN':
          item = form.addListItem();
          item.setTitle(field.fieldName);
          var dropdownChoices = [];
          for (var d = 0; d < field.options.length; d++) {
            dropdownChoices.push(item.createChoice(field.options[d]));
          }
          item.setChoices(dropdownChoices);
          if (field.required) {
            item.setRequired(true);
          }
          break;
          
        default:
          Logger.log('Warning: Unknown respondent detail type "' + field.type + '" for field: ' + field.fieldName);
          continue;
      }
    }
    
    // Add a page break before questions
    form.addPageBreakItem()
      .setTitle('Survey Questions')
      .setHelpText('Please answer the following questions.');
  }
  
  // Track current section to add page breaks
  var currentSection = null;
  
  // Add questions
  for (var i = 0; i < questions.length; i++) {
    var q = questions[i];
    
    // Add page break if section changed
    if (q.section && q.section !== '' && q.section !== currentSection) {
      form.addPageBreakItem()
        .setTitle(q.section)
        .setHelpText('Section: ' + q.section);
      currentSection = q.section;
    }
    
    // Add question based on type
    var item = null;
    
    switch (q.type) {
      case 'MCQ':
        item = form.addMultipleChoiceItem();
        item.setTitle(q.questionText);
        var choices = [];
        for (var c = 0; c < q.options.length; c++) {
          choices.push(item.createChoice(q.options[c]));
        }
        item.setChoices(choices);
        if (q.required) {
          item.setRequired(true);
        }
        break;
        
      case 'CHECKBOX':
        item = form.addCheckboxItem();
        item.setTitle(q.questionText);
        var checkboxChoices = [];
        for (var cb = 0; cb < q.options.length; cb++) {
          checkboxChoices.push(item.createChoice(q.options[cb]));
        }
        item.setChoices(checkboxChoices);
        if (q.required) {
          item.setRequired(true);
        }
        break;
        
      case 'DROPDOWN':
        item = form.addListItem();
        item.setTitle(q.questionText);
        var dropdownChoices = [];
        for (var d = 0; d < q.options.length; d++) {
          dropdownChoices.push(item.createChoice(q.options[d]));
        }
        item.setChoices(dropdownChoices);
        if (q.required) {
          item.setRequired(true);
        }
        break;
        
      case 'TEXT':
        item = form.addTextItem();
        item.setTitle(q.questionText);
        if (q.required) {
          item.setRequired(true);
        }
        break;
        
      case 'PARAGRAPH':
        item = form.addParagraphTextItem();
        item.setTitle(q.questionText);
        if (q.required) {
          item.setRequired(true);
        }
        break;
        
      default:
        Logger.log('Warning: Unknown question type "' + q.type + '" for question: ' + q.questionText);
        continue;
    }
  }
  
  // Get form URLs and ID
  var formId = form.getId();
  var editUrl = form.getEditUrl();
  var publishedUrl = form.getPublishedUrl();
  
  // Get response sheet name (usually "Form Responses 1")
  var responseSheetName = 'Form Responses 1'; // Default name
  try {
    var formResponseSheet = spreadsheet.getSheetByName('Form Responses 1');
    if (!formResponseSheet) {
      // Check for other possible names
      var sheets = spreadsheet.getSheets();
      for (var s = 0; s < sheets.length; s++) {
        if (sheets[s].getName().indexOf('Form Responses') !== -1) {
          responseSheetName = sheets[s].getName();
          break;
        }
      }
    }
  } catch (e) {
    Logger.log('Note: Response sheet name detection: ' + e.toString());
  }
  
  // Increment version
  var newVersion = parseInt(meta.version) + 1;
  
  return {
    formId: formId,
    editUrl: editUrl,
    publishedUrl: publishedUrl,
    version: newVersion.toString(),
    createdAt: new Date().toISOString(),
    responseSpreadsheetId: spreadsheet.getId(),
    responseSheetName: responseSheetName
  };
}

/**
 * Writes form metadata back to FormMeta sheet
 */
function writeMeta(formData) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var metaSheet = spreadsheet.getSheetByName('FormMeta');
  
  if (!metaSheet) {
    throw new Error('FormMeta sheet not found');
  }
  
  var data = metaSheet.getDataRange().getValues();
  
  // Update metadata values
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    var cell = metaSheet.getRange(i + 1, 2); // Column B (Value column)
    
    switch (key) {
      case 'FormId':
        cell.setValue(formData.formId);
        break;
      case 'FormEditUrl':
        cell.setValue(formData.editUrl);
        break;
      case 'FormPublishedUrl':
        cell.setValue(formData.publishedUrl);
        break;
      case 'Version':
        cell.setValue(formData.version);
        break;
      case 'CreatedAt':
        cell.setValue(formData.createdAt);
        break;
      case 'ResponseSpreadsheetId':
        cell.setValue(formData.responseSpreadsheetId);
        break;
      case 'ResponseSheetName':
        cell.setValue(formData.responseSheetName);
        break;
    }
  }
}

/**
 * Opens the form in edit mode
 */
function openFormEdit() {
  try {
    var meta = readMeta();
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var metaSheet = spreadsheet.getSheetByName('FormMeta');
    
    var data = metaSheet.getDataRange().getValues();
    var editUrl = '';
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === 'FormEditUrl') {
        editUrl = data[i][1];
        break;
      }
    }
    
    if (!editUrl || editUrl === '') {
      SpreadsheetApp.getUi().alert('Error', 'No form found. Please generate a form first.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // Open URL in new window
    var html = '<script>window.open("' + editUrl + '", "_blank");google.script.host.close();</script>';
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setHeight(50).setWidth(50), 'Opening Form...');
    
  } catch (error) {
    Logger.log('Error in openFormEdit: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error', 'Failed to open form: ' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Opens the form in published/view mode
 */
function openFormPublished() {
  try {
    var meta = readMeta();
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var metaSheet = spreadsheet.getSheetByName('FormMeta');
    
    var data = metaSheet.getDataRange().getValues();
    var publishedUrl = '';
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === 'FormPublishedUrl') {
        publishedUrl = data[i][1];
        break;
      }
    }
    
    if (!publishedUrl || publishedUrl === '') {
      SpreadsheetApp.getUi().alert('Error', 'No form found. Please generate a form first.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // Open URL in new window
    var html = '<script>window.open("' + publishedUrl + '", "_blank");google.script.host.close();</script>';
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setHeight(50).setWidth(50), 'Opening Form...');
    
  } catch (error) {
    Logger.log('Error in openFormPublished: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error', 'Failed to open form: ' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ============================================================================
// WEB APP API ENDPOINTS
// ============================================================================

/**
 * Handles GET requests (for health check or simple status)
 * Also handles OPTIONS preflight requests
 */
function doGet(e) {
  // Handle OPTIONS preflight
  if (e.parameter && e.parameter.method === 'OPTIONS') {
    return createResponse({ ok: true, message: 'OK' }, 200);
  }
  
  return createResponse({
    ok: true,
    message: 'HBMP Forms API is running',
    timestamp: new Date().toISOString()
  });
}

/**
 * Handles POST requests (main API endpoint)
 * Note: Apps Script doesn't expose custom HTTP headers directly in doPost.
 * The secret should be passed in the request body as 'secret' field.
 * The React component will send it in the body for compatibility.
 */
function doPost(e) {
  try {
    // Parse request body
    var requestData = {};
    if (e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (parseError) {
        return createErrorResponse('Invalid JSON in request body', 400);
      }
    } else if (e.parameter) {
      requestData = e.parameter;
    }
    
    // Verify secret (from request body - Apps Script limitation)
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('HBMP_SECRET');
    if (!expectedSecret) {
      Logger.log('Warning: HBMP_SECRET not set in Script Properties');
      return createErrorResponse('Server configuration error: HBMP_SECRET not set', 500);
    }
    
    // Get secret from request data
    // Accept both 'secret' and 'X-HBMP-SECRET' for flexibility
    var providedSecret = requestData.secret || requestData['X-HBMP-SECRET'];
    
    if (!providedSecret || providedSecret !== expectedSecret) {
      Logger.log('Unauthorized access attempt');
      return createErrorResponse('Unauthorized', 401);
    }
    
    // Handle the action
    var action = requestData.action;
    
    if (action === 'generateForm') {
      return handleGenerateForm(requestData);
    } else {
      return createErrorResponse('Unknown action: ' + (action || 'none'), 400);
    }
    
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    Logger.log('Error stack: ' + error.stack);
    return createErrorResponse('Internal server error: ' + error.toString(), 500);
  }
}

/**
 * Handles the generateForm action
 */
function handleGenerateForm(requestData) {
  try {
    var dryRun = requestData.dryRun === true || requestData.dryRun === 'true';
    
    // Ensure sheets exist
    ensureSheetsExist();
    
    // Read metadata
    var meta = readMeta();
    
    // Read respondent details
    var respondentDetails = readRespondentDetails();
    
    // Read questions with validation
    var questionsResult = readQuestionsWithValidation();
    var questions = questionsResult.questions;
    var stats = questionsResult.stats;
    
    if (questions.length === 0 && stats.skippedCount === 0) {
      return createResponse({
        ok: false,
        message: 'No questions found in Questions sheet',
        stats: stats
      });
    }
    
    // If dry run, just return validation results
    if (dryRun) {
      return createResponse({
        ok: true,
        message: 'Dry run completed. Validation successful.',
        stats: stats,
        dryRun: true
      });
    }
    
    // Build the form
    var formData = buildForm(meta, respondentDetails, questions);
    
    // Write metadata back
    writeMeta(formData);
    
    // Update stats with form info
    stats.formId = formData.formId;
    stats.version = formData.version;
    
    return createResponse({
      ok: true,
      message: 'Form created successfully',
      formId: formData.formId,
      editUrl: formData.editUrl,
      publishedUrl: formData.publishedUrl,
      version: formData.version,
      createdAt: formData.createdAt,
      stats: stats
    });
    
  } catch (error) {
    Logger.log('Error in handleGenerateForm: ' + error.toString());
    Logger.log('Error stack: ' + error.stack);
    return createErrorResponse('Failed to generate form: ' + error.toString(), 500);
  }
}

/**
 * Reads questions with validation and returns stats
 */
function readQuestionsWithValidation() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var questionsSheet = spreadsheet.getSheetByName('Questions');
  
  var stats = {
    sectionsCount: 0,
    questionsCount: 0,
    skippedCount: 0,
    errors: []
  };
  
  if (!questionsSheet) {
    stats.errors.push('Questions sheet not found');
    return { questions: [], stats: stats };
  }
  
  var data = questionsSheet.getDataRange().getValues();
  if (data.length <= 1) {
    stats.errors.push('No question rows found in Questions sheet');
    return { questions: [], stats: stats };
  }
  
  var questions = [];
  var sections = new Set();
  
  // Parse header row to find column indices
  var headers = data[0];
  var colIndices = {};
  for (var h = 0; h < headers.length; h++) {
    colIndices[headers[h]] = h;
  }
  
  // Process question rows
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var questionText = row[colIndices['QuestionText']];
    
    // Skip rows with empty question text
    if (!questionText || questionText.toString().trim() === '') {
      stats.skippedCount++;
      continue;
    }
    
    var question = {
      questionId: row[colIndices['QuestionId']] || '',
      section: row[colIndices['Section']] || '',
      order: parseFloat(row[colIndices['Order']]) || 0,
      type: (row[colIndices['Type']] || '').toString().toUpperCase(),
      questionText: questionText.toString(),
      required: (row[colIndices['Required']] || '').toString().toUpperCase() === 'TRUE',
      options: [],
      goToSectionOnOption: row[colIndices['GoToSectionOnOption']] || ''
    };
    
    // Track sections
    if (question.section && question.section !== '') {
      sections.add(question.section);
    }
    
    // Collect options for MCQ, CHECKBOX, DROPDOWN types
    if (question.type === 'MCQ' || question.type === 'CHECKBOX' || question.type === 'DROPDOWN') {
      for (var optNum = 1; optNum <= 5; optNum++) {
        var optionCol = 'Option' + optNum;
        var optionValue = row[colIndices[optionCol]];
        if (optionValue && optionValue.toString().trim() !== '') {
          question.options.push(optionValue.toString().trim());
        }
      }
      
      // Validate that at least one option exists
      if (question.options.length === 0) {
        stats.skippedCount++;
        stats.errors.push('Question "' + question.questionText + '" has type ' + question.type + ' but no options');
        continue;
      }
    }
    
    // Validate question type
    var validTypes = ['MCQ', 'CHECKBOX', 'DROPDOWN', 'TEXT', 'PARAGRAPH'];
    if (validTypes.indexOf(question.type) === -1) {
      stats.skippedCount++;
      stats.errors.push('Question "' + question.questionText + '" has invalid type: ' + question.type);
      continue;
    }
    
    questions.push(question);
  }
  
  // Sort by Section (alphabetically) then Order (numerically)
  questions.sort(function(a, b) {
    if (a.section !== b.section) {
      if (a.section === '') return 1;
      if (b.section === '') return -1;
      return a.section.localeCompare(b.section);
    }
    return a.order - b.order;
  });
  
  stats.sectionsCount = sections.size;
  stats.questionsCount = questions.length;
  
  return { questions: questions, stats: stats };
}

/**
 * Creates a JSON response with CORS headers
 * Note: Google Apps Script Web Apps automatically handle CORS when deployed with "Anyone" access
 */
function createResponse(data, statusCode) {
  statusCode = statusCode || 200;
  // ContentService doesn't support setHeaders(), but CORS is handled automatically by Google Apps Script
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Creates an error response
 */
function createErrorResponse(message, statusCode) {
  statusCode = statusCode || 500;
  return createResponse({
    ok: false,
    message: message
  }, statusCode);
}

