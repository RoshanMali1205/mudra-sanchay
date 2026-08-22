"use strict";

const bundled = require("./api-bundle.cjs");

exports.handler = function handler(event, context) {
  const run = bundled.handler || bundled.default;
  if (typeof run !== "function") {
    throw new Error("Bundled API handler is missing.");
  }
  return run(event, context);
};
