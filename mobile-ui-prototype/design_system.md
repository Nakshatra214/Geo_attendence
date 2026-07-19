# GeoAttend Mobile UI — Design System & Flutter Architecture

This document describes the design system tokens and Flutter-friendly UI architecture for the **GeoAttend** user mobile application. It ensures a consistent, high-fidelity experience that fits into the existing dark-mode ecosystem of the Admin Dashboard.

---

## 🎨 Design System Tokens

### 1. Color Palette (Enterprise SaaS Style)
| Token Name | Hex Value / CSS Definition | Usage / Notes |
| :--- | :--- | :--- |
| **Primary/Accent** | `#6366f1` (Indigo) | Key buttons, active nav, primary text highlights |
| **Accent Gradient** | `linear-gradient(135deg, #6366f1, #4f46e5)` | Brand logo, splash screens, biometric scanner, check-in CTAs |
| **BG Main** | `#0b0f19` (Deep Obsidian Blue) | Mobile body background |
| **BG Card** | `#161e31` (Elevated Card Blue) | Dashboard cards, forms, verify detail cards |
| **BG Nav** | `#0f1526` | Bottom navigation bar & top app bar background |
| **Border Dark** | `rgba(255, 255, 255, 0.07)` | Standard separators and card outlines |
| **Border Focus** | `rgba(99, 102, 241, 0.4)` | Focused text fields & selection borders |
| **Success** | `#10b981` (Emerald Green) | Verified location/face badges, checked-in status |
| **Warning** | `#f59e0b` (Amber Orange) | Late arrival warnings, pending leave status |
| **Danger** | `#ef4444` (Vibrant Red) | Geofence rejection alerts, rejected leave requests |
| **Text Primary** | `#f8fafc` | Main headings, body labels, high emphasis |
| **Text Secondary** | `#94a3b8` | Subheadings, descriptions, helper texts |
| **Text Muted** | `#64748b` | Timestamps, placeholders, inactive states |

### 2. Typography
* **Primary Sans-Serif**: `Inter` (used for standard body text, buttons, alerts, forms)
* **Brand/Display**: `Poppins` (used for clean headers, splash screens, numeric readouts)
* **System UI**: `SF Pro Display` / `-apple-system` (smooth system styling)

---

## 🏗️ Flutter-Friendly Screen Architecture

The HTML elements in this prototype mapped directly to a standard Flutter directory structure:

```
lib/
├── main.dart                      # App entry point, controls splash transitions
├── constants/
│   └── app_colors.dart            # Contains Hex Color variables matching CSS design tokens
├── widgets/
│   ├── custom_button.dart         # Flat, gradient, and ghost button variations
│   ├── custom_card.dart           # Custom Container with 16-24px rounded corners and subtle shadows
│   ├── custom_text_field.dart     # Form input widget with focus states & password show/hide
│   ├── bottom_nav.dart            # Interactive bottom bar widget with standard indexes
│   └── status_badge.dart          # Capsule indicator with configurable status colors
└── screens/
    ├── 01_splash_screen.dart      # Center logo, tagline, animated loading bar
    ├── 02_login_screen.dart       # Form fields with input validation and security checklist Card
    ├── 03_register_screen.dart    # Profile upload form widget, fields for sign-up
    ├── 04_dashboard_screen.dart   # Dashboard screen containing KPI grid and mark attendance link
    ├── 05_location_screen.dart    # Map implementation (Google Maps Flutter plugin) with Geofence circle
    ├── 06_face_screen.dart        # Biometrics page using CameraController & circular layout clip
    ├── 07_mark_screen.dart        # Double-check confirmation screen showing green badges
    ├── 08_history_screen.dart     # Attendance listing with filters & Search bar
    ├── 09_analytics_screen.dart   # Recharts translated to flutter_chart or fl_chart libraries
    ├── 10_notifications_screen.dart# Simple ListView.builder showing categorized push alerts
    ├── 11_profile_screen.dart     # Personal stats, current avatar, and standard settings list
    └── 12_leave_screen.dart       # Form layout for submitting leave and dynamic summary status list
```

### Widget Equivalence Table

| HTML/CSS Feature | Flutter Widget Equivalent |
| :--- | :--- |
| `display: flex; flex-direction: column;` | `Column(crossAxisAlignment: ..., children: [...])` |
| `display: flex; flex-direction: row;` | `Row(mainAxisAlignment: ..., children: [...])` |
| `display: grid; grid-template-columns: 1fr 1fr;` | `GridView.count(crossAxisCount: 2, children: [...])` or `Row` |
| `border-radius: 16px; box-shadow: ...` | `Container(decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), boxShadow: [...]))` |
| `backdrop-filter: blur(8px)` | `BackdropFilter(filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8))` |
| `animation: spin 1s linear infinite` | `RotationTransition` or `CircularProgressIndicator` |
| SVG charts (Recharts) | `fl_chart` library widgets (`LineChart`, `BarChart`) |
