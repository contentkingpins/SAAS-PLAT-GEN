# 🚀 AWS Amplify UPS Integration Setup

## 📋 **Environment Variables Required**

Go to **AWS Amplify Console** → **Your App** → **Environment Variables** and add these:

### **🔐 Security Variables**
```bash
UPS_WEBHOOK_CREDENTIAL=1c60fc19395ace28204f84d7096d09d0386103644cf414cf6e3787c8060d909d
```

### **🚚 UPS API Credentials**
```bash
UPS_ACCESS_KEY=your-ups-access-key-here
UPS_USERNAME=your-ups-username-here
UPS_PASSWORD=your-ups-password-here
UPS_ACCOUNT_NUMBER=J22653
```

## 🔧 **UPS Developer Kit Setup**

### **Step 1: UPS Developer Account**
1. Go to: https://www.ups.com/upsdeveloperkit
2. Login with UPS account credentials
3. Navigate to your app: **"DELIVERY TRACKING"** (Account: J22653)

### **Step 2: Get API Credentials**
1. **API Access Key**: Found in Developer Kit dashboard
2. **Username/Password**: Your UPS account credentials
3. **Account Number**: J22653 (provided)

### **Step 3: Configure Webhook Subscription**
1. In UPS Developer Kit → **Webhooks/Notifications**
2. **Webhook URL**: `https://saasplat.amplifyapp.com/api/webhooks/ups-tracking`
3. **Credential Header**: `1c60fc19395ace28204f84d7096d09d0386103644cf414cf6e3787c8060d909d`
4. **Events to Subscribe**:
   - Package Tracking Updates
   - Delivery Notifications
   - Exception Notifications
   - In-Transit Updates

## 🧪 **Testing Setup**

### **Verify Environment Variables**
After adding to AWS Amplify, test with:
```bash
curl -X GET https://saasplat.amplifyapp.com/api/admin/test-ups-webhook \
  -H "Authorization: Bearer your-admin-token"
```

### **Test Webhook Endpoint**
```bash
curl -X POST https://saasplat.amplifyapp.com/api/webhooks/ups-tracking \
  -H "credential: 1c60fc19395ace28204f84d7096d09d0386103644cf414cf6e3787c8060d909d" \
  -H "user-agent: UPSPubSubTrackingService" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "1Z999AA1234567890",
    "localActivityDate": "20241201",
    "localActivityTime": "143000",
    "activityStatus": {
      "type": "D",
      "code": "008",
      "description": "DELIVERED"
    }
  }'
```

## ✅ **Verification Checklist**

- [ ] Environment variables added to AWS Amplify
- [ ] UPS Developer Kit configured with webhook URL
- [ ] Webhook credential matches environment variable
- [ ] Test webhook returns 200 status
- [ ] Admin test endpoint accessible
- [ ] UPS API credentials valid

## 🚨 **Security Notes**

- **Never commit credentials** to git repository
- **Use AWS Amplify environment variables** for all secrets
- **Rotate webhook credential** periodically
- **Monitor webhook logs** for unauthorized access attempts

## 🔗 **Useful Links**

- UPS Developer Kit: https://www.ups.com/upsdeveloperkit
- AWS Amplify Console: https://console.aws.amazon.com/amplify
- Webhook Endpoint: https://saasplat.amplifyapp.com/api/webhooks/ups-tracking
- Test Endpoint: https://saasplat.amplifyapp.com/api/admin/test-ups-webhook 