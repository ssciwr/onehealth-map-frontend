// uiThemeConstants.ts
// Design system constants for One Health Platform

// Color palette based on One Health logo
export const COLORS = {
    primary: {
        main: '#0052CC',      // One Health Blue
        light: '#DEEBFF',
        dark: '#0747A6',
        contrast: '#FFFFFF'
    },
    secondary: {
        main: '#C41E3A',      // One Health Red/Pink
        light: '#FFEBE6',
        dark: '#BF2600',
        contrast: '#FFFFFF'
    },
    neutral: {
        white: '#FFFFFF',
        gray50: '#F4F5F7',
        gray100: '#EBECF0',
        gray200: '#DFE1E6',
        gray300: '#C1C7D0',
        gray400: '#8993A4',
        gray500: '#6B778C',
        gray600: '#42526E',
        gray700: '#172B4D',
        gray800: '#091E42',
        black: '#000000'
    },
    status: {
        success: '#00875A',
        successLight: '#E3FCEF',
        warning: '#FF991F',
        warningLight: '#FFF0B3',
        error: '#DE350B',
        errorLight: '#FFEBE6',
        info: '#0065FF',
        infoLight: '#DEEBFF'
    }
};

// Typography
export const TYPOGRAPHY = {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    fontSize: {
        xs: '0.75rem',     // 12px
        sm: '0.813rem',    // 13px
        base: '0.875rem',  // 14px
        md: '1rem',        // 16px
        lg: '1.125rem',    // 18px
        xl: '1.25rem',     // 20px
        '2xl': '1.5rem',   // 24px
        '3xl': '1.75rem',  // 28px
        '4xl': '2rem'      // 32px
    },
    fontWeight: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
    },
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75
    }
};

// Spacing
export const SPACING = {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    base: '1rem',     // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem'     // 64px
};

// Border radius
export const RADIUS = {
    sm: '0.25rem',    // 4px
    base: '0.375rem', // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    full: '9999px'
};

// Shadows
export const SHADOWS = {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    base: '0 2px 8px rgba(0, 0, 0, 0.1)',
    md: '0 4px 12px rgba(0, 0, 0, 0.15)',
    lg: '0 10px 25px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 40px rgba(0, 0, 0, 0.15)',
    primary: '0 4px 12px rgba(0, 82, 204, 0.3)',
    error: '0 4px 12px rgba(222, 53, 11, 0.3)'
};

// Transitions
export const TRANSITIONS = {
    fast: '150ms ease',
    base: '200ms ease',
    slow: '300ms ease',
    verySlow: '500ms ease'
};

// Z-index layers
export const Z_INDEX = {
    base: 0,
    dropdown: 100,
    sticky: 200,
    modal: 1000,
    popover: 1100,
    tooltip: 1200,
    toast: 1300
};

// Breakpoints
export const BREAKPOINTS = {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
};

// Map specific constants
export const MAP_CONSTANTS = {
    defaultCenter: [42, 12] as [number, number], // Italy
    defaultZoom: 5,
    tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

// Animation keyframes
export const ANIMATIONS = {
    fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
    slideUp: `
    @keyframes slideUp {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
    slideDown: `
    @keyframes slideDown {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
    scaleIn: `
    @keyframes scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `,
    pulse: `
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `
};