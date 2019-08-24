const path = require("path");
const nodeExternals = require("webpack-node-externals");

const defaults = {
  mode: "production",
  entry: {
    sqleet: "./src/index.ts"
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  output: {
    path: path.resolve(__dirname, "..", "..", "dist")
  }
};

module.exports = [
  {
    ...defaults,
    target: "web",
    output: {
      ...defaults.output,
      filename: "[name].js",
      libraryTarget: "var",
      library: "[name]"
    },
    node: {
      worker_threads: "empty"
    }
  },
  {
    ...defaults,
    target: "node",
    output: {
      ...defaults.output,
      filename: "[name].node.js",
      library: "sqleet",
      libraryTarget: "umd"
    },
    externals: [nodeExternals()]
  }
];
