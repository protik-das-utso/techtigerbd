# Header Component Usage Guide

## Overview
The Header Component is a reusable component that provides consistent header styling and functionality across all pages.

## Installation

### 1. Include CSS and JavaScript files in your HTML head:

```html
  <!-- Header -->
  <link rel="stylesheet" href="../components/header/header-component.css">
  <script defer src="../components/header/header-component.js"></script>
```

### 2. Remove existing header HTML
Replace your existing header HTML with a comment:
```html
<body>
  <!-- Header will be injected by HeaderComponent -->
  <main>
    <!-- Your content here -->
  </main>
</body>
```

### 3. Initialize the component
Add this script before the closing `</body>` tag:

```html
<script>
document.addEventListener('DOMContentLoaded', function() {
  HeaderComponent.create(HeaderComponent.configs.PAGETYPE);
});
</script>
```

## Available Page Configurations

Replace `PAGETYPE` with one of these predefined configurations:

- `home` - For index.html (Tech Tiger BD branding)
- `youtube` - YouTube Premium page (Y logo)
- `netflix` - Netflix page (N logo)
- `chatgpt` - ChatGPT page (C logo)
- `spotify` - Spotify page (S logo)
- `prime` - Prime Video page (P logo)
- `disney` - Disney+ page (D logo)
- `hbo` - HBO page (H logo)
- `crunchyroll` - Crunchyroll page (C logo)
- `surfshark` - Surfshark page (S logo)
- `telegram` - Telegram Premium page (T logo)
- `gemini` - Gemini page (G logo)
- `freefire` - Free Fire page (F logo)
- `pay` - Payment page (S logo)
- `delivery` - Delivery page (S logo)

## Custom Configuration

You can also create custom configurations:

```html
<script>
document.addEventListener('DOMContentLoaded', function() {
  HeaderComponent.create({
    brandName: 'Custom Brand BD',
    logoText: 'X',
    basePath: '/'
  });
});
</script>
```

## Example Implementation

Here's a complete example for a product page:

```html
<!doctype html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>Your Page Title</title>
  
  <!-- Header -->
  <link rel="stylesheet" href="../components/header/header-component.css">
  <script defer src="../components/header/header-component.js"></script>
  <!-- Your other styles and scripts -->
</head>
<body>
  <!-- Header will be injected by HeaderComponent -->
  
  <main>
    <!-- Your page content -->
  </main>
  
  <script>
  document.addEventListener('DOMContentLoaded', function() {
    HeaderComponent.create(HeaderComponent.configs.netflix);
  });
  </script>
</body>
</html>
```

## CSS Variables

The header component uses these CSS variables (ensure they're defined in your page):

```css
:root {
  --card: #ffffff;
  --border: #e6eaf3;
  --text: #0f172a;
  --muted: #64748b;
  --accent: #7c5cff;
  --card-2: #f3f7fb;
}
```

## Migration Steps for Existing Pages

1. Add the CSS and JS includes to the `<head>`
2. Remove the existing `<header class="topbar">` HTML
3. Remove any duplicate `.topbar`, `.brand`, `.brand-logo`, `.primary` CSS rules
4. Add the initialization script with the appropriate config
5. Test the page to ensure the header appears correctly

## Benefits

- **Consistency**: All headers look and behave the same
- **Maintainability**: Update header in one place, affects all pages
- **Performance**: Cached CSS and JS files
- **Responsive**: Built-in mobile-friendly design
- **Accessibility**: Proper semantic HTML structure