interface MetaConfig {
  title: string;
  description?: string;
  image?: string;
  url?: string;
}

export const updateMetaTags = ({ title, description, image, url }: MetaConfig) => {
  // 기본 title 업데이트
  document.title = title;

  // Open Graph 메타 태그 업데이트
  updateMetaTag("property", "og:title", title);
  updateMetaTag("property", "og:description", description || title);
  updateMetaTag("property", "og:image", image || "");
  updateMetaTag("property", "og:url", url || window.location.href);

  // Twitter Card 메타 태그 업데이트
  updateMetaTag("name", "twitter:title", title);
  updateMetaTag("name", "twitter:description", description || title);
  updateMetaTag("name", "twitter:image", image || "");

  // 일반 메타 태그 업데이트
  updateMetaTag("name", "description", description || title);
};

const updateMetaTag = (attribute: string, value: string, content: string) => {
  let meta = document.querySelector(`meta[${attribute}="${value}"]`) as HTMLMetaElement;

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, value);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
};
