var Action = function () {};

Action.prototype = {
  /**
   *
   * // extensionName: "com.bacon.2095.axun"
   * @param {*} arguments: {completionFunction: () => unknown; extensionName: string; }
   */
  // run: function (arguments) {
  //   // Here, you can run code that modifies the document and/or prepares
  //   // things to pass to your action's native code.

  //   // We will not modify anything, but will pass the body's background
  //   // style to the native code.

  //   arguments.completionFunction({
  //     currentBackgroundColor: document.body.style.backgroundColor,
  //   });
  // },

  finalize: function (arguments) {
    // This method is run after the native code completes.

    const usesNextJs = usesNext();

    const usesExpoRouter = usesExpo();
    // We'll see if the native code has passed us a new background style,
    // and set it on the body.

    alert(
      "Uses: " +
        (usesNextJs
          ? "Next.js"
          : usesExpoRouter
          ? "Expo"
          : getGenerator() || "Unknown")
    );
  },
};

function getGenerator() {
  let generatorTag = document.querySelector('meta[name="generator"]');
  if (generatorTag) return generatorTag.getAttribute("content");

  return null;
}

function usesNext() {
  return (
    typeof next !== "undefined" ||
    typeof __NEXT_DATA__ !== "undefined" ||
    typeof __next_f !== "undefined" ||
    typeof __next_require__ !== "undefined"
  );
}

function usesExpo() {
  return (
    !!document.querySelector("#expo-generated-fonts") ||
    typeof $$require_external !== "undefined" ||
    typeof Expo !== "undefined" ||
    typeof __BUNDLE_START_TIME__ !== "undefined"
  );
}

var ExtensionPreprocessingJS = new Action();
