/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-mcp',
  ],
  framework: '@storybook/react-vite',
  // Strip PWA and Sentry plugins that are incompatible with Storybook's build
  async viteFinal(config) {
    const flatPlugins = (config.plugins || []).flat(Infinity);
    config.plugins = flatPlugins.filter((p) => {
      if (!p || typeof p !== 'object') return true;
      const name = String(p?.name ?? '');
      return (
        !name.toLowerCase().includes('pwa') &&
        !name.toLowerCase().includes('sentry') &&
        name !== 'emit-version-json'
      );
    });
    return config;
  },
};
export default config;
