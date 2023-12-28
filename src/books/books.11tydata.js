const { titleCase } = require("title-case");

const wikilinkRegExp = /\[\[\s?([^\[\]\|\n\r]+)(\|[^\[\]\|\n\r]+)?\s?\]\]/g;

function caselessCompare(a, b) {
  return a.normalize().toLowerCase() === b.normalize().toLowerCase();
}

function extractLinks(noteContent) {
  return (noteContent.match(wikilinkRegExp) || []).map(link => (
    link.slice(2, -2)
      .split("|")[0]
      .replace(/.(md|markdown)\s?$/i, "")
      .trim()
  ));
}
//
// module.exports = {
//   layout: "layouts/book.webc",
//   type: "book",
//   eleventyComputed: {
//     title: data => titleCase(data.title || data.page.fileSlug),
//     links: (data) => {
//       const books = data.collections.books;
//       const currentFileSlug = data.page.filePathStem.replace("/books/", "");
//
//       // console.log(data)
//       // let outboundLinks = extractLinks(data.template.frontMatter.content);
//
//       let backlinks = [];
//       let connections = [];
//
//       for (const otherBook of books) {
//         const noteContent = otherBook.template.frontMatter.content;
//         const otherBookLinks = extractLinks(noteContent);
//
//         if (otherBookLinks.some(link => caselessCompare(link, currentFileSlug))) {
//           let preview = noteContent.slice(0, 240);
//           backlinks.push({
//             url: otherBook.url,
//             title: otherBook.data.title,
//             preview,
//           });
//         }
//
//         // Check if current book links to otherBook
//         // if (outboundLinks.some(link => caselessCompare(link, otherBook.fileSlug))) {
//         //   connections.push({
//         //     url: otherBook.url,
//         //     title: otherBook.data.title
//         //   });
//         // }
//       }
//
//       return {
//         backlinks,
//         // outboundLinks: connections
//       };
//     },
//   },
// };
//
//
//
// const { titleCase } = require("title-case");
//
// const wikilinkRegExp = /\[\[\s?([^\[\]\|\n\r]+)(\|[^\[\]\|\n\r]+)?\s?\]\]/g;
//
// function caselessCompare(a, b) {
//   return a.normalize().toLowerCase() === b.normalize().toLowerCase();
// }
//
// function extractLinks(noteContent) {
//   return (noteContent.match(wikilinkRegExp) || []).map(link => (
//     link.slice(2, -2)
//       .split("|")[0]
//       .replace(/.(md|markdown)\s?$/i, "")
//       .trim()
//   ));
// }

module.exports = {
  layout: "layouts/book.webc",
  type: "book",
  eleventyComputed: {
    title: data => titleCase(data.title || data.page.fileSlug),
    links: (data) => {
      const books = data.collections.books;
      const currentFileSlug = data.page.filePathStem.replace("/books/", "");

      // Extract outbound links from the current book's content
      // let outboundLinks = extractLinks(data.templateContent);

      let backlinks = [];

      for (const otherBook of books) {
        // Skipping processing for the current book
        if (otherBook.fileSlug === currentFileSlug) continue;
        // console.log("book is\n", data, "\n---------------\n")

        const otherBookContent = otherBook.template.frontMatter.content;
        const otherBookLinks = extractLinks(otherBookContent);

        // Check if other books link to the current book (backlinks)
        if (otherBookLinks.some(link => caselessCompare(link, currentFileSlug))) {
          let preview = otherBookContent.slice(0, 240);
          backlinks.push({
            url: otherBook.url,
            title: otherBook.data.title,
            preview,
          });
        }
      }

      return {
        // outboundLinks,
        backlinks,
      };
    },
  },
};
