class Action {
  /**
   * `extensionName: "com.bacon.2095.axun"`
   * @param {*} arguments: {completionFunction: () => unknown; extensionName: string; }
   */
  run({ extensionName, completionFunction }) {
    // Here, you can run code that modifies the document and/or prepares
    // things to pass to your action's native code.

    // We will not modify anything, but will pass the body's background
    // style to the native code.
    completionFunction({
      /* */
    });
  }

  finalize() {
    // debugger;
    try {
      // This method is run after the native code completes.

      const usesNextJs = usesNext();

      const name =
        getGenerator() ||
        (usesExpo() ? "Expo" : usesNextJs ? "Next.js" : "Unknown");

      alert(`Uses: ${name}`);
    } catch (error) {
      console.error(error);
      alert(error);
    }
  }
}

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
    typeof Expo !== "undefined" ||
    !!document.querySelector("#expo-generated-fonts") ||
    typeof $$require_external !== "undefined" ||
    typeof __BUNDLE_START_TIME__ !== "undefined"
  );
}

// Must use var to ensure it's hoisted.
window.ExtensionPreprocessingJS = new Action();
