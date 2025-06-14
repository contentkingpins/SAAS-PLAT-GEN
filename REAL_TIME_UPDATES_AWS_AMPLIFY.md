# Real-Time Lead Status Updates for AWS Amplify

## Problem
AWS Amplify is a serverless environment that doesn't support WebSocket connections, which means traditional real-time updates aren't possible. However, we need to ensure that when an advocate updates a lead status, it's immediately visible to:

- **Admin users** (can see all leads)
- **Vendor users** (can see leads from their vendor and sub-vendors)
- **Sub-vendor users** (can see leads from their sub-vendor)
- **Advocate agents** (can see their assigned leads)
- **Collections agents** (can see leads in collections)

## Solution for AWS Amplify

Since WebSocket isn't available, we've implemented a multi-layered approach:

### 1. **Automatic Periodic Refresh (15 seconds)**
All dashboards now automatically refresh every 15 seconds to fetch the latest lead statuses:

- **Advocate Dashboard**: `src/app/advocate/dashboard/page.tsx`
- **Vendor Dashboard**: `src/app/vendor/dashboard/page.tsx`
- **Collections Dashboard**: `src/app/collections/dashboard/page.tsx`
- **Admin Analytics Dashboard**: `src/components/dashboard/AnalyticsDashboard.tsx`

```typescript
useEffect(() => {
  if (!user?.id) return;

  const refreshInterval = setInterval(() => {
    console.log('🔄 Auto-refreshing dashboard for updated lead statuses');
    loadData();
  }, 15000); // Refresh every 15 seconds

  return () => clearInterval(refreshInterval);
}, [user?.id]);
```

### 2. **Tab Visibility Refresh**
When users switch back to the browser tab, the dashboard immediately refreshes to show the latest updates:

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden && user?.id) {
      console.log('🔄 Tab became visible - refreshing dashboard for latest lead statuses');
      loadData();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [user?.id]);
```

### 3. **Immediate Callback Updates**
When a lead is updated through the LeadDetailModal, it immediately calls back to refresh the parent dashboard:

```typescript
// In LeadDetailModal
if (onLeadUpdated) {
  onLeadUpdated(response.lead);
}

// In parent dashboards
const handleLeadUpdated = (updatedLead: any) => {
  console.log('Lead updated:', updatedLead);
  setSelectedLead(updatedLead);
  
  // Always refresh the leads list to show updated status
  loadAdvocateData();
};
```

### 4. **Comprehensive Status Support**
All dashboards now support the full range of lead statuses with proper color coding:

**Positive Statuses (Green):**
- `QUALIFIED`
- `APPROVED`
- `SENT_TO_CONSULT`

**Warning Statuses (Orange/Yellow):**
- `SUBMITTED`
- `ADVOCATE_REVIEW`

**Negative Statuses (Red):**
- `DOESNT_QUALIFY`
- `PATIENT_DECLINED`
- `DUPLICATE`
- `COMPLIANCE_ISSUE`

**Info Statuses (Blue):**
- `KIT_COMPLETED`
- `SHIPPED`

### 5. **API Filtering for Visibility**

#### Advocate Dashboard
Shows leads with all possible statuses that an advocate might have worked on:
```typescript
const queryUrl = `leads?advocateId=${advocateId}&status=ADVOCATE_REVIEW,QUALIFIED,SENT_TO_CONSULT,DOESNT_QUALIFY,PATIENT_DECLINED,DUPLICATE,COMPLIANCE_ISSUE`;
```

#### Vendor Dashboard
Shows leads from the vendor and all their sub-vendors:
```sql
WHERE (vendorId = ? OR vendor.parentVendorId = ?)
```

#### Admin Dashboard
Shows all leads across the entire system with comprehensive analytics.

## Benefits of This Approach

1. **Works in Serverless Environment**: No WebSocket dependency
2. **Fast Updates**: 15-second refresh cycle provides near real-time feel
3. **Immediate Visibility**: Tab focus triggers instant refresh
4. **Comprehensive Coverage**: All user types see relevant lead updates
5. **Efficient**: Only refreshes when needed (user active, tab visible)
6. **Scalable**: Works regardless of number of users or leads

## Performance Considerations

- **15-second intervals** balance responsiveness with server load
- **Tab visibility detection** prevents unnecessary API calls when users aren't active
- **Efficient API queries** with proper filtering reduce data transfer
- **Callback-based updates** provide immediate feedback for user actions

## Future Enhancements

When moving to a non-serverless environment, this system can be enhanced with:
- WebSocket connections for true real-time updates
- Server-sent events (SSE) for one-way real-time data
- Push notifications for critical status changes

## Testing the Solution

1. **Multi-User Test**: Have an advocate update a lead status
2. **Check Visibility**: Verify the update appears in:
   - Admin dashboard (within 15 seconds)
   - Vendor dashboard (within 15 seconds)
   - Other advocate dashboards (if relevant)
   - Collections dashboard (if lead moves to collections)
3. **Tab Switch Test**: Switch away from tab, update lead elsewhere, switch back - should refresh immediately
4. **Status Color Test**: Verify all status types show correct colors (red for negative, green for positive)

This solution ensures that lead status updates are visible across all relevant user dashboards in the AWS Amplify serverless environment. 