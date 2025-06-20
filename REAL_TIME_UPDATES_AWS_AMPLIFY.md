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

### 1. **Smart Periodic Refresh (60 seconds)**
All dashboards now automatically refresh every 60 seconds (increased from 15 seconds) to balance real-time updates with user experience:

- **Advocate Dashboard**: `src/app/advocate/dashboard/page.tsx`
  - **Smart Refresh**: Only refreshes "My Leads" tab, pauses during search activity
- **Vendor Dashboard**: `src/app/vendor/dashboard/page.tsx`
- **Collections Dashboard**: `src/app/collections/dashboard/page.tsx`
- **Admin Analytics Dashboard**: `src/components/dashboard/AnalyticsDashboard.tsx`

```typescript
useEffect(() => {
  if (!user?.id) return;

  const refreshInterval = setInterval(() => {
    // Only refresh if user is not actively searching (advocate dashboard)
    if (selectedTab === 0) { // Only refresh "My Leads" tab
      console.log('🔄 Auto-refreshing dashboard for updated lead statuses');
      loadData();
    }
  }, 60000); // Refresh every 60 seconds instead of 15

  return () => clearInterval(refreshInterval);
}, [user?.id, selectedTab]); // Include selectedTab to pause during search
```

### 2. **Enhanced Search Experience**
The search functionality now includes:

- **Debounced Search**: 300ms delay to reduce API calls
- **Visual Feedback**: Loading spinner and search status indicators
- **No Interruption**: Auto-refresh pauses during active search
- **Smart Results**: Real-time result count and status messages

```typescript
// Search with loading states and activity indicators
const debouncedSearch = useCallback(
  useDebounce(async (searchQuery: string) => {
    setLoading(true);
    setIsSearching(true);
    // ... search logic
    setTimeout(() => setIsSearching(false), 1000);
  }, 300),
  []
);
```

### 3. **Tab Visibility Refresh**
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

### 4. **Immediate Callback Updates**
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

### 5. **Comprehensive Status Support**
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

### 6. **API Filtering for Visibility**

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

## Benefits of This Improved Approach

1. **Better User Experience**: 60-second refresh intervals reduce interruptions
2. **Search-Friendly**: Auto-refresh pauses during search activity
3. **Fast When Needed**: Tab focus triggers instant refresh
4. **Visual Feedback**: Users see search activity and results clearly
5. **Efficient**: Reduced API calls with debounced search
6. **Smart Context**: Different refresh strategies for different user activities

## Performance Optimizations

- **Reduced API Load**: 60-second intervals instead of 15-second
- **Debounced Search**: 300ms delay prevents excessive search API calls
- **Context-Aware**: Only refreshes relevant data based on user activity
- **Smart Pausing**: Stops auto-refresh during active search sessions

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