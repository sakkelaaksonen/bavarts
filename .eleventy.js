export default function(eleventyConfig) {
  // Copy CSS and JS output to site
  eleventyConfig.addPassthroughCopy("_site/css");
  eleventyConfig.addPassthroughCopy("_site/js");
  
  // Copy assets folder (images, fonts, etc.)
  eleventyConfig.addPassthroughCopy("src/assets");
  
  // Watch source files
  eleventyConfig.addWatchTarget("./src/css/");
  eleventyConfig.addWatchTarget("./src/js/");
  eleventyConfig.addWatchTarget("./src/assets/");
  
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    }
  };
} 