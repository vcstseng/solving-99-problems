import { HtmlBasePlugin } from "@11ty/eleventy";
import { syncL2 } from "./scripts/sync-l2.mjs";
import fs from "node:fs";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addFilter("take", (items, count) => items.slice(0, count));
  eleventyConfig.addPassthroughCopy({ "public/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/styles": "styles" });
  // Research material is published only through explicitly authored pages.
  eleventyConfig.ignores.add("src/content/**");
  eleventyConfig.addWatchTarget("./src/content/l2/");
  // Optional local authoring source; portable builds use the repository copies.
  const localSource = process.env.L2_SOURCE_DIR || (fs.existsSync("l2-source.local") ? fs.readFileSync("l2-source.local", "utf8").trim() : "");
  if (localSource) {
    eleventyConfig.addWatchTarget(localSource);
    eleventyConfig.on("eleventy.before", () => syncL2(localSource));
  }

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
