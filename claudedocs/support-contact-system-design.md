# Support & Contact System Design

## Overview
Complete customer support and contact inquiry system with:
1. **Public Contact Form** - Marketing site contact page for inquiries
2. **Admin Support Management** - Existing admin panel to view/respond to tickets

## Current Issues
1. ❌ "전체 기능 비교표 보기" link at [PricingSection.tsx:211](src/components/marketing/sections/PricingSection.tsx#L211) - `href="#"` (no destination)
2. ❌ "문의하기" link at [MarketingFooter.tsx:22](src/components/marketing/layout/MarketingFooter.tsx#L22) - `href="#"` (no destination)

## Solution Architecture

### 1. Public Contact/Inquiry System

#### 1.1 Contact Page Route
**File**: `/src/app/(marketing)/contact/page.tsx`
- Public marketing page for customer inquiries
- Accessible without authentication
- Creates support tickets in the database

#### 1.2 Contact Form Component
**Component**: `ContactForm` (client component)
- **Fields**:
  - 회사명 (Company Name) - required
  - 이름 (Full Name) - required
  - 이메일 (Email) - required, validated
  - 전화번호 (Phone) - optional
  - 문의 유형 (Category) - select dropdown
    - 기술 문의 (technical)
    - 결제 문의 (billing)
    - 기능 요청 (feature_request)
    - 버그 신고 (bug)
    - 일반 문의 (general)
  - 제목 (Subject) - required
  - 내용 (Description) - required, textarea
  - 첨부파일 (Attachments) - optional, multiple files

#### 1.3 Contact API Endpoint
**File**: `/src/app/api/contact/route.ts`
- **Method**: POST
- **Public endpoint** (no auth required)
- **Flow**:
  1. Validate input data
  2. Check if company exists by business_number or create guest company
  3. Create support_ticket record
  4. Set status='open', priority='medium' by default
  5. Send confirmation email to submitter
  6. Send notification to admin team
  7. Return ticket ID and success message

### 2. Database Schema (Existing)

#### support_tickets table
```sql
- id: UUID (PK)
- company_id: UUID (FK → companies)
- created_by_user_id: UUID (FK → users, nullable for public inquiries)
- assigned_admin_id: UUID (FK → users)
- subject: VARCHAR(255)
- description: TEXT
- status: VARCHAR(20) - 'open' | 'in_progress' | 'resolved' | 'closed'
- priority: VARCHAR(20) - 'low' | 'medium' | 'high' | 'urgent'
- category: VARCHAR(50) - 'billing' | 'technical' | 'feature_request' | 'bug' | 'general'
- attachments: JSONB
- tags: TEXT[]
- created_at, updated_at, resolved_at, closed_at: TIMESTAMPTZ
```

#### For Public Inquiries (No Auth)
- Create a special "guest" company or use `created_by_user_id = NULL`
- Store contact info in description or custom fields
- Admin can convert to real company later

### 3. Admin Support Management (Existing)

#### Admin Routes (Already Implemented)
- ✅ `/admin/support` - List all tickets
- ✅ `/admin/support/[id]` - View/respond to ticket
- ✅ `/api/admin/support/tickets` - API endpoint
- ✅ `/api/admin/support/stats` - Statistics

### 4. Link Fixes

#### 4.1 Feature Comparison Link
**File**: [src/components/marketing/sections/PricingSection.tsx](src/components/marketing/sections/PricingSection.tsx#L211)
```tsx
// BEFORE
<a href="#" className="...">전체 기능 비교표 보기</a>

// AFTER
<Link href="/features/comparison" className="...">전체 기능 비교표 보기</Link>
```

#### 4.2 Contact Link
**File**: [src/components/marketing/layout/MarketingFooter.tsx](src/components/marketing/layout/MarketingFooter.tsx#L22)
```tsx
// BEFORE
{ name: '문의하기', href: '#' }

// AFTER
{ name: '문의하기', href: '/contact' }
```

## Implementation Plan

### Phase 1: Fix Existing Links (5 min)
1. ✅ Update PricingSection comparison link to `/features/comparison`
2. ✅ Update MarketingFooter contact link to `/contact`

### Phase 2: Contact Page & Form (30 min)
1. ✅ Create `/src/app/(marketing)/contact/page.tsx`
2. ✅ Create `/src/components/marketing/contact/ContactForm.tsx`
3. ✅ Create `/src/components/marketing/contact/ContactHero.tsx`
4. ✅ Implement form validation with react-hook-form
5. ✅ Add file upload support (optional)

### Phase 3: Contact API (20 min)
1. ✅ Create `/src/app/api/contact/route.ts`
2. ✅ Implement ticket creation logic
3. ✅ Handle guest inquiries (no auth required)
4. ✅ Email notifications (optional)

### Phase 4: Testing & Polish (15 min)
1. ✅ Test contact form submission
2. ✅ Verify tickets appear in admin panel
3. ✅ Test admin response flow
4. ✅ Add success/error messages
5. ✅ Accessibility improvements

## Data Flow

### Public Contact Submission
```
User visits /contact
  → Fills ContactForm
  → POST /api/contact
  → Create support_ticket (status='open', created_by_user_id=NULL)
  → Store contact info in description/fields
  → Return success message
  → Admin sees ticket in /admin/support
```

### Admin Response Flow (Existing)
```
Admin visits /admin/support
  → Views ticket list (with public inquiries)
  → Clicks ticket to open /admin/support/[id]
  → Views details and conversation
  → Adds reply via support_ticket_messages
  → Updates status (open → in_progress → resolved → closed)
  → Customer receives email notification (if contact email provided)
```

## Security Considerations

### Public Contact Form
- ✅ Rate limiting to prevent spam
- ✅ CAPTCHA or honeypot field (optional)
- ✅ Input validation and sanitization
- ✅ File upload restrictions (size, type)
- ✅ XSS prevention in user-submitted content

### RLS Policies (Existing)
- ✅ Public can insert support_tickets (contact form)
- ✅ Super admins can view/manage all tickets
- ✅ Users can view their company's tickets
- ✅ Internal notes only visible to admins

## UI/UX Design

### Contact Page Layout
```
┌─────────────────────────────────────┐
│         Contact Hero Section        │
│   "고객 지원팀이 도와드리겠습니다"    │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│         Contact Form Card           │
│  ┌───────────────────────────────┐  │
│  │ Company Name [required]       │  │
│  │ Full Name [required]          │  │
│  │ Email [required]              │  │
│  │ Phone (optional)              │  │
│  │ Category [select]             │  │
│  │ Subject [required]            │  │
│  │ Description [textarea]        │  │
│  │ Attachments [file upload]    │  │
│  │                               │  │
│  │ [Submit Button]              │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│      FAQ / Quick Links Section      │
│   "자주 묻는 질문을 확인하세요"       │
└─────────────────────────────────────┘
```

### Success Flow
```
Form Submission
  → Loading state
  → Success message with ticket ID
  → "티켓 번호: #ABC-1234"
  → "영업일 기준 24시간 내 답변드리겠습니다"
  → Option to submit another inquiry
```

## Email Notifications (Optional Enhancement)

### Customer Confirmation Email
```
Subject: [Funnely] 문의가 접수되었습니다 (#ABC-1234)

{customer_name}님, 안녕하세요.

문의가 성공적으로 접수되었습니다.

티켓 번호: #ABC-1234
제목: {subject}
접수 시간: {created_at}

영업일 기준 24시간 내 답변드리겠습니다.

감사합니다.
Funnely 고객지원팀
```

### Admin Notification Email
```
Subject: [Funnely Admin] 새로운 문의가 접수되었습니다

티켓 번호: #ABC-1234
회사명: {company_name}
이름: {contact_name}
이메일: {contact_email}
카테고리: {category}
우선순위: {priority}

제목: {subject}

{description}

관리 페이지에서 확인하기:
https://app.funnely.com/admin/support/{ticket_id}
```

## Testing Checklist

### Contact Form
- [ ] All required fields validated
- [ ] Email format validation
- [ ] Phone number formatting (optional)
- [ ] Category selection works
- [ ] File upload works (if implemented)
- [ ] Form submission creates ticket
- [ ] Success message displays
- [ ] Error handling works
- [ ] Loading states display correctly

### API
- [ ] POST /api/contact creates ticket
- [ ] Validation errors return 400
- [ ] Rate limiting prevents spam
- [ ] File uploads stored correctly
- [ ] Email notifications sent (if implemented)

### Admin Panel
- [ ] Public inquiries visible in ticket list
- [ ] Ticket details show correctly
- [ ] Admin can reply to public inquiries
- [ ] Status changes work
- [ ] Priority updates work

### Links
- [ ] "전체 기능 비교표 보기" navigates to /features/comparison
- [ ] "문의하기" navigates to /contact
- [ ] All navigation flows work correctly

## Performance Considerations

- Contact form submission: < 1 second
- File uploads: Progress indicator for large files
- Email sending: Async/background job (don't block response)
- Admin panel: Pagination for large ticket volumes

## Accessibility

- Form labels properly associated
- Error messages announced to screen readers
- Keyboard navigation support
- ARIA attributes for dynamic content
- Focus management on form submission

## Future Enhancements

1. **Live Chat Integration** - Real-time support widget
2. **Email to Ticket** - Convert support emails to tickets
3. **Customer Portal** - Self-service ticket tracking
4. **SLA Tracking** - Response time monitoring
5. **Canned Responses** - Quick reply templates
6. **Ticket Assignment Rules** - Auto-assign by category
7. **Knowledge Base** - Self-help articles
8. **Satisfaction Ratings** - Post-resolution surveys

## File Structure

```
src/
├── app/
│   ├── (marketing)/
│   │   └── contact/
│   │       └── page.tsx                    # Contact page
│   └── api/
│       └── contact/
│           └── route.ts                    # Contact API
└── components/
    └── marketing/
        ├── contact/
        │   ├── ContactHero.tsx             # Hero section
        │   ├── ContactForm.tsx             # Main form
        │   └── ContactFAQ.tsx              # FAQ section (optional)
        ├── sections/
        │   └── PricingSection.tsx          # Fix comparison link
        └── layout/
            └── MarketingFooter.tsx         # Fix contact link
```

## Summary

This design provides:
1. ✅ Public contact form for customer inquiries
2. ✅ Integration with existing admin support system
3. ✅ Fixed broken navigation links
4. ✅ Complete data flow from inquiry to resolution
5. ✅ Security and validation best practices
6. ✅ Scalable architecture for future enhancements

Implementation time: ~70 minutes
Priority: High (fixes broken user-facing links)
