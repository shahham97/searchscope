# SearchScope Contact Link Architecture & Implementation Guide

## Overview
SearchScope implements a seamless, client-side contact experience engineered specifically for desktop and mobile devices without requiring third-party form providers, databases, or spam collectors.

## Implementation Details

### Desktop Behavior
- Intercepts clicks and opens a new browser tab directly into Google Mail's compose interface:
  `https://mail.google.com/mail/?view=cm&fs=1&to=hello@searchscope.app&su=SearchScope%20Inquiry`
- Prevents pop-up blocking issues by specifying `_blank` with `noopener,noreferrer`.
- Eliminates the frustration of unconfigured OS desktop mail handlers (e.g. Windows Mail, Outlook modal prompts).

### Mobile Behavior
- Detects mobile User-Agents (`iPhone`, `iPad`, `iPod`, `Android`).
- Attempts deep linking to the native Gmail application:
  `googlegmail://co?to=hello@searchscope.app&subject=SearchScope%20Inquiry`
- Implements a timer fallback: If the native app fails to open within 500ms, triggers the standard device `mailto:hello@searchscope.app` protocol.

### One-Click Clipboard Copy
- Every contact component includes an accessible, dedicated "Copy Address" button with $\ge 44$px touch targets meeting WCAG 2.2 AA accessibility guidelines.
- Provides immediate visual feedback ("Copied!") for 2 seconds.

### Zero-Data Guarantee
- No contact form submission is routed through backend servers or stored in any database.
- Completely adheres to SearchScope's 100% private, transient-only architecture.
