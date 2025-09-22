# Quantity Component System

## Overview
This component system provides a reusable quantity selector that can be used across all product pages with consistent functionality and styling.

## Files Created
- `components/quantity.html` - HTML structure
- `components/quantity.css` - Styling (includes theme support)
- `components/quantity.js` - JavaScript functionality  
- `components/loader.js` - Component loading system

## Usage

### 1. Include Required Files
Add these to your product page `<head>`:

```html
<link rel="stylesheet" href="../assets/products.css?v=1.0">
<script defer src="../components/loader.js?v=1.0"></script>
<script defer src="../components/quantity.js?v=1.0"></script>
```

### 2. Add Component Placeholder
Replace the quantity HTML with:

```html
<!-- Quantity Component -->
<div data-component="quantity" data-theme="[product-name]"></div>
```

### 3. Required Elements on Page
Make sure your page has these elements for the component to work:

```html
<div id="pUnit">৳50</div>          <!-- Unit price display -->
<div id="pTotal">৳50</div>         <!-- Total price display -->
```

### 4. Plan Buttons
Plan buttons should have these attributes:

```html
<button class="chip chip--plan" data-id="plan1" data-price="50" data-mode="manual">
  Plan Name <small class="price">৳50</small>
</button>
```

## Features
- ✅ Automatic price calculation
- ✅ Plan selection integration
- ✅ Theme support (youtube, spotify, netflix, etc.)
- ✅ Keyboard navigation (arrow keys, +/-)
- ✅ Accessibility (ARIA labels)
- ✅ Input validation (1-99 range)
- ✅ Button state management (disabled at limits)
- ✅ Debug logging for troubleshooting

## Themes Supported
- youtube (red theme)
- spotify (green theme) 
- netflix (red theme)
- Can be extended for other products

## Implementation Status
✅ Netflix - Updated to use component system
✅ Spotify - Updated to use component system  
✅ YouTube - Updated to use component system

Still need to update:
- Crunchyroll
- ChatGPT
- Disney Plus
- Prime Video
- Surfshark
- Telegram Premium

## Benefits
1. **No Code Duplication** - Single source of truth for quantity logic
2. **Consistent UX** - All pages behave identically
3. **Easy Maintenance** - Update once, applies everywhere
4. **Theme Support** - Automatic styling based on product
5. **Better Debugging** - Centralized logging and error handling