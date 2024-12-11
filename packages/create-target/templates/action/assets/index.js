class Action {
  /**
   * `extensionName: "com.bacon.2095.action"`
   * @param {*} arguments: {completionFunction: () => unknown; extensionName: string; }
   */
  run({ extensionName, completionFunction }) {
    // Here, you can run code that modifies the document and/or prepares
    // things to pass to your action's native code.

    // We will not modify anything, but will pass the body's background
    // style to the native code.
    completionFunction({
      currentBackgroundColor: document.body.style.backgroundColor,
    });
  }

  finalize(props) {
    var newBackgroundColor = props.newBackgroundColor;
    if (newBackgroundColor) {
      // We'll set document.body.style.background, to override any
      // existing background.
      document.body.style.background = newBackgroundColor;
    } else {
      // If nothing's been returned to us, we'll set the background to
      // blue.
      document.body.style.background = "blue";
    }
  }
}

// Must use window to ensure it's hoisted.
window.ExtensionPreprocessingJS = new Action();
