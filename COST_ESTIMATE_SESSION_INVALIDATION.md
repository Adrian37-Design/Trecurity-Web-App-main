# Real-Time Session Invalidation - Cost Estimate

**Date:** December 29, 2025  
**Feature:** Force logout for disabled users/companies  
**Client:** Trecurity GPS Tracking Platform

---

## Feature Description

Implement real-time session invalidation that automatically logs out users when their account or company is disabled by SUPER_ADMIN. This ensures disabled users cannot continue accessing the system even if they're already logged in.

---

## Technical Approach

**Method:** Server-side middleware to check user status on every protected API request

**Implementation:**
- Create middleware file: `server/middleware/check-user-status.ts`
- Check user `status` and `is_locked` fields from database
- Clear JWT cookie if user is disabled
- Return 401 Unauthorized to trigger frontend logout
- Verify frontend handles 401 gracefully (redirect to login)

**Performance Impact:**
- Additional database query per request
- Can be mitigated with 30-second caching
- Estimated overhead: 5-10ms per request

---

## Time Estimate

### Development Breakdown

| Task | Estimated Hours | Description |
|------|----------------|-------------|
| **Middleware Creation** | 1.0 | Create status check middleware, handle edge cases |
| **Testing** | 1.0 | Test across scenarios (user disabled, company disabled, multiple sessions) |
| **Frontend Verification** | 0.5 | Verify 401 handling and redirect logic works |
| **Documentation & Edge Cases** | 0.5 | Handle race conditions, document behavior |
| **Buffer** | 1.0 | Unforeseen issues, additional testing |
| **TOTAL** | **4.0 hours** | Conservative estimate |

---

## Market Rate Analysis

### Zimbabwean Developer Rates (December 2025)

Based on current market conditions:

| Experience Level | Hourly Rate (USD) | Description |
|-----------------|-------------------|-------------|
| Junior Developer | $10 - $15 | Basic CRUD, simple features |
| Mid-level Developer | $20 - $35 | Auth systems, middleware, API design |
| Senior Developer | $40 - $60 | Architecture, complex systems, optimization |

### This Task Classification

**Complexity:** Mid-level
- Requires understanding of authentication flows
- Involves security considerations
- Needs knowledge of middleware patterns
- Not highly complex, but not beginner-level

**Appropriate Rate:** **$25/hour**

---

## Cost Calculation

| Line Item | Hours | Rate (USD/hr) | Subtotal (USD) |
|-----------|-------|---------------|----------------|
| **Development** | 2.5 | $25 | $62.50 |
| **Testing** | 1.0 | $25 | $25.00 |
| **Documentation** | 0.5 | $25 | $12.50 |
| **TOTAL** | **4.0** | | **$100.00** |

---

**Prepared by:** Adrian (Inferth Projects)  
**Status:** Estimate declined by client

---

## Notes

This estimate was prepared but the feature was **not implemented** as the client decided the cost was not justified for their use case. Alternative approach: Allow JWT tokens to expire naturally (no additional cost).
