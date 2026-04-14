export const colors = {
  background: '#f3f6fb',
  surface: '#ffffff',
  surfaceMuted: '#eef3f9',
  surfaceStrong: '#e3ebf5',
  text: '#132033',
  textMuted: '#5f6f86',
  textSoft: '#8190a5',
  border: '#d9e2ee',
  borderStrong: '#c7d4e5',
  primary: '#1f5eff',
  primaryDark: '#163ea8',
  primarySoft: '#e8efff',
  success: '#0f9f6e',
  successSoft: '#dcf7eb',
  warning: '#d98a1a',
  warningSoft: '#fff2db',
  danger: '#d24747',
  dangerSoft: '#fee9e7',
  shadow: '#0f172a',
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
};

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
};
