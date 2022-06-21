import { debounce } from "ts-debounce";
import CodeMirror, {TextMarker} from "codemirror";

export class CMBlockMarkerHelper {
    /**
     * Constructor
     * @param editor Codemirror editor
     * @param blockRegexp Target content block regexp without the begin-token and end-token
     * @param blockStartTokenRegexp The regexp for the begin-token of the target block.
     * @param blockEndTokenRegex The regexp for the end-token of the target block.
     *                           It only works when the begin-token is matched
     * @param renderer Custom renderer function
     * @param MARKER_CLASS_NAME Target marker class name
     * @param clearOnClick Whether we clear the marker with the rendered content when it is clicked by the mouse
     */
    constructor(private readonly editor: CodeMirror.Editor,
                private readonly blockRegexp: RegExp,
                private readonly blockStartTokenRegexp: RegExp,
                private readonly blockEndTokenRegex: RegExp,
                private readonly renderer: (beginMatch, endMatch, content) => HTMLElement,
                private readonly MARKER_CLASS_NAME: string,
                private readonly clearOnClick: boolean
    ) {
        this.init();
    }

    /**
     * Init everything at the beginning
     * @private
     */
    private init() {
        this.process();
        const debounceProcess = debounce(this.process.bind(this), 100);
        this.editor.on('cursorActivity', debounceProcess);
        this.editor.on('viewportChange', debounceProcess);
    }

    /**
     * Process current view port to render the target block in the editor with the given marker class name
     * @private
     */
    private process() {
        // First, find all math elements
        // We'll only render the viewport
        const viewport = this.editor.getViewport()
        let blockRangeList = [];
        let meetBeginToken = false;
        let prevBeginTokenLineNumber = -1;
        let beginMatch = null;
        for (let i = viewport.from; i < viewport.to; i++) {
            const line = this.editor.getLine(i);

            console.log(line, this.blockStartTokenRegexp, this.blockStartTokenRegexp.test(line));
            // if we find the start token, then we will try to find the end token
            if (!meetBeginToken && this.blockStartTokenRegexp.test(line)) {
                beginMatch = line.match(this.blockStartTokenRegexp);
                meetBeginToken = true;
                prevBeginTokenLineNumber = i;
                continue;
            }

            // only find the end token when we met start token before
            //   if found, we save the block line area to blockRangeList
            if (meetBeginToken && this.blockEndTokenRegex.test(line)) {
                blockRangeList.push({
                    from: prevBeginTokenLineNumber,
                    to: i,
                    beginMatch: beginMatch,
                    endMatch: line.match(this.blockEndTokenRegex)
                });
                meetBeginToken = false;
                prevBeginTokenLineNumber = -1;
            }
        }

        // we need to check the left lines if we meet the begin token without end token in current view port
        if (meetBeginToken) {
            for (let i = viewport.to; i < this.editor.lineCount(); ++i) {
                const line = this.editor.getLine(i);
                if (this.blockEndTokenRegex.test(line)) {
                    blockRangeList.push({
                        from: prevBeginTokenLineNumber,
                        to: i,
                        beginMatch: beginMatch,
                        endMatch: line.match(this.blockEndTokenRegex)
                    });
                    break;
                }
            }
        }

        // nothing to do here. Just return
        if (blockRangeList.length === 0) {
            return;
        }

        // improve performance by updating dom only once even with multiple operations
        this.editor.operation(() => {
            this._markRanges(blockRangeList);
        });
    }

    private _markRanges(blockRangeList) {
        for (const blockRange of blockRangeList) {
            let markExisted = false;
            this.editor.findMarksAt({line: blockRange.from, ch: 0}).find((marker) => {
                if (marker.className === this.MARKER_CLASS_NAME) {
                    markExisted = true;
                }
            });

            // if processed, then we ignore it
            if (markExisted) {
                continue;
            }

            const from = {line: blockRange.from, ch: 0};
            const to = {line: blockRange.to, ch: this.editor.getLine(blockRange.to).length + 1};

            const cursor = this.editor.getCursor();
            const doc = this.editor.getDoc();
            const blockContentLines = [];
            for (let i = from.line + 1; i <= to.line - 1; ++i) {
                blockContentLines.push(this.editor.getLine(i));
            }

            // not fold when the cursor is in the block
            if (!(cursor.line >= from.line && cursor.line <= to.line)) {
                const wrapper = document.createElement('div');
                const element = this.renderer(blockRange.beginMatch, blockRange.endMatch, blockContentLines.join('\n'));
                wrapper.appendChild(element);
                const textMarker = doc.markText(
                    from,
                    to,
                    {
                        replacedWith: wrapper,
                        handleMouseEvents: true,
                        className: this.MARKER_CLASS_NAME, // class name is not renderer in DOM
                        inclusiveLeft: false,
                        inclusiveRight: false
                    },
                );

                wrapper.style.cssText = 'border: 2px solid transparent; padding: 2px; width: 100%; border-radius: 4px;';
                if (this.clearOnClick) {
                    wrapper.onclick = (e) => {
                        clickAndClear(textMarker, this.editor)(e);
                    };
                    wrapper.onmouseover = (e) => {
                        wrapper.style.border = '2px solid #19a2f0';
                    };
                    wrapper.onmouseleave = (e) => {
                        wrapper.style.border = '2px solid transparent';
                    };
                } else {
                    const editButton = document.createElement('button');
                    editButton.textContent = '/';
                    editButton.hidden = true;
                    editButton.style.cssText = 'position: absolute; top: 8px; right: 8px; width: 20px; height: 20px;';
                    editButton.onclick = () => {
                        textMarker.clear();
                        doc.setCursor({line: from.line + 1, ch: 0});
                    }
                    wrapper.appendChild(editButton);
                    wrapper.onmouseover = (e) => {
                        editButton.hidden = false;
                        wrapper.style.border = '2px solid #19a2f0';
                    };
                    wrapper.onmouseleave = (e) => {
                        editButton.hidden = true;
                        wrapper.style.border = '2px solid transparent';
                    };
                }
            }
        }
    }
}

/**
 * Returns a callback that performs a "click and clear" operation on a rendered
 * textmarker, i.e. remove the marker and place the cursor precisely where the
 * user clicked
 *
 * @param   {TextMarker}  marker  The text marker
 * @param   {CodeMirror}  cm      The CodeMirror instance
 *
 * @return  {Function}            The callback
 */
export default function clickAndClear (
    marker: TextMarker,
    cm: CodeMirror.Editor
): (e: MouseEvent) => void {
    return (e: MouseEvent) => {
        marker.clear()
        cm.setCursor(cm.coordsChar({ left: e.clientX, top: e.clientY }))
        cm.focus()
    }
}
