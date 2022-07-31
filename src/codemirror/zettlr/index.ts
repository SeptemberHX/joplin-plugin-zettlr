import CodeMirror from "codemirror";
import {markdownRenderTasks} from "./render-tasks";
import {foldCodeHelper} from "./foldcode-helper";
import {markdownRenderTables} from "./render-tables";
import {CMBlockMarkerHelper} from "../../utils/CMBlockMarkerHelper";
import katex from 'katex'
import {debounce} from "ts-debounce";
import CMInlineMarkerHelper from "../../utils/CMInlineMarkerHelper";

module.exports = {
    default: function(_context) {
        return {
            plugin: function (CodeMirror) {
                CodeMirror.defineOption("zettlrPlugins", [], async function(cm, val, old) {
                    const debounceRender = debounce(() => {renderElements(cm)}, 400);

                    cm.on('cursorActivity', debounceRender)
                    cm.on('viewportChange', debounceRender)
                    cm.on('optionChange', debounceRender)

                    // Block Katex Math Render
                    new CMBlockMarkerHelper(cm, null, /^\s*\$\$/, /^\s*\$\$/, (beginMatch, endMatch, content) => {
                        let testDiv = document.createElement('span');
                        console.log(content);
                        katex.render(content, testDiv, { throwOnError: false, displayMode: true, output: 'html' })
                        return testDiv;
                    }, 'zettlr-block-math-marker', true, );

                    new CMInlineMarkerHelper(cm, [/(?<!\$)\$([^\$]+)\$/g], (match, regIndex: number, from, to, innerDomEleCopy, lastMatchFrom, lastMatchTo) => {
                        const markEl = document.createElement('span');
                        katex.render(match[1], markEl, { throwOnError: false, displayMode: false, output: 'html' })
                        return markEl;
                    }, 'zettlr-inline-math-marker', null);
                });
            },
            codeMirrorOptions: {
                'zettlrPlugins': true,
            },
            codeMirrorResources: [
            ],
            assets: function() {
                return [
                    {
                        name: 'zettlr.css'
                    },
                    {
                        name: 'katex.min.css'
                    }
                ];
            }
        }
    },
}

function renderElements (cm: CodeMirror.Editor): void {
    markdownRenderTasks(cm);
    markdownRenderTables(cm);
}
