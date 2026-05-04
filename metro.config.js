const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Server-side code (Firebase Cloud Functions) lives in these folders and
// imports Node-only modules like `fs`. Block Metro from trying to bundle
// them into the React Native app.
//
// IMPORTANT: anchor to the project root so we don't accidentally match
// node_modules/firebase/functions or any other sub-path containing the
// word "functions".
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const root = escape(__dirname);
const sep = '[\\\\/]';

config.resolver.blockList = [
  new RegExp(`^${root}${sep}functions${sep}.*`),
  new RegExp(`^${root}${sep}functions-chatbot${sep}.*`),
];

module.exports = config;
