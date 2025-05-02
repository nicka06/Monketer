export const DEFAULT_STYLE_BY_TYPE: Record<string, Record<string, any>> = {
  text: {
    fontFamily: 'Arial',
    fontSize: 14,
    color: '#000000',
    padding: '0px',
    textAlign: 'left',
  },
  header: {
    fontFamily: 'Arial Black',
    fontSize: 20,
    color: '#333333',
    padding: '10px 0',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007BFF',
    color: '#ffffff',
    fontSize: 14,
    padding: '12px 24px',
    textAlign: 'center',
    borderRadius: '4px',
  },
  image: {
    width: '100%',
    height: 'auto',
    padding: '0px',
  },
  divider: {
    height: '1px',
    backgroundColor: '#cccccc',
    margin: '16px 0',
  },
};

// Style guide constants for consistent styling
export const STYLE_GUIDE = {
  colors: {
    primary: '#007BFF',
    secondary: '#6C757D',
    success: '#28A745',
    danger: '#DC3545',
    warning: '#FFC107',
    info: '#17A2B8',
    light: '#F8F9FA',
    dark: '#343A40',
  },
  typography: {
    fontSizes: {
      small: 12,
      normal: 14,
      large: 16,
      xlarge: 20,
      xxlarge: 24,
    },
    fontFamilies: {
      default: 'Arial',
      heading: 'Arial Black',
      monospace: 'Courier New',
    },
  },
  spacing: {
    small: '4px',
    medium: '8px',
    large: '16px',
    xlarge: '24px',
  },
  borderRadius: {
    small: '2px',
    medium: '4px',
    large: '8px',
  },
}; 