const fs = require("fs");
const path = require("path");
const glob = require("glob"); // Ensure you've installed glob: npm install glob

const wikilinkRegExp = /\[\[\s?([^\[\]\|\n\r]+)(\|[^\[\]\|\n\r]+)?\s?\]\]/g;

function extractLinks(content) {
  return (content.match(wikilinkRegExp) || []).map(link => (
    link.slice(2, -2).split("|")[0].trim()
  ));
}

function processMarkdownFiles() {
  const markdownFiles = glob.sync("src/books/**/*.md"); // Adjust to your Markdown files path
  const allLinks = {};

  // Extract outbound links
  markdownFiles.forEach(file => {
    const content = fs.readFileSync(file, "utf-8");
    const slug = path.basename(file, path.extname(file));
    allLinks[slug] = {
      outboundLinks: extractLinks(content),
      backlinks: [], // Initialize backlinks array
    };
  });

  // Compute backlinks
  Object.keys(allLinks).forEach(slug => {
    Object.keys(allLinks).forEach(otherSlug => {
      if (slug !== otherSlug && allLinks[otherSlug].outboundLinks.includes(slug)) {
        allLinks[slug].backlinks.push(otherSlug);
      }
    });
  });

  // Write the data to a JSON file
  fs.writeFileSync("src/_data/linksData.json", JSON.stringify(allLinks, null, 2));
  fs.writeFileSync("assets/linksData.json", JSON.stringify(allLinks, null, 2));
}

processMarkdownFiles();
