const path = require("path");
const webpack = require("webpack");
const dotenv = require("dotenv");
dotenv.config();
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const brandPath = `src/brands/${process.env.REACT_APP_BRAND}`;
module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "public"),
    filename: "bundle.js",
    publicPath: "/",
  },
  target: "web",
  resolve: {
    modules: [brandPath, "src/brands/default", "node_modules"],
    extensions: [".js", ".jsx", ".json"],
  },
  ignoreWarnings: [
    (warning) => {
      return true;
      // // Ignoring Bootstrap SCSS deprecation warning for percentage units in abs() function
      // const msg = warning.message;
      // return (
      //   msg.includes("Deprecation Warning") &&
      //   msg.includes("_rfs.scss") &&
      //   msg.includes("$dividend: abs($dividend)")
      // );
    },
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
      {
        test: /\.(css|scss)$/,
        use: ["style-loader", "css-loader", "postcss-loader", "sass-loader"],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        use: ["url-loader"],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": JSON.stringify(process.env),
    }),
  ],
};
