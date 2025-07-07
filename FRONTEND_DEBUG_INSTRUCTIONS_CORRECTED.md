# 🔍 **CORRECTED: CSV Debug Instructions for Frontend Team**

## 🚨 **IMPORTANT CORRECTION**
The previous instructions had a format mismatch. Here's the **CORRECT** way to use our debug endpoint:

---

## 🎯 **CORRECT METHOD: FormData Upload**

Our debug endpoint expects a **file upload via FormData**, not JSON with base64.

### **✅ CORRECT JavaScript Code:**

```javascript
// CORRECTED: CSV Debug Uploader (paste in browser console)
const input = document.createElement('input');
input.type = 'file';
input.accept = '.csv';
input.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  console.log('📁 Analyzing CSV:', file.name);
  
  // Create FormData (not JSON!)
  const formData = new FormData();
  formData.append('file', file);
  
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch('/api/admin/debug-csv-headers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Note: No Content-Type header for FormData!
      },
      body: formData  // Send FormData, not JSON
    });
    
    const result = await response.json();
    
    console.log('🎯 SEND THIS TO BACKEND TEAM:');
    console.log('═'.repeat(50));
    console.log(JSON.stringify(result.debug, null, 2));
    console.log('═'.repeat(50));
    
    // Also show in a copyable format
    const copyText = `DEBUG RESULTS FROM CSV UPLOAD:

File: ${file.name}
Endpoint Used: /api/admin/debug-csv-headers
Status: ${response.status}

Debug Response:
${JSON.stringify(result.debug, null, 2)}

Please update the column mapping so our CSV will process correctly.`;
    
    console.log('\n📋 COPY THIS MESSAGE TO BACKEND TEAM:');
    console.log(copyText);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};
input.click();
```

---

## 🚀 **ALTERNATIVE: Simple Admin Panel Test**

### **Method 1: Browser Console** (Recommended)
1. **Login** to admin panel: `https://main.d1iz6ogqp82qj7.amplifyapp.com/admin/dashboard`
2. **Open Console** (F12)
3. **Paste the corrected code above** and press Enter
4. **Select your CSV file** when the file picker opens
5. **Copy the debug results** from console
6. **Send to backend team**

### **Method 2: Postman/cURL Test**
```bash
curl -X POST https://main.d1iz6ogqp82qj7.amplifyapp.com/api/admin/debug-csv-headers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@your-shipping-file.csv"
```

### **Method 3: Add to Admin Panel** (If needed)
Create a temporary debug page in your admin panel with a simple file upload form that posts to `/api/admin/debug-csv-headers`.

---

## 📊 **EXPECTED DEBUG OUTPUT**

You should get a response like this:

```json
{
  "success": true,
  "debug": {
    "fileName": "shipping_report_1440_rows.csv",
    "delimiter": "COMMA",
    "totalRows": 1440,
    "columnNames": [
      "Customer_Name",
      "Ship_To_Address", 
      "City_Name",
      "State_Code",
      "ZIP_Code",
      "Email_Address",
      "Package_Tracking_Number"
    ],
    "sampleRowData": {
      "Customer_Name": "Smith, John",
      "Ship_To_Address": "123 Main St",
      "City_Name": "Atlanta", 
      "State_Code": "GA",
      "ZIP_Code": "30309",
      "Email_Address": "john@email.com",
      "Package_Tracking_Number": "1Z999AA1234567890"
    },
    "analysisHelp": {
      "message": "Compare these column names with your CSV to identify mapping issues"
    }
  }
}
```

---

## 📤 **SEND THIS TO BACKEND TEAM**

```
DEBUG RESULTS FROM CSV UPLOAD:

File: [your_filename.csv]
Endpoint Used: /api/admin/debug-csv-headers
Status: 200

Debug Response:
[PASTE THE ENTIRE "debug" OBJECT HERE]

Please update the column mapping in shipping-report/route.ts so our CSV will process correctly.
Current issue: System shows "0/0 processed" because these column names don't match your field mapping.
```

---

## ⚡ **KEY DIFFERENCES FROM PREVIOUS INSTRUCTIONS**

### **❌ Wrong (Previous):**
```javascript
// This won't work with our endpoint:
body: JSON.stringify({
  fileName: file.name,
  fileContent: base64
})
```

### **✅ Correct (Now):**
```javascript
// This matches our endpoint:
const formData = new FormData();
formData.append('file', file);
body: formData
```

---

## 🎯 **SUMMARY FOR FRONTEND TEAM**

1. **Use the corrected JavaScript code** (FormData, not JSON)
2. **Upload your problematic CSV file** via browser console
3. **Copy the debug output** from console
4. **Send debug results** to backend team
5. **Wait for column mapping update** (~5 minutes)
6. **Re-test original upload** - should work!

The endpoint is deployed and working - just need to use the right upload format! 🚀 