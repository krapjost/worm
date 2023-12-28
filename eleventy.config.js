const pluginWebc = require("@11ty/eleventy-plugin-webc");
const markdownIt = require("markdown-it");
const markdownItFootnote = require("markdown-it-footnote");
const markdownItAttrs = require("markdown-it-attrs");
const postcss = require("postcss");
const atImport = require("postcss-import");

const markdownItOptions = {
  html: true,
  linkify: true,
};

const md = markdownIt(markdownItOptions)
  .use(markdownItFootnote)
  .use(markdownItAttrs)
  .use(addMediawikiLinks);

function extractBlockquote(content) {
  const rendered = md.render(content);
  const matches = rendered.match(/<blockquote>(.*?)<\/blockquote>/s);
  if (matches && matches[1]) {
    return matches[1].trim(); // Return the inner content of the blockquote
  }

  return ""; // Return an empty string if no blockquote is found
}

const wikilinkRegExp = /\[\[\s?([^\[\]\|\n\r]+)(\|[^\[\]\|\n\r]+)?\s?\]\]/g;

function extractOutboundLinks(content) {
  const matches = content.match(wikilinkRegExp) || [];
  return matches.map(link => (
    link.slice(2, -2).split("|")[0].trim()
  ));
}

function addMediawikiLinks(md) {
  md.linkify.add("[[", {
    validate: /^\s?([^\[\]\|\n\r]+)(\|[^\[\]\|\n\r]+)?\s?\]\]/,
    normalize: match => {
      const parts = match.raw.slice(2, -2).split("|");
      parts[0] = parts[0].replace(/.(md|markdown)\s?$/i, "").trim();
      match.text = (parts[1] || parts[0]).trim();
      match.url = `/books/${parts[0].trim()}/`;
    },
  });
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(pluginWebc, {
    components: "src/_includes/components/*.webc",
  });
  eleventyConfig.addFilter("markdownify", string => md.render(string));
  eleventyConfig.addFilter("extractBlockquote", extractBlockquote);
  eleventyConfig.addFilter("truncateWords", function(text, wordCount) {
    if (!text) return "";
    const words = text.split(" ");
    return words.slice(0, wordCount).join(" ") + (words.length > wordCount ? "..." : "");
  });
  eleventyConfig.addTemplateFormats("css");
  eleventyConfig.addExtension("css", {
    outputFileExtension: "css",
    compile: async function(inputContent) {
      const result = await postcss([atImport]).process(inputContent);

      return async () => result.css;
    },
  });

  eleventyConfig.setLibrary("md", md);
  eleventyConfig.setUseGitIgnore(false);

  eleventyConfig.addPassthroughCopy({ assets: "assets" });
  eleventyConfig.addCollection("books", function(collection) {
    const books = collection.getFilteredByGlob(["src/books/**/*.md"]);
    return books;
  });

  return {
    dir: {
      input: "src",
    },
    passthroughFileCopy: true,
  };
};
