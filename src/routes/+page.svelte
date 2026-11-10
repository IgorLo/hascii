<script lang="ts">
  import { Playground } from '@/pages/playground';

  const title = 'HASCII';
  const description = 'Генератор пиксель арта';
  const site = 'https://hascii.vercel.app/';
  const image = new URL('hascii-mark.png', site).href;
  const imageAlt = 'Пиксельная хаски HASCII';
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={site} />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="ru_RU" />
  <meta property="og:url" content={site} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={image} />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="900" />
  <meta property="og:image:height" content="656" />
  <meta property="og:image:alt" content={imageAlt} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={image} />
  <meta name="twitter:image:alt" content={imageAlt} />
</svelte:head>

<Playground />
