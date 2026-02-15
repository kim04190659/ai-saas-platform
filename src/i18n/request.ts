import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  // locale が undefined の場合に備えてデフォルト値（例: 'ja'）を設定
  // これにより型が string | undefined ではなく string に確定します
  const activeLocale = locale || 'ja'; 

  return {
    locale: activeLocale,
    messages: (await import(`../messages/${activeLocale}.json`)).default
  };
});
