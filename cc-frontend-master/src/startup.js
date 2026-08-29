export function startup() {
  var prodConsole = (function (oldCons) {
    return {
      log: function (text) {},
      info: function (text) {},
      warn: function (text) {},
      error: function (text) {},
    };
  })(window.console);
  if (process.env.NODE_ENV === "production") window.console = prodConsole;
}
