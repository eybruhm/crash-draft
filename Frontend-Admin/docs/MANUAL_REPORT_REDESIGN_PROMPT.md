# Manual Report Insertion Page - Redesign Prompt

## Overview
Redesign the Manual Report Insertion Page to match the provided wireframe sketch, which shows a three-column layout with integrated search and display functionality.

## Current State
The page currently has:
- Report Form on the left (2/3 width)
- Search Tools sidebar on the right (1/3 width)
- Reports Collection visualization below

## Desired State (Based on Wireframe)

### Layout Structure
The page should be divided into **two main sections**:

#### **Left Section: Three-Column Form Layout**
Three vertical columns side-by-side:

1. **Column 1: Report Form (Primary Input)**
   - Contains all fields from `tbl_reports`:
     - `report_id` (optional, auto-generated or manual)
     - `reporter_id` (can be filled from User search)
     - `assigned_office_id` (can be filled from Police search)
     - `category` (text input)
     - `status` (dropdown: "Pending" or "Resolved")
     - `lat` / `lng` (location coordinates)
     - `city` (text input)
     - `barangay` (text input)
     - `remarks` (textarea)
     - `created_at` (timestamp format: YYYY-MM-DD HH:MM:SS.mmm)
     - `updated_at` (timestamp format: YYYY-MM-DD HH:MM:SS.mmm)

2. **Column 2: User Search & Selection**
   - Search input field: "Name or UUID"
   - Search button
   - Display area showing all `tbl_users` fields (except password):
     - UUID
     - Name
     - Email
     - Phone/Contact
     - (any other user fields)
   - Ability to select a user to auto-fill `reporter_id` in the Report Form

3. **Column 3: Police Office Search & Selection**
   - Search input field: "Office Name or UUID"
   - Search button
   - Display area showing `tbl_police_offices` fields:
     - UUID
     - Name (Office Name)
     - Email
     - Head Officer
     - Contact No.
     - Password (for admin reference)
   - Ability to select a police office to auto-fill `assigned_office_id` in the Report Form

#### **Right Section: Data Display/Search Results**
A table or grid showing search results with columns:
- UUID
- Name
- Email
- Phone
- (other relevant fields)

This section displays:
- User search results when searching for users
- Police office search results when searching for police offices
- Can show both simultaneously or switch between views

### Functional Requirements

1. **Form Integration**
   - When a user is selected from Column 2, auto-populate `reporter_id` in Column 1
   - When a police office is selected from Column 3, auto-populate `assigned_office_id` in Column 1
   - All form fields in Column 1 should be editable

2. **Search Functionality**
   - User search (Column 2): Search by Name or UUID
   - Police search (Column 3): Search by Office Name or UUID
   - Search results display in the Right Section
   - Selected items highlight and populate the form

3. **Submit Action**
   - Submit button at the bottom of Column 1 (Report Form)
   - On successful submission:
     - Insert new report into `tbl_reports` (temporary database)
     - Clear form fields
     - Show success message
     - Optionally refresh the Reports Collection visualization

### Sitemap Compliance

According to the sitemap (Section 4):

- ✅ **4.1 Section: Report Form (Primary Input)**
  - All `tbl_reports` fields with proper timestamp format

- ✅ **4.2 Section: Data Search Tools (Helper Components)**
  - **4.2.1 Tool: Search User**
    - Input: Name or UUID
    - Display: All `tbl_users` fields (except password)
  - **4.2.2 Tool: Search Police Office**
    - Input: Office Name or UUID
    - Display: `tbl_police_offices` fields (uuid, name, email, head officer, contact no., password)

- ✅ **4.3 Action: Submit Report**
  - Inserts new report into `tbl_reports`

### Visual Design Requirements

- Maintain the existing glassmorphism design theme
- Dark background with glass-elevated cards
- Consistent spacing and typography
- Responsive design (mobile-friendly)
- Clear visual separation between the three columns
- Highlight selected items in search results
- Visual feedback when form fields are auto-populated

### Implementation Notes

1. **State Management**
   - Track selected user and police office
   - Manage search results for both user and police searches
   - Handle form state for all report fields

2. **API Integration**
   - Use existing `api.searchUser(query)` for user search
   - Use existing `api.searchPoliceOffice(query)` for police search
   - Use existing `api.createReport(payload)` for submission
   - Use existing `api.listReports()` for visualization (if kept)

3. **Data Flow**
   - User searches → Results display in Right Section → User selects → `reporter_id` auto-fills
   - Police searches → Results display in Right Section → Police selects → `assigned_office_id` auto-fills
   - Form submission → New report created → Success feedback

### Optional Enhancements

- Keep the Reports Collection visualization below the main form (as currently implemented)
- Add form validation before submission
- Show loading states during searches
- Add error handling for failed searches
- Allow clearing selected user/police office
- Add keyboard shortcuts for common actions

## Expected Outcome

A redesigned Manual Report Insertion Page with:
- Three-column form layout on the left (Report Form, User Search, Police Search)
- Data display/search results table on the right
- Seamless integration between search tools and form fields
- Full compliance with the sitemap requirements
- Modern, intuitive user interface matching the existing design system

