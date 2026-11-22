import { HtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addFilter("take", (items, count) => items.slice(0, count));
  eleventyConfig.addPassthroughCopy({ "public/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/styles": "styles" });
  // Research material is published only through explicitly authored pages.
  eleventyConfig.ignores.add("src/content/**");

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["md", "njk"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    pathPrefix: "/"
  };
}
