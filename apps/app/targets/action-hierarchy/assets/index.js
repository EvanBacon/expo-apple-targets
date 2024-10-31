class Action {
  finalize() {
    try {
      // https://gist.github.com/OrionReed/4c3778ebc2b5026d2354359ca49077ca
      // 3D Dom viewer, copy-paste this into your console to visualise the DOM as a stack of solid blocks.
      // You can also minify and save it as a bookmarklet (https://www.freecodecamp.org/news/what-are-bookmarklets/)
      (() => {
        const SHOW_SIDES = false; // color sides of DOM nodes?
        const COLOR_SURFACE = true; // color tops of DOM nodes?
        const COLOR_RANDOM = false; // randomise color?
        const COLOR_HUE = 190; // hue in HSL (https://hslpicker.com)
        const MAX_ROTATION = 180; // set to 360 to rotate all the way round
        const THICKNESS = 20; // thickness of layers
        const DISTANCE = 10000; // ¯\\_(ツ)_/¯

        function getRandomColor() {
          const hue = Math.floor(Math.random() * 360);
          const saturation = 50 + Math.floor(Math.random() * 30);
          const lightness = 40 + Math.floor(Math.random() * 30);
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        }

        const getDOMDepth = (element) =>
          [...element.children].reduce(
            (max, child) => Math.max(max, getDOMDepth(child)),
            0
          ) + 1;
        const domDepthCache = getDOMDepth(document.body);
        const getColorByDepth = (depth, hue = 0, lighten = 0) =>
          `hsl(${hue}, 75%, ${
            Math.min(10 + depth * (1 + 60 / domDepthCache), 90) + lighten
          }%)`;

        // Apply initial styles to the body to enable 3D perspective
        const body = document.body;
        body.style.overflow = "visible";
        body.style.transformStyle = "preserve-3d";
        body.style.perspective = DISTANCE;
        const perspectiveOriginX = window.innerWidth / 2;
        const perspectiveOriginY = window.innerHeight / 2;
        body.style.perspectiveOrigin =
          body.style.transformOrigin = `${perspectiveOriginX}px ${perspectiveOriginY}px`;
        traverseDOM(body, 0, 0, 0);

        function moveEvent(event) {
          const rotationY =
            MAX_ROTATION * (1 - event.clientY / window.innerHeight) -
            MAX_ROTATION / 2;
          const rotationX =
            (MAX_ROTATION * event.clientX) / window.innerWidth -
            MAX_ROTATION / 2;
          body.style.transform = `rotateX(${rotationY}deg) rotateY(${rotationX}deg)`;
        }

        document.addEventListener("touchmove", moveEvent);
        document.addEventListener("mousemove", moveEvent);

        // Create side faces for an element to give it a 3D appearance
        function createSideFaces(element, color) {
          if (!SHOW_SIDES) {
            return;
          }
          const width = element.offsetWidth;
          const height = element.offsetHeight;
          const fragment = document.createDocumentFragment();

          // Helper function to create and style a face
          const createFace = ({
            width,
            height,
            transform,
            transformOrigin,
            top,
            left,
            right,
            bottom,
          }) => {
            const face = document.createElement("div");
            face.className = "dom-3d-side-face";
            Object.assign(face.style, {
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
              position: "absolute",
              width: `${width}px`,
              height: `${height}px`,
              background: color,
              transform,
              transformOrigin,
              overflow: "hidden",
              willChange: "transform",
              top,
              left,
              right,
              bottom,
            });
            fragment.appendChild(face);
          };

          // Top face
          createFace({
            width,
            height: THICKNESS,
            transform: `rotateX(-270deg) translateY(${-THICKNESS}px)`,
            transformOrigin: "top",
            top: "0px",
            left: "0px",
          });

          // Right face
          createFace({
            width: THICKNESS,
            height,
            transform: "rotateY(90deg)",
            transformOrigin: "left",
            top: "0px",
            left: `${width}px`,
          });

          // Bottom face
          createFace({
            width,
            height: THICKNESS,
            transform: `rotateX(-90deg) translateY(${THICKNESS}px)`,
            transformOrigin: "bottom",
            bottom: "0px",
            left: "0px",
          });

          // Left face
          createFace({
            width: THICKNESS,
            height,
            transform: `translateX(${-THICKNESS}px) rotateY(-90deg)`,
            transformOrigin: "right",
            top: "0px",
            left: "0px",
          });

          element.appendChild(fragment);
        }

        // Recursive function to traverse child nodes, apply 3D styles, and create side faces
        function traverseDOM(parentNode, depthLevel, offsetX, offsetY) {
          for (
            let children = parentNode.childNodes,
              childrenCount = children.length,
              i = 0;
            i < childrenCount;
            i++
          ) {
            const childNode = children[i];
            if (
              !(
                1 === childNode.nodeType &&
                !childNode.classList.contains("dom-3d-side-face")
              )
            )
              continue;
            const color = COLOR_RANDOM
              ? getRandomColor()
              : getColorByDepth(depthLevel, COLOR_HUE, -5);
            Object.assign(childNode.style, {
              transform: `translateZ(${THICKNESS}px)`,
              overflow: "visible",
              backfaceVisibility: "hidden",
              transformStyle: "preserve-3d",
              backgroundColor: COLOR_SURFACE
                ? color
                : getComputedStyle(childNode).backgroundColor,
              willChange: "transform",
            });

            let updatedOffsetX = offsetX;
            let updatedOffsetY = offsetY;
            if (childNode.offsetParent === parentNode) {
              updatedOffsetX += parentNode.offsetLeft;
              updatedOffsetY += parentNode.offsetTop;
            }
            createSideFaces(childNode, color);
            traverseDOM(
              childNode,
              depthLevel + 1,
              updatedOffsetX,
              updatedOffsetY
            );
          }
        }
      })();
    } catch (error) {
      console.error(error);
      alert("message" in error ? error.message : error);
    }
  }
}

// Must use var to ensure it's hoisted.
window.ExtensionPreprocessingJS = new Action();
