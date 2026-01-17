import { IdAttributePlugin, InputPathToUrlTransformPlugin, HtmlBasePlugin } from "@11ty/eleventy";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import pluginSyntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import pluginNavigation from "@11ty/eleventy-navigation";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

import pluginFilters from "./_config/filters.js";

import iconsPlugin from "eleventy-plugin-icons";

import Fetch from "@11ty/eleventy-fetch";

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function(eleventyConfig) {
	// Drafts, see also _data/eleventyDataSchema.js
	eleventyConfig.addPreprocessor("drafts", "*", (data, content) => {
		if(data.draft && process.env.ELEVENTY_RUN_MODE === "build") {
			return false;
		}
	});

	// Copy the contents of the `public` folder to the output folder
	// For example, `./public/css/` ends up in `_site/css/`
	eleventyConfig
		.addPassthroughCopy({
			"./public/": "/"
		})
		.addPassthroughCopy("./content/feed/pretty-atom-feed.xsl");

	// Run Eleventy when these files change:
	// https://www.11ty.dev/docs/watch-serve/#add-your-own-watch-targets

	// Watch images for the image pipeline.
	eleventyConfig.addWatchTarget("content/**/*.{svg,webp,png,jpg,jpeg,gif}");

	// Per-page bundles, see https://github.com/11ty/eleventy-plugin-bundle
	// Adds the {% css %} paired shortcode
	eleventyConfig.addBundle("css", {
		toFileDirectory: "dist",
	});
	// Adds the {% js %} paired shortcode
	eleventyConfig.addBundle("js", {
		toFileDirectory: "dist",
	});

	// Official plugins
	eleventyConfig.addPlugin(pluginSyntaxHighlight, {
		preAttributes: { tabindex: 0 }
	});
	eleventyConfig.addPlugin(pluginNavigation);
	eleventyConfig.addPlugin(HtmlBasePlugin);
	eleventyConfig.addPlugin(InputPathToUrlTransformPlugin);

	eleventyConfig.addPlugin(feedPlugin, {
		type: "atom", // or "rss", "json"
		outputPath: "/feed/feed.xml",
		stylesheet: "pretty-atom-feed.xsl",
		templateData: {
		//	eleventyNavigation: {
		//		key: "Feed",
		//		order: 4
		//	}
		},
		collection: {
			name: "posts",
			limit: 100,
		},
		metadata: {
			language: "en",
			title: "Canberra's Best Book Club",
			subtitle: "The best book club in Canberra",
			base: "https://canberrabookclub.au/",
			author: {
				name: "CBBC	"
			}
		}
	});

	// Image optimization: https://www.11ty.dev/docs/plugins/image/#eleventy-transform
	eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
		// Output formats for each image.
		formats: ["avif", "webp", "auto"],

		// widths: ["auto"],

		failOnError: true,
		htmlOptions: {
			imgAttributes: {
				// e.g. <img loading decoding> assigned on the HTML tag will override these values.
				loading: "lazy",
				decoding: "async",
			}
		},

		sharpOptions: {
			animated: true,
			withoutEnlargement: false,
		},
	});

	// Filters

	eleventyConfig.addFilter("futureDate", function(events) {
		return events.filter(event => new Date(event.data.start) >= new Date());
	  });

	eleventyConfig.addPlugin(pluginFilters);

	eleventyConfig.addPlugin(IdAttributePlugin, {
		// by default we use Eleventy’s built-in `slugify` filter:
		// slugify: eleventyConfig.getFilter("slugify"),
		// selector: "h1,h2,h3,h4,h5,h6", // default
	});

	eleventyConfig.addShortcode("currentBuildDate", () => {
		return (new Date()).toISOString();
	});

	// Features to make your build faster (when you need them)

	// If your passthrough copy gets heavy and cumbersome, add this line
	// to emulate the file copy on the dev server. Learn more:
	// https://www.11ty.dev/docs/copy/#emulate-passthrough-copy-during-serve

	// eleventyConfig.setServerPassthroughCopyBehavior("passthrough");
	//
	eleventyConfig.addPlugin(iconsPlugin, {
		sources: [{ name: 'lucide', path: 'node_modules/simple-icons/icons', default: true }],
	});

	eleventyConfig.addCollection("eventsdatesort", function (collectionsApi) {
		return collectionsApi.getFilteredByTag("events").filter(event => new Date(event.data.start) >= new Date()).sort(function (a, b) {
			return a.data.start - b.data.start; // sort by date - descending
		});
	});

	eleventyConfig.addAsyncShortcode("getBook", async function (title = "", author = "") {
		const res = await getBook(title, author);
		return `
		<div style="text-align: center; justify-self: center; height: auto; min-height:400px">
			<a href="https://hardcover.app/books/${res.slug}">
			<div style="height: auto; min-height: 50px;"><b>${res.title}</b></div>
			<div>
				<i>by ${res.author}</i>
			</div>
			<p>${res.rating} from ${res.ratings_count} ratings</p>
			<img eleventy:widths="200" eleventy:optional="placeholder"  src="${res.image}", alt="${res.title} cover">
		</a>
		</div>
		`;
	  });

	  eleventyConfig.addAsyncShortcode("getBookSlug", async function (slug = "") {
		const res = await getBookSlug(slug);
		return `
		<div style="position: relative; text-align: center; justify-self: center; width: 100%; ">
			<a href="https://hardcover.app/books/${res.slug}">
				<div style="position: absolute; z-index:100; height: auto; max-height: 100%;  background: rgba(47, 79, 79, 0.7	);  color: white;  width: 100%; left: 0%; bottom: 0%;">
					<p style=" filter: contrast(9) drop-shadow(.05em .05em black); "><b>${res.title}</b></p>
					<p style="filter: contrast(1) drop-shadow(.05em .05em  black);"><i>by ${res.author}</i></p>
					<p style="filter: contrast(1) drop-shadow(.05em .05em black);">${res.rating} from ${res.ratings_count} ratings</p>
				</div>
				<img eleventy:heights="200px" eleventy:optional="placeholder" style="display: block; height: auto; width: 100%;" src="${res.image}", alt="Book Cover">
			</a>
		</div>
		`;
	  });

	  eleventyConfig.addAsyncShortcode("getBookList", async function (slug) {
	
		const res = await getBookList(slug);
		let html = `<p><b>Our little book club has discussed over ${res.length} books and counting!</b></p>
		<div style="width:100%; display: grid; grid-template-columns: 30% 30% 30%; row-gap: 5px; column-gap: 5px;">`;
		for (let i in res){
		const book = res[i].book;
		html +=	`

		<div style="position: relative; text-align: center; justify-self: center; width: 100%; ">
			<a href="https://hardcover.app/books/${book.slug}">
				<div style="position: absolute; z-index:100; height: auto; max-height: 100%;  background: rgba(47, 79, 79, 0.7	);  color: white;  width: 100%; left: 0%; bottom: 0%;">
					<p style=" filter: contrast(9) drop-shadow(.05em .05em black); margin-bottom: 5px;"><b>${book.title.split(":")[0]}</b></p>
					<p style="filter: contrast(1) drop-shadow(.05em .05em  black); margin-top: 5px; margin-bottom: 5px;"><i>by ${book.contributions[0]?.author.name}</i></p>
					<p style="filter: contrast(1) drop-shadow(.05em .05em black); margin-top: 5px;">${(book.rating || 0).toFixed(2)} from ${book.ratings_count} ratings</p>
				</div>
				<img eleventy:heights="200px" eleventy:optional="placeholder" style="display: block; height: auto; width: 100%;" src="${book.image.url}", alt="Book Cover">
			</a>
		</div>

		`
		}
		html += "</div>";
		return html;
	  });
};

export const config = {
	// Control which files Eleventy will process
	// e.g.: *.md, *.njk, *.html, *.liquid
	templateFormats: [
		"md",
		"njk",
		"html",
		"liquid",
		"11ty.js",
	],

	// Pre-process *.md files with: (default: `liquid`)
	markdownTemplateEngine: "njk",

	// Pre-process *.html files with: (default: `liquid`)
	htmlTemplateEngine: "njk",

	// These are all optional:
	dir: {
		input: "content",          // default: "."
		includes: "../_includes",  // default: "_includes" (`input` relative)
		data: "../_data",          // default: "_data" (`input` relative)
		output: "_site"
	},

	// -----------------------------------------------------------------
	// Optional items:
	// -----------------------------------------------------------------

	// If your site deploys to a subdirectory, change `pathPrefix`.
	// Read more: https://www.11ty.dev/docs/config/#deploy-to-a-subdirectory-with-a-path-prefix

	// When paired with the HTML <base> plugin https://www.11ty.dev/docs/plugins/html-base/
	// it will transform any absolute URLs in your HTML to include this
	// folder name and does **not** affect where things go in the output folder.

	// pathPrefix: "/",
};


import 'dotenv/config';


//const url = "https://hardcover-hasura-production-1136269bb9de.herokuapp.com/v1/graphql";
const url = "https://api.hardcover.app/v1/graphql";
const key = process.env.HARDCOVER_API_KEY;
console.log("INFO", "API KEY", key)
console.log("INFO", "URL", url);


async function getBookList(slug="canberras-best-book-club-previously-read") {
	try {
	console.log(`Fetching hardcover list ${slug}`);
	let  data  = await Fetch(url, {
	  duration: '15m',
	  type: 'json',
	  fetchOptions: {
		headers: {
		  'content-type': 'application/json',
		  'authorization': key,
		},
		method: 'POST',
		body: JSON.stringify({
		  query: `
		  query getList {
			lists(where: {slug: {_eq: "${slug}"}}) {
				list_books(order_by: {book: {rating: desc_nulls_last}}) {
				book {
				title
				image {
				  url
				}
				rating
				ratings_count
				description
				contributions {
				  author {
					name
				  }
				}
				slug
			  }
			  }
		  
			}
		  }
		  `,
		}),
	  },
	});
	return data?.data?.lists[0]?.list_books;
} catch (e){
	console.log("Error", e.stack);
	console.log("Error", e.name);
	console.log("Error", e.message);
	return {
		title: slug,
		description: e.message
	};
}
}

async function getBook(title="", author="") {
	try {
	let  data  = await Fetch(url, {
	  duration: '1d',
	  type: 'json',
	  fetchOptions: {
		headers: {
		  'content-type': 'application/json',
		  'authorization': key,
		},
		method: 'POST',
		body: JSON.stringify({
		  query: `
				query getBook {
					books(
					where: {title: {_ilike: "${title}"}, contributions: {author: {name: {_ilike: "${author}"}, }}}
					order_by: {ratings_count: desc}
					) {
					id
					title
					image {
						url
					}
					rating
					ratings_count
					description
					contributions {
						author {
						name
						}
					}
					slug
					}
				}`,
		}),
	  },
	});
  
	return {
			title: data?.data?.books[0]?.title,
			rating: (data?.data?.books[0]?.rating || 0).toFixed(2),
			ratings_count: data?.data?.books[0]?.ratings_count,
			//description: data?.data.books[0]?.description || "No Description",
			author: data?.data?.books[0]?.contributions[0]?.author?.name,
			image: data?.data?.books[0]?.image?.url,
			slug: data?.data?.books[0]?.slug,
		};
	} catch (e){
		console.log("Error", e.stack);
    console.log("Error", e.name);
    console.log("Error", e.message);
		return {
			title: "Not found",
		};
	}
  }

  async function getBookSlug(slug="") {
	try {
	console.log("FETCHING", slug);
	let  data  = await Fetch(url, {
	  duration: '1d',
	  type: 'json',
	  fetchOptions: {
		headers: {
		  'content-type': 'application/json',
		  'authorization': key,
		},
		method: 'POST',
		body: JSON.stringify({
		  query: `query getBook {
					books(
					where: {slug: {_eq: "${slug}"}}
					order_by: {ratings_count: desc}
					) {
					id
					title
					image {
						url
					}
					rating
					ratings_count
					description
					contributions {
						author {
						name
						}
					}
					slug
					}
				}`,
		}),
	  },
	});
	//data = JSON.parse(data);
	return {
			title: data?.data?.books[0]?.title,
			rating: (data?.data?.books[0]?.rating || 0).toFixed(2),
			ratings_count: data?.data?.books[0]?.ratings_count,
			description: data?.data.books[0]?.description || "No Description",
			author: data?.data?.books[0]?.contributions[0]?.author?.name,
			image: data?.data?.books[0]?.image?.url,
			slug: data?.data?.books[0]?.slug,
		};
	} catch (e){
		console.log("Error", e.stack);
    	console.log("Error", e.name);
    	console.log("Error", e.message);
		return {
			title: slug,
			description: e.message
		};
	}
  }


