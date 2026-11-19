const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// assets/pdfjs: pdf.js ships inside the app as text and is inlined into the page that renders PDFs.
config.resolver.assetExts.push("txt");

module.exports = config;
