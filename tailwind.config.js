module.exports = {
  prefix: 'twcss-',
  content: [
    './layout/*.liquid',
    './templates/*.liquid',
    './templates/customers/*.liquid',
    './sections/*.liquid',
    './snippets/*.liquid',
    './assets/*.js',
  ],
  theme: {
    screens: {
      sm: '320px',
      md: '750px',
      lg: '990px',
      xlg: '1440px',
      x2lg: '1920px',
      pageMaxWidth: '1440px',
    },
    extend: {
      fontFamily: {
        heading: 'var(--font-heading-family)',
        ednimpkish: ['EDNimpkish', 'sans-serif'],
      },
      colors: {
        tapiz: {
          100: "#e3d3d4",
          200: "#c8a7a9",
          300: "#ac7b7f",
          400: "#914f54",
          500: "#752329",
          600: "#5e1c21",
          700: "#461519",
          800: "#2f0e10",
          900: "#170708"
        },
        peach: {
          100: "#fdefed",
          200: "#fcdfdb",
          300: "#faceca",
          400: "#f9beb8",
          500: "#f7aea6",
          600: "#c68b85",
          700: "#946864",
          800: "#634642",
          900: "#312321"
        },
      },
      transitionDuration: {
        800: "800ms",
      },
      transitionTimingFunction: {
        "in-expo": "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
        expo: "cubic-bezier(.55,.085,0,.99)",
      },
    },
  },
  plugins: [],
};
