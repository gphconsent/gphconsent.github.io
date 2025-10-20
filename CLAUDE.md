# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static web application for collecting consent forms from apartment residents ("고척푸르지오힐스테이트 입주예정자협의회 위임 동의서"). It's a single-page application built with vanilla HTML, CSS, and JavaScript that handles digital signatures, image uploads, and form validation.

## Development Commands

**Running the Application:**
```bash
# No build process required - open directly in browser
open index.html        # macOS
start index.html       # Windows
```

**Local Development:**
- Use any static file server or open `index.html` directly in browser
- No package manager, build tools, or dependencies to install
- Changes to HTML/CSS/JS are immediately visible on refresh

## Architecture & Key Components

### File Structure
```
/
├── index.html          # Single-page application with multi-step form
├── css/style.css       # All styling and responsive design
├── js/script.js        # Client-side logic, validation, and Google Apps Script integration
└── img/               # Static assets and example images
```

### Core Technologies
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6)
- **Signature Capture:** SignaturePad.js library (loaded via CDN)
- **Backend Integration:** Google Apps Script (GAS) - configured in `js/script.js:6-9`

### Key Features & Implementation
- **Multi-step Form:** Single HTML file with multiple sections for user info, document upload, consent agreements, and digital signatures
- **Digital Signatures:** Two canvas elements (`name-pad`, `signature-pad`) using SignaturePad.js, combined into single image before submission
- **Image Upload & Preview:** File upload with immediate preview functionality for contract documents
- **Responsive Design:** Mobile-first CSS with support for desktop, tablet, and mobile
- **Client-side Validation:** Comprehensive form validation in `validateForm()` function

### Backend Configuration
The application is configured to submit to Google Apps Script:
- **GAS URL:** Set in `js/script.js:6` (`GAS_WEB_APP_URL`)
- **API Key:** Configured in `js/script.js:9` (`API_KEY`)
- **Authentication:** Uses API key validation for security without user login

### Form Data Structure
The form collects:
1. **Basic Info:** Email, name, apartment unit, DOB, phone number
2. **Contract Image:** Upload and preview of apartment supply contract
3. **Consent Agreements:** Multiple checkbox agreements for various authorizations
4. **Digital Signatures:** Name signature and main signature combined into single image
5. **Optional:** Name change documentation for title transfers

### Key Functions in `js/script.js`
- `validateForm()`: Comprehensive client-side validation
- `combinePads()`: Merges two signature canvases into single image
- `fileToBase64()`: Converts uploaded files to Base64 for GAS submission
- Form submission handler: Prepares all data for GAS backend

## Development Guidelines

### Code Style & Conventions
- **Korean Language:** All user-facing text and comments in Korean
- **Semantic HTML:** Well-structured form elements with proper labels and accessibility
- **CSS:** BEM-like naming, mobile-first responsive design
- **JavaScript:** ES6 features, Promise-based async operations, comprehensive error handling

### Brand Colors & Design Guidelines
When implementing design improvements, use the following brand color palette:
- **Primary Brand Color:** `#132D25` (Dark green - main branding color)
- **Secondary Brand Color:** `#6a140c` (Dark red - accent and highlight color)
- **Background Color:** `#FFFFFF` (White - clean background for content areas)

**Color Usage Guidelines:**
- Use `#132D25` for primary buttons, headers, and main brand elements
- Use `#6a140c` for highlights, error states, or secondary call-to-action elements
- Maintain sufficient contrast ratios for accessibility compliance
- Apply colors consistently across all UI components and interactions

### Security Considerations
- API key validation prevents unauthorized form submissions
- Client-side validation with server-side validation expected in GAS backend
- Personal information handling follows Korean privacy requirements

### Current Limitations & TODOs
1. **Email Verification:** Email verification button (`email-verify-btn`) has no functionality
2. **GAS Backend:** Google Apps Script backend needs implementation
3. **Error Handling:** More robust error handling for network failures
4. **Loading States:** Loading indicators during form submission

### Testing
- No automated testing framework
- Test manually across different screen sizes and browsers
- Verify signature pad functionality on touch devices
- Test file upload and preview features

## Important Implementation Notes

- **SignaturePad Library:** Loaded from CDN, handles touch and mouse input
- **Canvas Handling:** Signature pads auto-resize and maintain drawing data during window resize
- **Image Processing:** Files converted to Base64 for transmission to GAS backend
- **Form State:** Single-page form with progressive disclosure of sections
- **Validation:** Both individual field validation and comprehensive form validation before submission

When modifying this codebase:
1. Maintain Korean language for all user-facing elements
2. Test signature functionality on both desktop and mobile
3. Ensure responsive design remains intact
4. Validate form data structure matches expected GAS backend format
5. Use Context7 MCP for Google Apps Script implementation guidance
6. 모든 브라우저에서 호환이 가능한 방식으로 설계하고 코드를 구현하라.
7. 백엔드 코드는 .claude/GAS.js 파일을 참고해라.