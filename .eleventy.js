export default function(eleventyConfig) {
  // Copy assets folder (images, fonts, etc.)
  eleventyConfig.addPassthroughCopy("src/assets");
  
  // Copy CNAME file for GitHub Pages custom domain
  eleventyConfig.addPassthroughCopy("src/CNAME");
     
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