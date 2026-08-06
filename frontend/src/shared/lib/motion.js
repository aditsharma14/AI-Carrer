// Shared Framer Motion variants so every landing-page section animates the
// same way instead of each component inventing its own timing/easing.

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

// Standard props for "animate once as it scrolls into view" sections.
export const viewportFadeUp = {
  variants: fadeUp,
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, amount: 0.3 },
};
