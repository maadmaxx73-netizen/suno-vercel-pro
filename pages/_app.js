import React from 'react';

// This custom App component initializes pages. You can add global CSS
// imports here. For example, import a Tailwind CSS file or any global styles.
export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
