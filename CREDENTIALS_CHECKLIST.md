# 🔑 UPS Integration Credentials Checklist

## 📋 **CREDENTIAL STATUS**

### ✅ **WHAT WE HAVE (Ready to Use)**
- **UPS_WEBHOOK_CREDENTIAL**: `1c60fc19395ace28204f84d7096d09d0386103644cf414cf6e3787c8060d909d`
- **UPS_ACCOUNT_NUMBER**: `J22653`
- **Webhook URL**: `https://saasplat.amplifyapp.com/api/webhooks/ups-tracking`

### ❌ **WHAT YOU NEED TO GET MANUALLY**

#### 🔐 **UPS Developer Kit Credentials**
**Where to get**: https://www.ups.com/upsdeveloperkit

1. **UPS_ACCESS_KEY** 
   - Login to UPS Developer Kit
   - Navigate to "DELIVERY TRACKING" app (Account: J22653)
   - Find "API Access Key" in dashboard

2. **UPS_USERNAME**
   - Your UPS account username/email
   - Same credentials you use to login to ups.com

3. **UPS_PASSWORD**
   - Your UPS account password
   - Same credentials you use to login to ups.com

---

## 🎯 **IMMEDIATE ACTIONS FOR YOU**

### **Step 1: Get UPS Credentials** (5 minutes)
1. Go to: https://www.ups.com/upsdeveloperkit
2. Login with your UPS account
3. Navigate to app "DELIVERY TRACKING" (Account: J22653)
4. Copy the API Access Key
5. Note your username/password

### **Step 2: Add to AWS Amplify** (5 minutes)
1. Go to: https://console.aws.amazon.com/amplify
2. Select your SAAS-PLAT-GEN app
3. Go to **Environment Variables**
4. Add these 5 variables:

```bash
UPS_WEBHOOK_CREDENTIAL=1c60fc19395ace28204f84d7096d09d0386103644cf414cf6e3787c8060d909d
UPS_ACCESS_KEY=your-api-access-key-from-step-1
UPS_USERNAME=your-ups-username
UPS_PASSWORD=your-ups-password
UPS_ACCOUNT_NUMBER=J22653
```

### **Step 3: Configure UPS Webhook** (2 minutes)
1. In UPS Developer Kit → **Webhooks/Notifications**
2. **Webhook URL**: `https://saasplat.amplifyapp.com/api/webhooks/ups-tracking`
3. **Credential**: `1c60fc19395ace28204f84d7096d09d0386103644cf414cf6e3787c8060d909d`
4. **Events**: Package Tracking, Delivery Notifications, Exceptions

---

## 🧪 **TESTING COMMANDS (After Configuration)**

```bash
# Test integration health
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" https://saasplat.amplifyapp.com/api/admin/test-ups-integration

# Test webhook
curl -X POST https://saasplat.amplifyapp.com/api/admin/test-ups-integration \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "test-webhook", "leadId": "LEAD_ID"}'

# Ship a lead
curl -X POST https://saasplat.amplifyapp.com/api/admin/ship-lead \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leadId": "APPROVED_LEAD_ID"}'
```

---

## ⏱️ **ESTIMATED COMPLETION TIME**
- **UPS Credentials**: 5 minutes
- **AWS Amplify Setup**: 5 minutes  
- **UPS Webhook Config**: 2 minutes
- **Testing**: 3 minutes
- **Total**: ~15 minutes

## 🎉 **SUCCESS INDICATORS**
- ✅ Integration test returns 100% score
- ✅ Webhook test returns 200 status
- ✅ Lead shipping creates tracking number
- ✅ Real-time status updates appear in admin dashboard 